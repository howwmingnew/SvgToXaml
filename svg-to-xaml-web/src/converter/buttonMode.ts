import type { GeometryResult } from '../types';
import { validateName, withFillRule } from './xamlFormatter';
import { generateResourceKey, collectBrush, emitBrushResource } from './geometryMode';

/**
 * Generate Button-mode XAML output.
 *
 * Style x:Key="Button_<baseName>" TargetType="Button"，含：
 * - Background Setter (#01000000)，避免透明區域不觸發 IsMouseOver
 * - Border 用 TemplateBinding Background
 * - 每個 Path 加 x:Name 以利 Trigger 套用
 * - ControlTemplate.Triggers 提供 IsMouseOver / IsPressed
 *   （目前兩者套用相同顏色，後續可調）
 */
export function generateButtonXaml(result: GeometryResult, filename: string): string {
  const { entries, width, height } = result;
  if (!entries || entries.length === 0) return '';

  const baseName = validateName(filename.replace(/\.svg$/i, ''));
  const styleKey = 'Button_' + baseName;
  const lines: string[] = [];
  const geoKeys: string[] = [];
  const pathNames: string[] = [];
  const brushMap = new Map<string, string>();
  const usedGeoKeys = new Set<string>();

  lines.push(`<!--${baseName} Start-->`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const keyName = generateResourceKey(baseName, i, entry);
    let geoKey = keyName + '_Geo';

    if (usedGeoKeys.has(geoKey)) {
      let counter = 2;
      while (usedGeoKeys.has(geoKey + counter)) counter++;
      geoKey = geoKey + counter;
    }
    usedGeoKeys.add(geoKey);

    if (entry.geometryType === 'EllipseGeometry') {
      const center = entry.geometryAttrs['Center'] || '0,0';
      const rx = entry.geometryAttrs['RadiusX'] || '1';
      const ry = entry.geometryAttrs['RadiusY'] || '1';
      lines.push(`<EllipseGeometry x:Key="${geoKey}" Center="${center}" RadiusX="${rx}" RadiusY="${ry}" />`);
    } else if (entry.geometryType === 'RectangleGeometry') {
      const rect = entry.geometryAttrs['Rect'] || '0,0,1,1';
      lines.push(`<RectangleGeometry x:Key="${geoKey}" Rect="${rect}" />`);
    } else if (entry.data) {
      lines.push(`<Geometry x:Key="${geoKey}">${withFillRule(entry.data, entry.fillRule)}</Geometry>`);
    }

    geoKeys.push(geoKey);
    pathNames.push(`path${i + 1}_${baseName}`);

    collectBrush(entry.stroke, keyName, brushMap);
    collectBrush(entry.fill, keyName, brushMap);
  }

  // Brush resources
  for (const [color, brushKey] of brushMap) {
    emitBrushResource(lines, color, brushKey, result.gradients);
  }

  // 取「第一個有顏色」的 brush key 當 Trigger 顏色 placeholder
  // （使用者要求：先用相同顏色，之後可手動換）
  const firstBrushKey = brushMap.size > 0 ? brushMap.values().next().value : null;
  const triggerBrushRef = firstBrushKey
    ? `{StaticResource ${firstBrushKey}}`
    : '#FF000000';

  // Style
  const w = width === Math.floor(width) ? Math.floor(width).toString() : width.toString();
  const h = height === Math.floor(height) ? Math.floor(height).toString() : height.toString();
  const p = '                            '; // 28 spaces

  lines.push(`<Style x:Key="${styleKey}" TargetType="Button">`);
  lines.push('    <Setter Property="Background" Value="#01000000" />');
  lines.push('    <Setter Property="Template">');
  lines.push('        <Setter.Value>');
  lines.push('            <ControlTemplate TargetType="Button">');
  lines.push('                <Border Background="{TemplateBinding Background}">');
  lines.push('                    <Viewbox Stretch="Uniform">');
  lines.push(`                        <Grid Width="${w}" Height="${h}">`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const geoKey = geoKeys[i];
    const pathName = pathNames[i];
    const attrs: string[] = [];

    attrs.push(`x:Name="${pathName}"`);
    attrs.push(`Data="{StaticResource ${geoKey}}"`);

    if (entry.fill) attrs.push(`Fill="{StaticResource ${brushMap.get(entry.fill)!}}"`);
    if (entry.stroke) attrs.push(`Stroke="{StaticResource ${brushMap.get(entry.stroke)!}}"`);
    if (entry.strokeEndLineCap) attrs.push(`StrokeEndLineCap="${entry.strokeEndLineCap}"`);
    if (entry.strokeLineJoin) attrs.push(`StrokeLineJoin="${entry.strokeLineJoin}"`);
    if (entry.strokeMiterLimit) attrs.push(`StrokeMiterLimit="${entry.strokeMiterLimit}"`);
    if (entry.strokeStartLineCap) attrs.push(`StrokeStartLineCap="${entry.strokeStartLineCap}"`);
    if (entry.strokeThickness) attrs.push(`StrokeThickness="${entry.strokeThickness}"`);

    lines.push(p + '<Path');
    for (let j = 0; j < attrs.length; j++) {
      const end = j === attrs.length - 1 ? ' />' : '';
      lines.push(p + '    ' + attrs[j] + end);
    }
  }

  lines.push('                        </Grid>');
  lines.push('                    </Viewbox>');
  lines.push('                </Border>');
  lines.push('');
  lines.push('                <ControlTemplate.Triggers>');
  lines.push('                    <Trigger Property="IsMouseOver" Value="True">');
  for (let i = 0; i < entries.length; i++) {
    const pathName = pathNames[i];
    const propName = entries[i].stroke ? 'Stroke' : 'Fill';
    lines.push(`                        <Setter TargetName="${pathName}" Property="${propName}" Value="${triggerBrushRef}" />`);
  }
  lines.push('                    </Trigger>');
  lines.push('                    <Trigger Property="IsPressed" Value="True">');
  for (let i = 0; i < entries.length; i++) {
    const pathName = pathNames[i];
    const propName = entries[i].stroke ? 'Stroke' : 'Fill';
    lines.push(`                        <Setter TargetName="${pathName}" Property="${propName}" Value="${triggerBrushRef}" />`);
  }
  lines.push('                    </Trigger>');
  lines.push('                </ControlTemplate.Triggers>');
  lines.push('            </ControlTemplate>');
  lines.push('        </Setter.Value>');
  lines.push('    </Setter>');
  lines.push('</Style>');

  return lines.join('\n');
}
