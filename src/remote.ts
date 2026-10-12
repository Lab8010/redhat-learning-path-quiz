import { API_BASE } from './config';
import { EXPS, NEED_KEYS, PRODS, ROLES, ROLE_ALIAS, STYLES, TIMINGS, type Domain, type Response } from './model';

/** API が返す1行(1回答。すべて文字列) */
export interface RawRow { ts: string; role: string; needs: string; exp: string | number; prods: string; timing: string; style: string; top: string }

const split = (s: string) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

/** 不正な行は捨てて、集計用の回答に変換する */
export function parseRows(raw: RawRow[]): Response[] {
  const out: Response[] = [];
  raw.forEach((r, i) => {
    const role = ROLE_ALIAS[r.role] || r.role;
    const needs = split(r.needs);
    const prods = split(r.prods);
    const exp = Number(r.exp);
    const ts = Date.parse(r.ts);
    if (!(role in ROLES) || !(exp in EXPS) || !(r.timing in TIMINGS) || !(r.style in STYLES) || Number.isNaN(ts)) return;
    if (!needs.length || needs.some((n) => !NEED_KEYS.includes(n as Domain))) return;
    if (!prods.length || prods.some((p) => !(p in PRODS))) return;
    out.push({ id: 'g' + i, ts, role, needs: needs as Domain[], exp, prods, timing: r.timing, style: r.style, top: split(r.top), trial: false, forms: false, synced: true });
  });
  return out;
}

export type FetchResult = { ok: true; rows: Response[] } | { ok: false; error: 'unauthorized' | 'network' | 'format' };

/** 合言葉つきで全回答を取得する。合言葉は URL に載せず POST 本文で送る */
export async function fetchRows(url: string, token: string, fetcher: typeof fetch = fetch): Promise<FetchResult> {
  try {
    const res = await fetcher(url, { method: 'POST', body: new URLSearchParams({ token }), credentials: 'omit', referrerPolicy: 'no-referrer' });
    const j = await res.json();
    if (j && j.ok === true && Array.isArray(j.rows)) return { ok: true, rows: parseRows(j.rows) };
    if (j && j.error === 'unauthorized') return { ok: false, error: 'unauthorized' };
    return { ok: false, error: 'format' };
  } catch {
    return { ok: false, error: 'network' };
  }
}
