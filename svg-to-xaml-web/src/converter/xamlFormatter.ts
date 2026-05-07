export function formatXml(xml: string, indent: string = '  '): string {
  let formatted = '';
  let depth = 0;
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('</')) {
      depth--;
    }

    formatted += indent.repeat(Math.max(0, depth)) + trimmed + '\n';

    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.startsWith('<?') && !trimmed.startsWith('<!--')) {
      depth++;
    }
  }

  return formatted.trimEnd();
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function cleanGeometryString(geo: string): string {
  geo = geo.trim();
  // 注意：刻意不移除 F0/F1 前綴。WPF Path mini-language 預設 = EvenOdd，
  // 缺了前綴會讓 SVG nonzero 路徑在含重疊 sub-path 時被異或成破洞。
  // SVG d 屬性本身雖不會帶 F 前綴，但保留 regex 一致性以防未來來源混入。
  // Remove degenerate single-point moves
  geo = geo.replace(/M[\d.\-]+,[\d.\-]+z\s*/gi, '');
  return geo.trim();
}

/**
 * 把 path data 加上對應的 FillRule 前綴後輸出。
 * - Nonzero → "F1 ..."
 * - EvenOdd → "F0 ..."
 * - null    → 原字串（呼叫端應確認該幾何不需要 FillRule，例如 EllipseGeometry / RectangleGeometry）
 *
 * 若 data 已經帶 F 前綴（例如外部來源），會先剝掉再依 fillRule 重貼，避免重複。
 */
export function withFillRule(data: string, fillRule: 'Nonzero' | 'EvenOdd' | null): string {
  const stripped = data.replace(/^F[01]\s+/, '');
  if (fillRule === 'Nonzero') return 'F1 ' + stripped;
  if (fillRule === 'EvenOdd') return 'F0 ' + stripped;
  return stripped;
}

export function validateName(name: string): string {
  // Remove invalid XAML resource key characters
  let result = name.replace(/[^a-zA-Z0-9_]/g, '_');
  // Ensure starts with letter or underscore
  if (result && /^[0-9]/.test(result)) {
    result = '_' + result;
  }
  return result || '_unnamed';
}
