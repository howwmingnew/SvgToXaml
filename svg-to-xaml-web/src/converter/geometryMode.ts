import type { GeometryEntry, GeometryResult } from '../types';
import { validateName, withFillRule } from './xamlFormatter';

/**
 * Generate resource key name with automatic color and shape hints.
 * Port of C# GenerateResourceKey (ConverterLogic.cs:571-619)
 */
export function generateResourceKey(baseName: string, index: number, entry: GeometryEntry): string {
  const color = (entry.stroke || entry.fill || '').toLowerCase();
  let colorHint = '';
  const colorMap: Record<string, string[]> = {
    Red: ['#ff0000', '#ffff0000', 'red'],
    Green: ['#00ff00', '#ff00ff00', '#00d400', '#ff00d400', 'green'],
    Blue: ['#198cff', '#ff198cff', '#0000ff', '#ff0000ff', 'blue'],
    Yellow: ['#ffff00', '#ffffff00', 'yellow'],
    White: ['#ffffff', '#ffffffff', 'white'],
    Black: ['#000000', '#ff000000', 'black'],
  };

  for (const [hint, patterns] of Object.entries(colorMap)) {
    if (patterns.some(p => p.toLowerCase() === color)) {
      colorHint = '_' + hint;
      break;
    }
  }

  let geoHint = '';
  if (entry.geometryType === 'EllipseGeometry') {
    geoHint = '_Circle';
  } else if (entry.data) {
    const points = entry.data.match(/([\d.]+),([\d.]+)/g);
    if (points && points.length === 2) {
      const [p1, p2] = points.map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      if (Math.abs(p1.x - p2.x) < 0.1) geoHint = '_VLine';
      else if (Math.abs(p1.y - p2.y) < 0.1) geoHint = '_HLine';
      else geoHint = '_Line';
    }
  }

  if (colorHint || geoHint) return baseName + colorHint + geoHint;
  return baseName + '_Part' + (index + 1);
}

/**
 * Collect brush colors, avoiding duplicate keys.
 */
export function collectBrush(color: string | null, keyName: string, brushMap: Map<string, string>): void {
  if (!color || brushMap.has(color)) return;
  let brushName = keyName + '_Brush';
  const existingValues = new Set(brushMap.values());
  if (existingValues.has(brushName)) {
    let counter = 2;
    while (existingValues.has(brushName + counter)) counter++;
    brushName = brushName + counter;
  }
  brushMap.set(color, brushName);
}

/**
 * Generate Geometry-mode XAML output.
 * Port of C# ConvertedSvgData.GeometryData (ConvertedSvgData.cs:63-186)
 */
export function generateGeometryXaml(result: GeometryResult, filename: string): string {
  const { entries, width, height } = result;
  if (!entries || entries.length === 0) return '';

  const baseName = validateName(filename.replace(/\.svg$/i, ''));
  const lines: string[] = [];
  const geoKeys: string[] = [];
  const brushMap = new Map<string, string>();
  const usedGeoKeys = new Set<string>();

  lines.push(`<!--${baseName} Start-->`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const keyName = generateResourceKey(baseName, i, entry);
    let geoKey = keyName + '_Geo';

    // Avoid duplicate keys
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

    collectBrush(entry.stroke, keyName, brushMap);
    collectBrush(entry.fill, keyName, brushMap);
  }

  // Brush resources
  for (const [color, brushKey] of brushMap) {
    lines.push(`<SolidColorBrush x:Key="${brushKey}" Color="${color}" />`);
  }

  // Style
  const w = width === Math.floor(width) ? Math.floor(width).toString() : width.toString();
  const h = height === Math.floor(height) ? Math.floor(height).toString() : height.toString();
  const p = '                            '; // 28 spaces

  lines.push(`<Style x:Key="${baseName}" TargetType="ContentControl">`);
  lines.push('    <Setter Property="Template">');
  lines.push('        <Setter.Value>');
  lines.push('            <ControlTemplate TargetType="ContentControl">');
  lines.push('                <Border>');
  lines.push('                    <Viewbox Stretch="Uniform">');
  lines.push(`                        <Grid Width="${w}" Height="${h}">`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const geoKey = geoKeys[i];
    const attrs: string[] = [];

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
  lines.push('            </ControlTemplate>');
  lines.push('        </Setter.Value>');
  lines.push('    </Setter>');
  lines.push('</Style>');

  return lines.join('\n');
}
