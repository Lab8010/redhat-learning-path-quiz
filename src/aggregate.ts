import { NEED_KEYS, ROLES, ROLE_ALIAS, TIMINGS, STYLES, PRODS, type Response } from './model';

const zero = (keys: (string | number)[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;

export function agg(list: Response[], now = new Date()) {
  const g = {
    n: list.length,
    need: zero(NEED_KEYS), first: zero(NEED_KEYS), role: zero(Object.keys(ROLES)), exp: zero([1, 2, 3, 4]),
    timing: zero(Object.keys(TIMINGS)), style: zero(Object.keys(STYLES)), prods: zero(Object.keys(PRODS)),
    cross: {} as Record<string, Record<string, number>>, top1: {} as Record<string, number>,
    trial: 0, forms: 0, today: 0,
  };
  Object.keys(ROLES).forEach((r) => (g.cross[r] = zero(NEED_KEYS)));
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  list.forEach((r0) => {
    const r = { ...r0, role: ROLE_ALIAS[r0.role] || r0.role };
    r.needs.forEach((n, i) => { g.need[n]++; if (i === 0) g.first[n]++; g.cross[r.role][n]++; });
    g.role[r.role]++; g.exp[r.exp]++; g.timing[r.timing]++; g.style[r.style]++;
    r.prods.forEach((p) => g.prods[p]++);
    if (r.top[0]) g.top1[r.top[0]] = (g.top1[r.top[0]] || 0) + 1;
    if (r.trial) g.trial++;
    if (r.forms) g.forms++;
    if (r.ts >= d0.getTime()) g.today++;
  });
  return g;
}

/** 匿名の回答だけを出力する。個人を特定する列は持たない */
export function csvOf(list: Response[]): string {
  const q = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['id', 'timestamp', 'role', 'need1', 'need2', 'experience', 'products', 'timing', 'style', 'top1', 'top2', 'top3', 'top4', 'top5', 'trial_link', 'forms_opened'];
  const rows = list.map((r) => [r.id, new Date(r.ts).toISOString(), r.role, r.needs[0] || '', r.needs[1] || '', r.exp, r.prods.join('|'), r.timing, r.style, ...[0, 1, 2, 3, 4].map((i) => r.top[i] || ''), r.trial ? 1 : 0, r.forms ? 1 : 0]);
  return [head, ...rows].map((x) => x.map(q).join(',')).join('\n');
}
