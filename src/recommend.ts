import { CERTS, NEEDS, PRODS, type Cert, type CompleteAnswers } from './model';

export interface Reason { t: string; hit: 0 | 1 }
export interface Rec { c: Cert; reasons: Reason[] }

/**
 * 診断ロジック(ルールベース)。画面に依存しない純粋関数。
 * 領域一致(1位=4点,2位=3点) + レベル適合 + 利用製品 + 役割補正
 */
export function recommend(a: CompleteAnswers, certs: Cert[] = CERTS): Rec[] {
  const W = [4, 3];
  const rows = certs.map((c) => {
    let dom = 0;
    const hit: string[] = [];
    a.needs.forEach((n, j) => {
      c.d.forEach((d, i) => {
        if (d === n) {
          dom += W[j] * (i === 0 ? 1 : 0.7);
          if (!hit.includes(n)) hit.push(n);
        }
      });
    });
    const gap = c.lv - a.exp;
    const lvFit = 2 - 1.3 * Math.abs(gap);
    const prodHit = c.p.filter((p) => a.prods.includes(p));
    const prod = prodHit.length ? 1.2 : 0;
    let role = 0;
    if (c.dev) role += a.role === 'dev' ? 1.5 : -1.5;
    if (a.role === 'sre' && c.d.includes('auto')) role += 0.6;
    if ((a.role === 'mgr' || a.role === 'other') && c.lv <= 2) role += 1;
    if (c.legacy) role -= 1.5;
    const score = dom + lvFit + prod + role + (dom > 0 ? 10 : 0);
    return { c, score, hit, gap, prodHit, dom };
  });
  rows.sort((x, y) => y.score - x.score || Math.abs(x.gap) - Math.abs(y.gap) || x.c.exam.localeCompare(y.c.exam));
  // 上位5件を選んだあと、入門レベルから順に並べ替える(同レベルはスコア順を維持)
  return rows
    .slice(0, 5)
    .sort((x, y) => x.c.lv - y.c.lv)
    .map((r) => {
      const reasons: Reason[] = [];
      r.hit.forEach((n) => reasons.push({ t: '領域: ' + NEEDS[n as keyof typeof NEEDS].l, hit: 1 }));
      if (r.gap === 0) reasons.push({ t: 'いまのレベルに一致', hit: 1 });
      else if (r.gap === 1) reasons.push({ t: '次のステップ', hit: 0 });
      else if (r.gap < 0) reasons.push({ t: '基礎の確認に', hit: 0 });
      r.prodHit.forEach((p) => reasons.push({ t: '利用中: ' + PRODS[p], hit: 0 }));
      if (!r.dom) reasons.push({ t: '周辺スキルとして', hit: 0 });
      return { c: r.c, reasons: reasons.slice(0, 4) };
    });
}
