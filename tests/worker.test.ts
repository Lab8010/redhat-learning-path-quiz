import { describe, expect, it } from 'vitest';
import { handle, type D1Like, type Env } from '../worker/src/index';
import { validateIncoming } from '../src/validate';

/** 使う SQL だけを再現した、メモリ上の D1 */
function fakeDb() {
  const rows: Record<string, unknown>[] = [];
  const db: D1Like = {
    prepare(sql: string) {
      return {
        bind(...a: unknown[]) {
          return {
            async run() {
              if (sql.startsWith('INSERT OR IGNORE')) {
                const [id, ts, role, needs, exp, prods, timing, style, top, created] = a;
                if (!rows.some((r) => r.id === id)) rows.push({ id, ts, role, needs, exp, prods, timing, style, top, created });
              }
            },
            async all<T>() { return { results: rows.slice().sort((x, y) => Number(x.ts) - Number(y.ts)) as T[] }; },
            async first<T>() { return { n: rows.filter((r) => Number(r.created) > Number(a[0])).length } as T; },
          };
        },
      };
    },
  };
  return { db, rows };
}

const good = { id: 'r1abc234', ts: Date.UTC(2026, 9, 29, 1, 0), role: 'planner', needs: ['cn', 'virt'], exp: 2, prods: ['rhel'], timing: 't6', style: 'ilt', top: ['EX180', 'EX280'] };
const ORIGIN = 'https://lab8010.github.io';
const post = (path: string, body: unknown, origin: string | null = ORIGIN, json = true) =>
  new Request('https://api.example' + path, {
    method: 'POST',
    headers: { ...(origin ? { origin } : {}), 'content-type': json ? 'application/json' : 'application/x-www-form-urlencoded' },
    body: json ? JSON.stringify(body) : new URLSearchParams(body as Record<string, string>).toString(),
  });
const env = (db: D1Like, extra: Partial<Env> = {}): Env => ({ DB: db, STAFF_TOKEN: 'a-long-secret-token', ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173`, MAX_PER_MIN: '3', ...extra });

describe('validateIncoming', () => {
  it('許可された値だけ通す', () => {
    expect(validateIncoming(good)).not.toBeNull();
    for (const bad of [{ ...good, role: 'x' }, { ...good, needs: [] }, { ...good, needs: ['cn', 'cn'] }, { ...good, exp: 9 }, { ...good, top: ['EX999'] }, { ...good, id: 'A B' }, { ...good, ts: 1 }, { ...good, name: 'x', role: 5 }])
      expect(validateIncoming(bad)).toBeNull();
  });
  it('余計な項目(氏名・メールなど)は取り込まない', () => {
    const r = validateIncoming({ ...good, email: 'a@b.c', name: 'x', ip: '1.2.3.4' })!;
    expect(Object.keys(r).sort()).toEqual(['exp', 'id', 'needs', 'prods', 'role', 'style', 'timing', 'top', 'ts']);
  });
});

describe('Worker API', () => {
  it('回答を保存し、同じ id の再送は重複しない', async () => {
    const { db, rows } = fakeDb();
    expect((await handle(post('/api/responses', good), env(db))).status).toBe(200);
    expect((await handle(post('/api/responses', good), env(db))).status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['created', 'exp', 'id', 'needs', 'prods', 'role', 'style', 'timing', 'top', 'ts']);
  });
  it('不正な値は 400、許可していない公開元は 403', async () => {
    const { db, rows } = fakeDb();
    expect((await handle(post('/api/responses', { ...good, role: 'x' }), env(db))).status).toBe(400);
    expect((await handle(post('/api/responses', good, 'https://evil.example'), env(db))).status).toBe(403);
    expect(rows).toHaveLength(0);
  });
  it('CORS: 許可した公開元にだけ応答ヘッダを付ける', async () => {
    const { db } = fakeDb();
    const ok = await handle(post('/api/responses', good), env(db));
    expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    const pre = await handle(new Request('https://api.example/api/responses', { method: 'OPTIONS', headers: { origin: ORIGIN } }), env(db));
    expect(pre.status).toBe(204);
  });
  it('1分あたりの上限を超えると 429', async () => {
    const { db } = fakeDb();
    const now = Date.now();
    for (let i = 0; i < 3; i++) expect((await handle(post('/api/responses', { ...good, id: 'id000' + i + 'xyz' }), env(db), now)).status).toBe(200);
    expect((await handle(post('/api/responses', { ...good, id: 'id9999xyz' }), env(db), now)).status).toBe(429);
    expect((await handle(post('/api/responses', { ...good, id: 'id8888xyz' }), env(db), now + 61_000)).status).toBe(200);
  });
  it('全回答の取得には合言葉が必要。違う・未設定なら 401', async () => {
    const { db } = fakeDb();
    await handle(post('/api/responses', good), env(db));
    expect((await handle(post('/api/rows', { token: 'wrong' }, ORIGIN, false), env(db))).status).toBe(401);
    expect((await handle(post('/api/rows', {}, ORIGIN, false), env(db))).status).toBe(401);
    expect((await handle(post('/api/rows', { token: '' }, ORIGIN, false), env(db, { STAFF_TOKEN: undefined }))).status).toBe(401);
    const res = await handle(post('/api/rows', { token: 'a-long-secret-token' }, ORIGIN, false), env(db));
    const j = await res.json() as { ok: boolean; rows: Record<string, string>[] };
    expect(j.ok).toBe(true);
    expect(j.rows[0]).toEqual({ ts: '2026-10-29T01:00:00.000Z', role: 'planner', needs: 'cn,virt', exp: '2', prods: 'rhel', timing: 't6', style: 'ilt', top: 'EX180,EX280' });
  });
});
