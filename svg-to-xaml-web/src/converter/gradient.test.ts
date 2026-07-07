import { describe, it, expect } from 'vitest';
import { convertSvgToXaml } from './index';

/**
 * 帶 linearGradient 的 icon（例：Figma 匯出的 ico_boneGraft）。
 * 舊 bug：fill="url(#id)" 被當一般顏色，geometry/button 產出無效
 * <SolidColorBrush Color="url(#id)">，WPF 載入丟 XamlParseException → 該 path 畫不出來。
 */
const LINEAR_GRADIENT_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4,4 H20 V20 H4 Z" fill="#A3A3A3"/>
<path d="M8,8 H16 V16 H8 Z" fill="url(#paint0_linear)"/>
<defs>
<linearGradient id="paint0_linear" x1="9.5" y1="9" x2="9.5" y2="19" gradientUnits="userSpaceOnUse">
<stop stop-color="#DE5E60"/>
<stop offset="0.5" stop-color="#F59394"/>
<stop offset="1" stop-color="#8C2F30"/>
</linearGradient>
</defs>
</svg>`;

const OBJECT_BBOX_GRADIENT_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="10" height="10" fill="url(#g)"/>
<defs>
<linearGradient id="g"><stop stop-color="#000"/><stop offset="1" stop-color="#FFF"/></linearGradient>
</defs>
</svg>`;

const STOP_OPACITY_SVG = `<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="10" height="10" fill="url(#g)"/>
<defs>
<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="10" y2="0">
<stop stop-color="#FF0000" stop-opacity="0.5"/><stop offset="1" stop-color="#00FF00"/>
</linearGradient>
</defs>
</svg>`;

describe('漸層轉換 — url(#id) 不再輸出無效 XAML', () => {
  it('三種模式都不含 url(#...)，且產出 LinearGradientBrush', () => {
    const r = convertSvgToXaml(LINEAR_GRADIENT_SVG, 'icon.svg');

    for (const xaml of [r.geometry, r.drawingImage, r.button]) {
      expect(xaml).not.toContain('url(#');
      expect(xaml).not.toMatch(/SolidColorBrush[^>]*Color="url/);
      expect(xaml).toContain('LinearGradientBrush');
    }
  });

  it('userSpaceOnUse → MappingMode="Absolute" 且座標照抄', () => {
    const r = convertSvgToXaml(LINEAR_GRADIENT_SVG, 'icon.svg');
    expect(r.geometry).toContain('MappingMode="Absolute"');
    expect(r.geometry).toContain('StartPoint="9.5,9"');
    expect(r.geometry).toContain('EndPoint="9.5,19"');
  });

  it('三個 stop 都正確輸出（含 offset）', () => {
    const r = convertSvgToXaml(LINEAR_GRADIENT_SVG, 'icon.svg');
    expect(r.geometry).toContain('<GradientStop Color="#FFDE5E60" Offset="0" />');
    expect(r.geometry).toContain('<GradientStop Color="#FFF59394" Offset="0.5" />');
    expect(r.geometry).toContain('<GradientStop Color="#FF8C2F30" Offset="1" />');
  });

  it('objectBoundingBox（預設）→ 不加 MappingMode（WPF 預設 RelativeToBoundingBox）', () => {
    const r = convertSvgToXaml(OBJECT_BBOX_GRADIENT_SVG, 'icon.svg');
    expect(r.geometry).toContain('LinearGradientBrush');
    expect(r.geometry).not.toContain('MappingMode');
    // 預設 x1,y1,x2,y2 = 0,0,1,0
    expect(r.geometry).toContain('StartPoint="0,0"');
    expect(r.geometry).toContain('EndPoint="1,0"');
  });

  it('stop-opacity 折進 GradientStop 的 alpha', () => {
    const r = convertSvgToXaml(STOP_OPACITY_SVG, 'icon.svg');
    // 0.5 * 255 ≈ 128 = 0x80
    expect(r.geometry).toContain('Color="#80FF0000"');
    expect(r.geometry).toContain('Color="#FF00FF00"');
  });

  it('DrawingImage 用 <GeometryDrawing.Brush> 包 LinearGradientBrush，非 Brush 屬性', () => {
    const r = convertSvgToXaml(LINEAR_GRADIENT_SVG, 'icon.svg');
    expect(r.drawingImage).toContain('<GeometryDrawing.Brush>');
    expect(r.drawingImage).not.toMatch(/Brush="url/);
  });
});
