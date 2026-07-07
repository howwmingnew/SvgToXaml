import type { GeometryResult } from '../types';
import { validateName, withFillRule } from './xamlFormatter';
import { isGradientRef, gradientRefId, gradientBrushLines } from './gradients';

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
    const children: string[] = [];
    const fillIsGradient = !!entry.fill && isGradientRef(entry.fill);

    // Solid fill → Brush attribute（漸層改用 child element，見下方）
    if (entry.fill && !fillIsGradient) {
      attrs.push(`Brush="${entry.fill}"`);
    }

    // Geometry
    if (entry.geometryType === 'EllipseGeometry') {
      const center = entry.geometryAttrs['Center'] || '0,0';
      const rx = entry.geometryAttrs['RadiusX'] || '1';
      const ry = entry.geometryAttrs['RadiusY'] || '1';
      children.push('        <GeometryDrawing.Geometry>');
      children.push(`          <EllipseGeometry Center="${center}" RadiusX="${rx}" RadiusY="${ry}" />`);
      children.push('        </GeometryDrawing.Geometry>');
    } else if (entry.geometryType === 'RectangleGeometry') {
      const rect = entry.geometryAttrs['Rect'] || '0,0,1,1';
      children.push('        <GeometryDrawing.Geometry>');
      children.push(`          <RectangleGeometry Rect="${rect}" />`);
      children.push('        </GeometryDrawing.Geometry>');
    } else if (entry.data) {
      attrs.push(`Geometry="${withFillRule(entry.data, entry.fillRule)}"`);
    } else {
      continue;
    }

    // Gradient fill → <GeometryDrawing.Brush>
    if (fillIsGradient) {
      const info = result.gradients?.get(gradientRefId(entry.fill!)!);
      if (info) {
        children.push('        <GeometryDrawing.Brush>');
        children.push(...gradientBrushLines(info, '', '          '));
        children.push('        </GeometryDrawing.Brush>');
      }
      // 找不到定義（例如 pattern）→ 不加 Brush，該形狀不上色而非丟出無效 XAML
    }

    // Stroke → Pen
    if (entry.stroke) {
      appendPen(children, entry, result.gradients);
    }

    if (children.length === 0) {
      lines.push(`      <GeometryDrawing ${attrs.join(' ')} />`);
    } else {
      lines.push(`      <GeometryDrawing ${attrs.join(' ')}>`);
      lines.push(...children);
      lines.push('      </GeometryDrawing>');
    }
  }

  lines.push('    </DrawingGroup>');
  lines.push('  </DrawingImage.Drawing>');
  lines.push('</DrawingImage>');

  return lines.join('\n');
}

interface PenEntry {
  stroke: string | null;
  strokeThickness: string | null;
  strokeStartLineCap: string | null;
  strokeEndLineCap: string | null;
  strokeLineJoin: string | null;
  strokeMiterLimit: string | null;
}

function appendPen(lines: string[], entry: PenEntry, gradients: GeometryResult['gradients']): void {
  if (!entry.stroke) return;

  const strokeIsGradient = isGradientRef(entry.stroke);
  const penAttrs: string[] = [];
  if (!strokeIsGradient) penAttrs.push(`Brush="${entry.stroke}"`);
  if (entry.strokeThickness) penAttrs.push(`Thickness="${entry.strokeThickness}"`);
  if (entry.strokeStartLineCap) penAttrs.push(`StartLineCap="${entry.strokeStartLineCap}"`);
  if (entry.strokeEndLineCap) penAttrs.push(`EndLineCap="${entry.strokeEndLineCap}"`);
  if (entry.strokeLineJoin) penAttrs.push(`LineJoin="${entry.strokeLineJoin}"`);
  if (entry.strokeMiterLimit) penAttrs.push(`MiterLimit="${entry.strokeMiterLimit}"`);

  const gradInfo = strokeIsGradient ? gradients?.get(gradientRefId(entry.stroke)!) : undefined;

  lines.push('        <GeometryDrawing.Pen>');
  if (gradInfo) {
    lines.push(`          <Pen ${penAttrs.join(' ')}>`);
    lines.push('            <Pen.Brush>');
    lines.push(...gradientBrushLines(gradInfo, '', '              '));
    lines.push('            </Pen.Brush>');
    lines.push('          </Pen>');
  } else {
    lines.push(`          <Pen ${penAttrs.join(' ')} />`);
  }
  lines.push('        </GeometryDrawing.Pen>');
}
