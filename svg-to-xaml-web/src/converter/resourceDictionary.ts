import type { SvgFileEntry } from '../types';

/**
 * Generate a ResourceDictionary XAML containing all selected files.
 */
export function generateResourceDictionary(files: SvgFileEntry[], mode: 'geometry' | 'drawingImage' | 'button'): string {
  const lines: string[] = [];
  lines.push('<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"');
  lines.push('                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">');
  lines.push('');

  for (const file of files) {
    const xaml = mode === 'geometry'
      ? file.xamlGeometry
      : mode === 'drawingImage'
        ? file.xamlDrawingImage
        : file.xamlButton;
    if (xaml) {
      lines.push('  ' + xaml.split('\n').join('\n  '));
      lines.push('');
    }
  }

  lines.push('</ResourceDictionary>');
  return lines.join('\n');
}
