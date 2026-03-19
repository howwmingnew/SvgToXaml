import type { SvgFileEntry } from '../types';
import { validateName } from './xamlFormatter';

/**
 * Generate UserControl XAML with embedded ResourceDictionary and visual preview.
 * Port of C# SvgDirToUserControlXaml (ConverterLogic.cs:123-166)
 */
export function generateUserControlXaml(files: SvgFileEntry[]): string {
  const imagesPerRow = 20;
  const imageSize = 40;
  const margin = 3;
  const wrapWidth = imagesPerRow * (imageSize + margin * 2);

  const lines: string[] = [];
  lines.push('<UserControl xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"');
  lines.push('             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">');
  lines.push('  <UserControl.Resources>');
  lines.push('    <ResourceDictionary>');

  // Embed all DrawingImage resources
  for (const file of files) {
    if (file.xamlDrawingImage) {
      lines.push('      ' + file.xamlDrawingImage.split('\n').join('\n      '));
    }
  }

  lines.push('    </ResourceDictionary>');
  lines.push('  </UserControl.Resources>');
  lines.push(`  <ScrollViewer HorizontalScrollBarVisibility="Auto" VerticalScrollBarVisibility="Auto">`);
  lines.push(`    <WrapPanel Width="${wrapWidth}">`);

  for (const file of files) {
    if (file.xamlDrawingImage) {
      const baseName = validateName(file.name);
      const key = baseName + '_DrawingImage';
      const tooltip = baseName;
      lines.push(`      <Image Width="${imageSize}" Height="${imageSize}" Margin="${margin}" Source="{StaticResource ${key}}" ToolTip="${tooltip}" />`);
    }
  }

  lines.push('    </WrapPanel>');
  lines.push('  </ScrollViewer>');
  lines.push('</UserControl>');

  return lines.join('\n');
}
