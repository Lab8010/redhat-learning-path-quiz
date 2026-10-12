import { describe, expect, it } from 'vitest';
import { SERVICE_BY_STYLE, STYLE_SERVICE_LABEL } from '../src/services';
import { STYLES } from '../src/model';

describe('学び方に応じたサービス紹介', () => {
  it('すべての学び方にサービスと遷移先がある', () => {
    for (const k of Object.keys(STYLES)) {
      const g = SERVICE_BY_STYLE[k as keyof typeof STYLES];
      expect(g.services.length).toBeGreaterThan(0);
      expect(STYLE_SERVICE_LABEL[k as keyof typeof STYLES]).toBeTruthy();
      for (const s of [...g.services, { url: g.main[1] }]) expect(s.url).toMatch(/^https:\/\/www\.redhat\.com\//);
    }
  });
  it('指定どおりの出し分け', () => {
    const names = (k: keyof typeof STYLES) => SERVICE_BY_STYLE[k].services.map((s) => s.name);
    expect(names('ilt')).toEqual(['RHLS Premium', 'RHLS Course']);
    expect(names('sub')).toEqual(['RHLS Standard']);
    expect(names('team')).toEqual(['一社向け研修', 'Bootcamp']);
  });
});
