import DOMMatrix from '@thednp/dommatrix';

// jsdom 不提供 DOMMatrix，用 polyfill 撐起 transform 處理路徑。
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error - polyfill 與 lib.dom 的型別細節有差異，但 elements.ts 用到的 e/f/multiply 都相容
  globalThis.DOMMatrix = DOMMatrix;
}
