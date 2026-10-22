import { FORM, FORM_URL_MAX } from './config';
import { EXPS, NEEDS, ROLES, STYLES, TIMINGS } from './model';
import type { Response } from './model';

/** 事前入力に使う診断結果。個人を特定する値・回答IDは含めない */
export type FormInput = Pick<Response, 'role' | 'needs' | 'exp' | 'timing' | 'style' | 'top'>;

/** 個人情報用フォームへの事前入力リンク。診断結果の欄だけを付け、上限(既定700文字)を超えたら profile → top5 の順に外す */
export function buildFormUrl(r: FormInput, max = FORM_URL_MAX): string {
  const e = FORM.entries;
  const values: [string, string][] = [
    [e.needs, r.needs.map((n) => NEEDS[n]?.l ?? '').filter(Boolean).join('、')],
    [e.first, r.top[0] ?? ''],
    [e.timing, TIMINGS[r.timing] ?? ''],
    [e.style, STYLES[r.style] ?? ''],
    [e.top5, r.top.join(', ')],
    [e.profile, [ROLES[r.role], EXPS[r.exp]].filter(Boolean).join(' / ')],
  ];
  const build = (n: number) => {
    const p = new URLSearchParams({ usp: 'pp_url' });
    for (const [k, v] of values.slice(0, n)) if (v) p.set(k, v);
    return `${FORM.base}?${p}`;
  };
  // 6 → 5(profile を外す)→ 4(top5 も外す)。必須の4欄は外さない
  for (let n = values.length; n > 4; n--) {
    const u = build(n);
    if (u.length <= max) return u;
  }
  return build(4);
}
