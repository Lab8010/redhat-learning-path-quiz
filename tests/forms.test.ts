import { describe, expect, it } from 'vitest';
import { anonPayload, personalFormUrl, toJstIso } from '../src/forms';
import { ANON_FORM } from '../src/config';
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
  it('個人情報用Formの事前入力は資格コード・領域・学び方だけ', () => {
    const u = new URL(personalFormUrl(r));
    const vals = [...u.searchParams.entries()].filter(([k]) => k.startsWith('entry.')).map(([, v]) => v);
    expect(vals).toEqual(['EX180', 'cn,auto', 'ilt']);
    expect(u.href).not.toContain('rX');
  });
});
