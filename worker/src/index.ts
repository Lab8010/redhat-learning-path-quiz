import { validateIncoming } from '../../src/validate';

/** D1 のうち、使う部分だけの型(@cloudflare/workers-types に依存しない) */
export interface D1Like {
  prepare(sql: string): { bind(...a: unknown[]): { run(): Promise<{ meta?: { changes?: number } }>; all<T = unknown>(): Promise<{ results: T[] }>; first<T = unknown>(): Promise<T | null> } };
}
export interface Env { DB: D1Like; STAFF_TOKEN?: string; ALLOWED_ORIGINS?: string; MAX_PER_MIN?: string }

const MAX_ROWS = 5000;
const MAX_BODY = 8192;
const MAX_DELETE_IDS = 90; // D1 は1回の問い合わせで束縛できる値が100個まで

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors } });

/** 合言葉を、長さや一致位置で処理時間が変わらないように比較する */
function safeEqual(a: string, b: string): boolean {
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try {
    if ((req.headers.get('content-type') || '').includes('application/json')) return JSON.parse(text);
    return Object.fromEntries(new URLSearchParams(text));
  } catch { return null; }
}

export async function handle(req: Request, env: Env, now = Date.now()): Promise<Response> {
  const origin = req.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const cors: Record<string, string> = origin && allowed.includes(origin)
    ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' }
    : {};
  // ブラウザからの要求は、許可した公開元だけ受け付ける(curl など Origin のない要求は、合言葉・検証で守る)
  if (origin && !cors['access-control-allow-origin']) return json({ ok: false, error: 'forbidden' }, 403, {});

  const path = new URL(req.url).pathname;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (path === '/api/health' && req.method === 'GET') return json({ ok: true }, 200, cors);
  if (req.method !== 'POST') return json({ ok: false, error: 'not_found' }, 404, cors);

  if (path === '/api/responses') {
    const r = validateIncoming(await readBody(req));
    if (!r) return json({ ok: false, error: 'invalid' }, 400, cors);
    const limit = Number(env.MAX_PER_MIN) || 120;
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM responses WHERE created > ?').bind(now - 60_000).first<{ n: number }>();
    if ((recent?.n ?? 0) >= limit) return json({ ok: false, error: 'rate_limited' }, 429, cors);
    await env.DB.prepare('INSERT OR IGNORE INTO responses (id, ts, role, needs, exp, prods, timing, style, top, created) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(r.id, r.ts, r.role, r.needs.join(','), r.exp, r.prods.join(','), r.timing, r.style, r.top.join(','), now).run();
    return json({ ok: true }, 200, cors);
  }

  if (path === '/api/rows') {
    const body = await readBody(req);
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!env.STAFF_TOKEN || !safeEqual(token, env.STAFF_TOKEN)) return json({ ok: false, error: 'unauthorized' }, 401, cors);
    const { results } = await env.DB.prepare('SELECT id, ts, role, needs, exp, prods, timing, style, top FROM responses ORDER BY ts LIMIT ?').bind(MAX_ROWS).all<Record<string, string | number>>();
    const rows = results.map((x) => ({ id: x.id, ts: new Date(Number(x.ts)).toISOString(), role: x.role, needs: x.needs, exp: String(x.exp), prods: x.prods, timing: x.timing, style: x.style, top: x.top }));
    return json({ ok: true, rows }, 200, cors);
  }

  if (path === '/api/delete') {
    const body = await readBody(req);
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!env.STAFF_TOKEN || !safeEqual(token, env.STAFF_TOKEN)) return json({ ok: false, error: 'unauthorized' }, 401, cors);
    let res: { meta?: { changes?: number } } | null = null;
    if (body?.mode === 'all') {
      res = await env.DB.prepare('DELETE FROM responses').bind().run();
    } else if (body?.mode === 'since' && typeof body.since === 'number' && Number.isFinite(body.since)) {
      res = await env.DB.prepare('DELETE FROM responses WHERE ts >= ?').bind(body.since).run();
    } else if (body?.mode === 'ids' && Array.isArray(body.ids) && body.ids.length >= 1 && body.ids.length <= MAX_DELETE_IDS && body.ids.every((i) => typeof i === 'string' && /^[a-z0-9]{1,32}$/.test(i))) {
      res = await env.DB.prepare(`DELETE FROM responses WHERE id IN (${body.ids.map(() => '?').join(',')})`).bind(...body.ids).run();
    }
    if (!res) return json({ ok: false, error: 'invalid' }, 400, cors);
    return json({ ok: true, deleted: res.meta?.changes ?? 0 }, 200, cors);
  }

  return json({ ok: false, error: 'not_found' }, 404, cors);
}

export default { fetch: (req: Request, env: Env) => handle(req, env) };
