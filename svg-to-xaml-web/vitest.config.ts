import { defineConfig } from 'vitest/config';

// jsdom 沒實作 DOMMatrix，用 setupFiles 補上 polyfill。
// elements.ts 的 transform 處理需要 DOMMatrix 才能跑。
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
