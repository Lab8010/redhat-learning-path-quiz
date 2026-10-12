import { describe, expect, it } from 'vitest';
import { recommend } from '../src/recommend';
import { CERTS, type CompleteAnswers } from '../src/model';

const base: CompleteAnswers = { role: 'infra', needs: ['cn'], exp: 2, prods: [], timing: 't6', style: 'ilt' };
const exams = (a: Partial<CompleteAnswers>) => recommend({ ...base, ...a }).map((r) => r.c.exam);

describe('recommend', () => {
  it('領域 cn・レベル2', () => {
    expect(exams({})).toEqual(['EX180', 'EX188', 'EX280', 'EX370', 'EX380']);
  });
  it('領域 virt+auto・レベル3・OpenShift 利用', () => {
    expect(exams({ needs: ['virt', 'auto'], exp: 3, prods: ['ocp'] })).toEqual(['EX156', 'EX336', 'EX316', 'EX380', 'EX374']);
  });
  it('領域 cn・レベル1・開発者', () => {
    expect(exams({ role: 'dev', exp: 1 })).toEqual(['EX180', 'EX188', 'EX288', 'EX328', 'EX378']);
  });
  it('常に5件で、レベルが昇順になる', () => {
    const roles = ['infra', 'sre', 'dev', 'mgr', 'other'];
    const needs: CompleteAnswers['needs'][] = [['cn'], ['linux'], ['virt', 'auto'], ['ai'], ['sec', 'linux'], ['auto', 'ai']];
    for (const role of roles) for (const n of needs) for (const exp of [1, 2, 3, 4]) {
      const recs = recommend({ ...base, role, needs: n, exp });
      expect(recs).toHaveLength(5);
      const lv = recs.map((r) => r.c.lv);
      expect(lv).toEqual([...lv].sort((a, b) => a - b));
    }
  });
  it('資格データは全て現役(試験コードが重複しない)', () => {
    const codes = CERTS.map((c) => c.exam);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
