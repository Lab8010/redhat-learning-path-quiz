import { describe, expect, it } from 'vitest';
import { deleteRows, fetchRows, parseRows, type RawRow } from '../src/remote';
import { agg } from '../src/aggregate';

const row = (o: Partial<RawRow> = {}): RawRow => ({ ts: '2026-10-12T13:41:13+09:00', role: 'infra', needs: 'cn,virt', exp: '1', prods: 'rhel,ocp', timing: 'tbd', style: 'sub', top: 'EX180,EX188', ...o });
const json = (b: unknown) => (async () => new Response(JSON.stringify(b))) as unknown as typeof fetch;

describe('remote', () => {
  it('スプレッドシートの行を回答に変換し、不正な行(テスト入力)は捨てる', () => {
    const rows = parseRows([row(), row({ role: 'a', needs: 'b', exp: 'c', prods: 'd', timing: 'e', style: 'f', top: 'g', ts: 'h' }), row({ needs: 'xx' })]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: 'infra', needs: ['cn', 'virt'], exp: 1, top: ['EX180', 'EX188'] });
  });
  it('旧コード mgr は planner として集計される', () => {
    const g = agg(parseRows([row({ role: 'mgr' }), row({ role: 'planner' })]));
    expect(g.role.planner).toBe(2);
  });
  it('合言葉が違うと unauthorized、通信できないと network', async () => {
    expect(await fetchRows('x', 't', json({ ok: false, error: 'unauthorized' }))).toEqual({ ok: false, error: 'unauthorized' });
    expect(await fetchRows('x', 't', (async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toEqual({ ok: false, error: 'network' });
  });
  it('合言葉は URL ではなく POST 本文で送る', async () => {
    let seen: { url?: unknown; init?: RequestInit } = {};
    const f = (async (url: unknown, init?: RequestInit) => { seen = { url, init }; return new Response(JSON.stringify({ ok: true, rows: [row()] })); }) as unknown as typeof fetch;
    const r = await fetchRows('https://script.example/exec', 'secret', f);
    expect(r.ok && r.rows).toHaveLength(1);
    expect(String(seen.url)).not.toContain('secret');
    expect(String(seen.init?.body)).toBe('token=secret');
  });
  it('削除要求: 合言葉と対象を POST の JSON で送り、件数を受け取る', async () => {
    let seen: RequestInit | undefined;
    const f = (async (_u: unknown, init?: RequestInit) => { seen = init; return new Response(JSON.stringify({ ok: true, deleted: 2 })); }) as unknown as typeof fetch;
    expect(await deleteRows('https://x/api/delete', 'tok', { mode: 'ids', ids: ['a1', 'b2'] }, f)).toEqual({ ok: true, deleted: 2 });
    expect(JSON.parse(String(seen?.body))).toEqual({ token: 'tok', mode: 'ids', ids: ['a1', 'b2'] });
    expect(await deleteRows('x', 't', { mode: 'all' }, json({ ok: false, error: 'unauthorized' }))).toEqual({ ok: false, error: 'unauthorized' });
  });
  it('行の id を引き継ぐ。おすすめされた回数を集計する', () => {
    const rows = parseRows([{ ...row(), id: 'abc123' }, { ...row(), id: 'def456', top: 'EX180,EX280' }]);
    expect(rows.map((r) => r.id)).toEqual(['abc123', 'def456']);
    expect(agg(rows).rec).toEqual({ EX180: 2, EX188: 1, EX280: 1 });
  });
});
