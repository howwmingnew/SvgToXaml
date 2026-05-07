import { describe, it, expect } from 'vitest';
import { convertSvgToXaml } from './index';
import { withFillRule, cleanGeometryString } from './xamlFormatter';

/**
 * Figma 匯出的 stroke-to-fill icon：
 *   - 單一 path，多個重疊 sub-path（箭頭由兩個矩形組成）
 *   - SVG 沒寫 fill-rule → 預設 nonzero
 *   - 若輸出 XAML 缺 F1 前綴，WPF 會 fallback 成 EvenOdd 把重疊處異或成洞
 */
const OVERLAPPING_NONZERO_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.333 7.45958C12.3869 7.87028 12.7634 8.15958 13.1741 8.10575C13.5848 8.05191 13.8741 7.67533 13.8203 7.26463L13.0767 7.36211L12.333 7.45958ZM13.0763 13.1101H13.8263V9.91685H13.0763H12.3263V13.1101H13.0763ZM13.0763 9.91685V9.16685H9.88309V9.91685V10.6669H13.0763V9.91685Z" fill="#A3A3A3"/>
</svg>`;

const EVENODD_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
<path d="M0,0 L10,0 L10,10 L0,10 Z M2,2 L8,2 L8,8 L2,8 Z" fill="#000" fill-rule="evenodd"/>
</svg>`;

describe('withFillRule', () => {
  it('Nonzero → F1 前綴', () => {
    expect(withFillRule('M0,0 L1,1', 'Nonzero')).toBe('F1 M0,0 L1,1');
  });

  it('EvenOdd → F0 前綴', () => {
    expect(withFillRule('M0,0 L1,1', 'EvenOdd')).toBe('F0 M0,0 L1,1');
  });

  it('null → 不加前綴', () => {
    expect(withFillRule('M0,0 L1,1', null)).toBe('M0,0 L1,1');
  });

  it('已帶前綴時會剝掉再依 rule 重貼，不會疊加', () => {
    expect(withFillRule('F0 M0,0', 'Nonzero')).toBe('F1 M0,0');
    expect(withFillRule('F1 M0,0', 'EvenOdd')).toBe('F0 M0,0');
  });
});

describe('cleanGeometryString', () => {
  it('保留 F0/F1 前綴（不再吃掉）', () => {
    expect(cleanGeometryString('F1 M0,0 L1,1')).toBe('F1 M0,0 L1,1');
    expect(cleanGeometryString('F0 M0,0 L1,1')).toBe('F0 M0,0 L1,1');
  });

  it('仍會移除單點退化 figure', () => {
    expect(cleanGeometryString('M16,16z M0,0z M5,5 L6,6')).toBe('M5,5 L6,6');
  });
});

describe('convertSvgToXaml — FillRule 迴歸', () => {
  it('SVG 預設 nonzero → 三種模式輸出都帶 F1 前綴（避免重疊 sub-path 渲染破洞）', () => {
    const r = convertSvgToXaml(OVERLAPPING_NONZERO_SVG, 'icon.svg');

    expect(r.geometry).toContain('F1 ');
    expect(r.drawingImage).toContain('F1 ');
    expect(r.button).toContain('F1 ');
  });

  it('SVG 明示 fill-rule="evenodd" → 輸出帶 F0 前綴', () => {
    const r = convertSvgToXaml(EVENODD_SVG, 'icon.svg');

    expect(r.geometry).toContain('F0 ');
    expect(r.drawingImage).toContain('F0 ');
    expect(r.button).toContain('F0 ');
  });
});
