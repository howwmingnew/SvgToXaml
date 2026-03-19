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
  // Remove FillRule prefix (F0 or F1)
  geo = geo.replace(/^F[01]\s+/, '');
  // Remove degenerate single-point moves
  geo = geo.replace(/M[\d.\-]+,[\d.\-]+z\s*/gi, '');
  return geo.trim();
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
