import { describe, expect, it } from 'vitest';
import { anonPayload, toJstIso } from '../src/forms';
import { buildFormUrl } from '../src/formUrl';
import { ANON_FORM, FORM } from '../src/config';
import type { Response } from '../src/model';

const r: Response = { id: 'rX', ts: Date.UTC(2026, 9, 12, 4, 31, 43), role: 'infra', needs: ['cn', 'auto'], exp: 2, prods: ['ocp'], timing: 't6', style: 'ilt', top: ['EX180', 'EX280'], trial: false, forms: false };

describe('forms', () => {
  it('日時は日本時間の ISO 8601', () => {
    expect(toJstIso(r.ts)).toBe('2026-10-12T13:31:43+09:00');
  });
  it('匿名Formへの送信に回答IDを含めない', () => {
    const p = anonPayload(r);
    expect(p.get(ANON_FORM.entries.top)).toBe('EX180,EX280');
    expect([...p.values()]).not.toContain('rX');
    expect([...p.keys()].sort()).toEqual(Object.values(ANON_FORM.entries).sort());
  });
});

describe('buildFormUrl', () => {
  const input = { role: 'infra', needs: ['cn', 'virt'] as Response['needs'], exp: 2, timing: 't6', style: 'sub', top: ['EX180', 'EX188', 'EX280', 'EX370', 'EX380'] };
  const get = (u: string) => new URL(u).searchParams;
  const E = FORM.entries;

  it('診断結果の6欄が正しい entry と値で入る', () => {
    const p = get(buildFormUrl(input));
    expect(p.get(E.needs)).toBe('クラウドネイティブ、仮想化の移行');
    expect(p.get(E.first)).toBe('EX180');
    expect(p.get(E.timing)).toBe('半年以内');
    expect(p.get(E.style)).toBe('オンライン学び放題');
    expect(p.get(E.top5)).toBe('EX180, EX188, EX280, EX370, EX380');
    expect(p.get(E.profile)).toBe('インフラ・運用 / 基本操作ができる');
  });
  it('個人情報の entry と回答IDを含まない。usp=pp_url が付く', () => {
    const u = buildFormUrl(input);
    for (const k of ['652671378', '40012731', '193282777', '229151924', '1402808116', '2137999077']) expect(u).not.toContain(k);
    expect([...get(u).keys()].sort()).toEqual(['usp', ...Object.values(E)].sort());
    expect(get(u).get('usp')).toBe('pp_url');
  });
  it('日本語がエンコードされ、デコードで元に戻る', () => {
    const u = buildFormUrl(input);
    expect(u).not.toContain('クラウド');
    expect(decodeURIComponent(u.replace(/\+/g, ' '))).toContain('クラウドネイティブ、仮想化の移行');
  });
  it('通常の入力は700文字以内で、profile も含めて全欄が残る', () => {
    const u = buildFormUrl(input);
    expect(u.length).toBeLessThanOrEqual(700);
    for (const k of Object.values(E)) expect(get(u).has(k)).toBe(true);
  });
  it('長すぎるときは profile → top5 の順に外し、必須4欄は残す', () => {
    const long = { ...input, top: Array.from({ length: 5 }, (_, i) => 'EX' + 'X'.repeat(80) + i) };
    const u = buildFormUrl(long);
    const p = get(u);
    expect(u.length).toBeLessThanOrEqual(700);
    expect(p.has(E.profile)).toBe(false);
    for (const k of [E.needs, E.first, E.timing, E.style]) expect(p.has(k)).toBe(true);
  });
  it('領域が1つ、学び方が未選択でも壊れず、空の欄は付けない', () => {
    const p = get(buildFormUrl({ ...input, needs: ['ai'], style: '' }));
    expect(p.get(E.needs)).toBe('AI');
    expect(p.has(E.style)).toBe(false);
  });
});
