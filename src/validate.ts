import { CERTS, EXPS, NEED_KEYS, PRODS, ROLES, STYLES, TIMINGS, type Domain } from './model';

/** サーバへ送る匿名回答。個人を特定する項目は持たない(id は重複防止用の乱数) */
export interface Incoming {
  id: string; ts: number; role: string; needs: Domain[]; exp: number; prods: string[]; timing: string; style: string; top: string[];
}

const isArr = (v: unknown, min: number, max: number): v is unknown[] => Array.isArray(v) && v.length >= min && v.length <= max;
const uniq = (a: unknown[]) => new Set(a).size === a.length;
const EXAMS = new Set(CERTS.map((c) => c.exam));

/** 許可された値だけを通す。1つでも外れていれば null(保存しない) */
export function validateIncoming(b: unknown): Incoming | null {
  if (!b || typeof b !== 'object') return null;
  const o = b as Record<string, unknown>;
  if (typeof o.id !== 'string' || !/^[a-z0-9]{6,32}$/.test(o.id)) return null;
  if (typeof o.ts !== 'number' || !Number.isFinite(o.ts) || o.ts < Date.UTC(2026, 0, 1) || o.ts > Date.UTC(2028, 0, 1)) return null;
  if (typeof o.role !== 'string' || !(o.role in ROLES)) return null;
  if (!isArr(o.needs, 1, 2) || !uniq(o.needs) || !o.needs.every((n) => NEED_KEYS.includes(n as Domain))) return null;
  if (typeof o.exp !== 'number' || !(o.exp in EXPS)) return null;
  if (!isArr(o.prods, 1, 6) || !uniq(o.prods) || !o.prods.every((p) => typeof p === 'string' && p in PRODS)) return null;
  if (typeof o.timing !== 'string' || !(o.timing in TIMINGS)) return null;
  if (typeof o.style !== 'string' || !(o.style in STYLES)) return null;
  if (!isArr(o.top, 1, 5) || !uniq(o.top) || !o.top.every((t) => typeof t === 'string' && EXAMS.has(t))) return null;
  return { id: o.id, ts: o.ts, role: o.role, needs: o.needs as Domain[], exp: o.exp, prods: o.prods as string[], timing: o.timing, style: o.style, top: o.top as string[] };
}
