import { PRODS, type Response } from './model';
import { recommend } from './recommend';

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** リハーサル・デモ表示用の疑似データ(固定シード)。保存・送信はしない */
export function sampleResponses(): Response[] {
  const rnd = mulberry(1029);
  const pickW = (obj: Record<string, number>) => {
    const ks = Object.keys(obj);
    let r = rnd() * ks.reduce((s, k) => s + obj[k], 0);
    for (const k of ks) { r -= obj[k]; if (r <= 0) return k; }
    return ks[0];
  };
  const out: Response[] = [];
  const base = Date.UTC(2026, 9, 29, 0, 30);
  const needW = { virt: 30, auto: 22, cn: 20, ai: 18, linux: 14, sec: 14 };
  for (let i = 0; i < 56; i++) {
    const role = pickW({ infra: 40, sre: 16, dev: 18, mgr: 16, other: 10 });
    const n1 = pickW(needW) as Response['needs'][number];
    const needs = [n1];
    if (rnd() < 0.7) { const n2 = pickW(needW) as typeof n1; if (n2 !== n1) needs.push(n2); }
    const exp = +pickW({ 1: 22, 2: 34, 3: 30, 4: 14 });
    const prods: string[] = [];
    Object.keys(PRODS).forEach((p) => { if (p !== 'none' && rnd() < 0.3) prods.push(p); });
    if (!prods.length) prods.push(rnd() < 0.5 ? 'none' : 'rhel');
    const timing = pickW({ t3: 20, t6: 34, t12: 26, tbd: 20 });
    const style = pickW({ ilt: 26, sub: 36, self: 20, team: 18 });
    const top = recommend({ role, needs, exp, prods, timing, style }).map((x) => x.c.exam);
    out.push({ id: 's' + i, ts: base + i * 8 * 60000, sample: true, role, needs, exp, prods, timing, style, top, trial: rnd() < (style === 'sub' ? 0.55 : 0.2), forms: rnd() < 0.2 });
  }
  return out;
}
