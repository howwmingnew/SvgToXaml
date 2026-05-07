import type { GeometryResult } from '../types';
import { validateName, withFillRule } from './xamlFormatter';

/**
 * Generate DrawingImage-mode XAML output.
 * Fallback format that preserves complete color/gradient information.
 */
export function generateDrawingImageXaml(result: GeometryResult, filename: string): string {
  const { entries, width, height } = result;
  if (!entries || entries.length === 0) return '';

  const baseName = validateName(filename.replace(/\.svg$/i, ''));
  const w = width === Math.floor(width) ? Math.floor(width).toString() : width.toString();
  const h = height === Math.floor(height) ? Math.floor(height).toString() : height.toString();

  const lines: string[] = [];
  lines.push(`<DrawingImage x:Key="${baseName}_DrawingImage">`);
  lines.push('  <DrawingImage.Drawing>');
  lines.push(`    <DrawingGroup ClipGeometry="M0,0 V${h} H${w} V0 H0 Z">`);

  for (const entry of entries) {
    const attrs: string[] = [];

    // Brush
    if (entry.fill) {
      attrs.push(`Brush="${entry.fill}"`);
    }

    // Geometry
    if (entry.geometryType === 'EllipseGeometry') {
      const center = entry.geometryAttrs['Center'] || '0,0';
      const rx = entry.geometryAttrs['RadiusX'] || '1';
      const ry = entry.geometryAttrs['RadiusY'] || '1';

      if (entry.stroke) {
        lines.push(`      <GeometryDrawing ${attrs.join(' ')}>`);
        lines.push(`        <GeometryDrawing.Geometry>`);
        lines.push(`          <EllipseGeometry Center="${center}" RadiusX="${rx}" RadiusY="${ry}" />`);
        lines.push(`        </GeometryDrawing.Geometry>`);
        appendPen(lines, entry);
        lines.push(`      </GeometryDrawing>`);
      } else {
        lines.push(`      <GeometryDrawing ${attrs.join(' ')}>`);
        lines.push(`        <GeometryDrawing.Geometry>`);
        lines.push(`          <EllipseGeometry Center="${center}" RadiusX="${rx}" RadiusY="${ry}" />`);
        lines.push(`        </GeometryDrawing.Geometry>`);
        lines.push(`      </GeometryDrawing>`);
      }
    } else if (entry.geometryType === 'RectangleGeometry') {
      const rect = entry.geometryAttrs['Rect'] || '0,0,1,1';

      lines.push(`      <GeometryDrawing ${attrs.join(' ')}>`);
      lines.push(`        <GeometryDrawing.Geometry>`);
      lines.push(`          <RectangleGeometry Rect="${rect}" />`);
      lines.push(`        </GeometryDrawing.Geometry>`);
      if (entry.stroke) appendPen(lines, entry);
      lines.push(`      </GeometryDrawing>`);
    } else if (entry.data) {
      const geoData = withFillRule(entry.data, entry.fillRule);
      if (entry.stroke) {
        attrs.push(`Geometry="${geoData}"`);
        lines.push(`      <GeometryDrawing ${attrs.join(' ')}>`);
        appendPen(lines, entry);
        lines.push(`      </GeometryDrawing>`);
      } else {
        attrs.push(`Geometry="${geoData}"`);
        lines.push(`      <GeometryDrawing ${attrs.join(' ')} />`);
      }
    }
  }

  lines.push('    </DrawingGroup>');
  lines.push('  </DrawingImage.Drawing>');
  lines.push('</DrawingImage>');

  return lines.join('\n');
}

function appendPen(lines: string[], entry: { stroke: string | null; strokeThickness: string | null; strokeStartLineCap: string | null; strokeEndLineCap: string | null; strokeLineJoin: string | null; strokeMiterLimit: string | null }): void {
  if (!entry.stroke) return;

  const penAttrs: string[] = [`Brush="${entry.stroke}"`];
  if (entry.strokeThickness) penAttrs.push(`Thickness="${entry.strokeThickness}"`);
  if (entry.strokeStartLineCap) penAttrs.push(`StartLineCap="${entry.strokeStartLineCap}"`);
  if (entry.strokeEndLineCap) penAttrs.push(`EndLineCap="${entry.strokeEndLineCap}"`);
  if (entry.strokeLineJoin) penAttrs.push(`LineJoin="${entry.strokeLineJoin}"`);
  if (entry.strokeMiterLimit) penAttrs.push(`MiterLimit="${entry.strokeMiterLimit}"`);

  lines.push(`        <GeometryDrawing.Pen>`);
  lines.push(`          <Pen ${penAttrs.join(' ')} />`);
  lines.push(`        </GeometryDrawing.Pen>`);
}
