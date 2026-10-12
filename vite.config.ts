import { defineConfig } from 'vitest/config';

// GitHub Pages のプロジェクトサイト(/<repo>/)でも動くよう、相対パスで配信する
export default defineConfig({
  base: './',
  test: { include: ['tests/**/*.test.ts'] },
});
