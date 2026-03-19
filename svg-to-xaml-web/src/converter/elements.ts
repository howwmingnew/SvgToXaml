import type { GeometryEntry } from '../types';
import { getEffectiveAttribute, getInheritedAttribute, parseColor } from './svgParser';
import { parseTransform, transformPathData, isIdentity } from './transforms';
import { cleanGeometryString } from './xamlFormatter';

/**
 * Convert an SVG element tree into a list of GeometryEntry objects.
 * Each entry represents one visual shape with its fill/stroke.
 */
export function extractEntries(svgElement: Element): GeometryEntry[] {
  const entries: GeometryEntry[] = [];
  processElement(svgElement, new DOMMatrix(), entries);
  return entries;
}

function processElement(el: Element, parentMatrix: DOMMatrix, entries: GeometryEntry[]): void {
  const transformAttr = el.getAttribute('transform');
  const localMatrix = transformAttr ? parseTransform(transformAttr) : new DOMMatrix();
  const currentMatrix = parentMatrix.multiply(localMatrix);

  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'svg':
    case 'g':
      processChildren(el, currentMatrix, entries);
      break;
    case 'path':
      processPath(el, currentMatrix, entries);
      break;
    case 'circle':
      processCircle(el, currentMatrix, entries);
      break;
    case 'ellipse':
      processEllipse(el, currentMatrix, entries);
      break;
    case 'rect':
      processRect(el, currentMatrix, entries);
      break;
    case 'line':
      processLine(el, currentMatrix, entries);
      break;
    case 'polygon':
      processPolygon(el, currentMatrix, entries);
      break;
    case 'polyline':
      processPolyline(el, currentMatrix, entries);
      break;
    case 'use':
      processUse(el, currentMatrix, entries);
      break;
    default:
      // Skip unknown elements but process children
      processChildren(el, currentMatrix, entries);
      break;
  }
}

function processChildren(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  for (const child of Array.from(el.children)) {
    processElement(child, matrix, entries);
  }
}

function createBaseEntry(el: Element): Partial<GeometryEntry> {
  const fill = parseColor(getInheritedAttribute(el, 'fill'));
  const stroke = parseColor(getInheritedAttribute(el, 'stroke'));
  const strokeWidth = getEffectiveAttribute(el, 'stroke-width') || getInheritedAttribute(el, 'stroke-width');
  const strokeLinecap = getEffectiveAttribute(el, 'stroke-linecap');
  const strokeLinejoin = getEffectiveAttribute(el, 'stroke-linejoin');
  const strokeMiterlimit = getEffectiveAttribute(el, 'stroke-miterlimit');

  // Default fill is black if neither fill nor stroke specified
  const effectiveFill = fill === undefined ? (stroke ? null : '#FF000000') : fill;
  const normalizedFill = effectiveFill ? normalizeToWpfColor(effectiveFill) : null;
  const normalizedStroke = stroke ? normalizeToWpfColor(stroke) : null;

  return {
    fill: normalizedFill,
    stroke: normalizedStroke,
    strokeThickness: stroke && strokeWidth ? strokeWidth : null,
    strokeStartLineCap: strokeLinecap ? capitalizeLineCap(strokeLinecap) : null,
    strokeEndLineCap: strokeLinecap ? capitalizeLineCap(strokeLinecap) : null,
    strokeLineJoin: strokeLinejoin ? capitalize(strokeLinejoin) : null,
    strokeMiterLimit: strokeMiterlimit || null,
    geometryAttrs: {},
  };
}

function normalizeToWpfColor(color: string): string {
  if (!color || color === 'none') return color;
  // Ensure #AARRGGBB format for WPF
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    if (hex.length === 6) return `#FF${hex}`;
    if (hex.length === 8) return `#${hex}`;
    if (hex.length === 3) {
      return `#FF${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
  }
  return color;
}

function capitalizeLineCap(cap: string): string {
  const map: Record<string, string> = { butt: 'Flat', round: 'Round', square: 'Square' };
  return map[cap.toLowerCase()] || capitalize(cap);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function processPath(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const d = el.getAttribute('d');
  if (!d) return;

  const base = createBaseEntry(el);

  // Skip if fill is none and no stroke
  if (base.fill === 'none' && !base.stroke) return;
  if (base.fill === 'none') base.fill = null;

  let pathData = cleanGeometryString(d);
  if (!isIdentity(matrix)) {
    pathData = transformPathData(pathData, matrix);
  }

  entries.push({
    data: pathData,
    geometryType: 'inline',
    geometryAttrs: {},
    fill: base.fill || null,
    stroke: base.stroke || null,
    strokeThickness: base.strokeThickness || null,
    strokeStartLineCap: base.strokeStartLineCap || null,
    strokeEndLineCap: base.strokeEndLineCap || null,
    strokeLineJoin: base.strokeLineJoin || null,
    strokeMiterLimit: base.strokeMiterLimit || null,
  });
}

function processCircle(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const cx = parseFloat(el.getAttribute('cx') || '0');
  const cy = parseFloat(el.getAttribute('cy') || '0');
  const r = parseFloat(el.getAttribute('r') || '0');
  if (r <= 0) return;

  const base = createBaseEntry(el);
  if (base.fill === 'none' && !base.stroke) return;
  if (base.fill === 'none') base.fill = null;

  if (isIdentity(matrix)) {
    entries.push({
      data: null,
      geometryType: 'EllipseGeometry',
      geometryAttrs: { Center: `${cx},${cy}`, RadiusX: String(r), RadiusY: String(r) },
      fill: base.fill || null,
      stroke: base.stroke || null,
      strokeThickness: base.strokeThickness || null,
      strokeStartLineCap: base.strokeStartLineCap || null,
      strokeEndLineCap: base.strokeEndLineCap || null,
      strokeLineJoin: base.strokeLineJoin || null,
      strokeMiterLimit: base.strokeMiterLimit || null,
    });
  } else {
    // Convert to path for transform
    const pathData = circleToPath(cx, cy, r);
    entries.push({
      data: transformPathData(pathData, matrix),
      geometryType: 'inline',
      geometryAttrs: {},
      fill: base.fill || null,
      stroke: base.stroke || null,
      strokeThickness: base.strokeThickness || null,
      strokeStartLineCap: base.strokeStartLineCap || null,
      strokeEndLineCap: base.strokeEndLineCap || null,
      strokeLineJoin: base.strokeLineJoin || null,
      strokeMiterLimit: base.strokeMiterLimit || null,
    });
  }
}

function processEllipse(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const cx = parseFloat(el.getAttribute('cx') || '0');
  const cy = parseFloat(el.getAttribute('cy') || '0');
  const rx = parseFloat(el.getAttribute('rx') || '0');
  const ry = parseFloat(el.getAttribute('ry') || '0');
  if (rx <= 0 || ry <= 0) return;

  const base = createBaseEntry(el);
  if (base.fill === 'none' && !base.stroke) return;
  if (base.fill === 'none') base.fill = null;

  if (isIdentity(matrix)) {
    entries.push({
      data: null,
      geometryType: 'EllipseGeometry',
      geometryAttrs: { Center: `${cx},${cy}`, RadiusX: String(rx), RadiusY: String(ry) },
      fill: base.fill || null,
      stroke: base.stroke || null,
      strokeThickness: base.strokeThickness || null,
      strokeStartLineCap: base.strokeStartLineCap || null,
      strokeEndLineCap: base.strokeEndLineCap || null,
      strokeLineJoin: base.strokeLineJoin || null,
      strokeMiterLimit: base.strokeMiterLimit || null,
    });
  } else {
    const pathData = ellipseToPath(cx, cy, rx, ry);
    entries.push({
      data: transformPathData(pathData, matrix),
      geometryType: 'inline',
      geometryAttrs: {},
      fill: base.fill || null,
      stroke: base.stroke || null,
      strokeThickness: base.strokeThickness || null,
      strokeStartLineCap: base.strokeStartLineCap || null,
      strokeEndLineCap: base.strokeEndLineCap || null,
      strokeLineJoin: base.strokeLineJoin || null,
      strokeMiterLimit: base.strokeMiterLimit || null,
    });
  }
}

function processRect(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const x = parseFloat(el.getAttribute('x') || '0');
  const y = parseFloat(el.getAttribute('y') || '0');
  const w = parseFloat(el.getAttribute('width') || '0');
  const h = parseFloat(el.getAttribute('height') || '0');
  if (w <= 0 || h <= 0) return;

  const rx = parseFloat(el.getAttribute('rx') || '0');
  const ry = parseFloat(el.getAttribute('ry') || rx.toString());

  const base = createBaseEntry(el);
  if (base.fill === 'none' && !base.stroke) return;
  if (base.fill === 'none') base.fill = null;

  if (isIdentity(matrix) && rx === 0 && ry === 0) {
    entries.push({
      data: null,
      geometryType: 'RectangleGeometry',
      geometryAttrs: { Rect: `${x},${y},${w},${h}` },
      fill: base.fill || null,
      stroke: base.stroke || null,
      strokeThickness: base.strokeThickness || null,
      strokeStartLineCap: base.strokeStartLineCap || null,
      strokeEndLineCap: base.strokeEndLineCap || null,
      strokeLineJoin: base.strokeLineJoin || null,
      strokeMiterLimit: base.strokeMiterLimit || null,
    });
  } else {
    const pathData = rectToPath(x, y, w, h, rx, ry);
    const finalPath = isIdentity(matrix) ? pathData : transformPathData(pathData, matrix);
    entries.push({
      data: finalPath,
      geometryType: 'inline',
      geometryAttrs: {},
      fill: base.fill || null,
      stroke: base.stroke || null,
      strokeThickness: base.strokeThickness || null,
      strokeStartLineCap: base.strokeStartLineCap || null,
      strokeEndLineCap: base.strokeEndLineCap || null,
      strokeLineJoin: base.strokeLineJoin || null,
      strokeMiterLimit: base.strokeMiterLimit || null,
    });
  }
}

function processLine(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const x1 = el.getAttribute('x1') || '0';
  const y1 = el.getAttribute('y1') || '0';
  const x2 = el.getAttribute('x2') || '0';
  const y2 = el.getAttribute('y2') || '0';

  const base = createBaseEntry(el);
  if (!base.stroke) return; // Lines need stroke

  let pathData = `M${x1},${y1} L${x2},${y2}`;
  if (!isIdentity(matrix)) {
    pathData = transformPathData(pathData, matrix);
  }

  entries.push({
    data: pathData,
    geometryType: 'inline',
    geometryAttrs: {},
    fill: null,
    stroke: base.stroke || null,
    strokeThickness: base.strokeThickness || '1',
    strokeStartLineCap: base.strokeStartLineCap || null,
    strokeEndLineCap: base.strokeEndLineCap || null,
    strokeLineJoin: base.strokeLineJoin || null,
    strokeMiterLimit: base.strokeMiterLimit || null,
  });
}

function processPolygon(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const points = el.getAttribute('points');
  if (!points) return;

  const pathData = pointsToPath(points, true);
  if (!pathData) return;

  const base = createBaseEntry(el);
  if (base.fill === 'none' && !base.stroke) return;
  if (base.fill === 'none') base.fill = null;

  const finalPath = isIdentity(matrix) ? pathData : transformPathData(pathData, matrix);
  entries.push({
    data: finalPath,
    geometryType: 'inline',
    geometryAttrs: {},
    fill: base.fill || null,
    stroke: base.stroke || null,
    strokeThickness: base.strokeThickness || null,
    strokeStartLineCap: base.strokeStartLineCap || null,
    strokeEndLineCap: base.strokeEndLineCap || null,
    strokeLineJoin: base.strokeLineJoin || null,
    strokeMiterLimit: base.strokeMiterLimit || null,
  });
}

function processPolyline(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const points = el.getAttribute('points');
  if (!points) return;

  const pathData = pointsToPath(points, false);
  if (!pathData) return;

  const base = createBaseEntry(el);
  if (base.fill === 'none' && !base.stroke) return;
  if (base.fill === 'none') base.fill = null;

  const finalPath = isIdentity(matrix) ? pathData : transformPathData(pathData, matrix);
  entries.push({
    data: finalPath,
    geometryType: 'inline',
    geometryAttrs: {},
    fill: base.fill || null,
    stroke: base.stroke || null,
    strokeThickness: base.strokeThickness || null,
    strokeStartLineCap: base.strokeStartLineCap || null,
    strokeEndLineCap: base.strokeEndLineCap || null,
    strokeLineJoin: base.strokeLineJoin || null,
    strokeMiterLimit: base.strokeMiterLimit || null,
  });
}

function processUse(el: Element, matrix: DOMMatrix, entries: GeometryEntry[]): void {
  const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
  if (!href || !href.startsWith('#')) return;

  const refId = href.substring(1);
  const doc = el.ownerDocument;
  const target = doc.getElementById(refId);
  if (!target) return;

  const x = parseFloat(el.getAttribute('x') || '0');
  const y = parseFloat(el.getAttribute('y') || '0');

  let useMatrix = matrix;
  if (x !== 0 || y !== 0) {
    const translateMatrix = new DOMMatrix();
    translateMatrix.e = x;
    translateMatrix.f = y;
    useMatrix = matrix.multiply(translateMatrix);
  }

  // Clone and process the referenced element
  const clone = target.cloneNode(true) as Element;
  processElement(clone, useMatrix, entries);
}

// --- Shape to path helpers ---

function pointsToPath(pointsStr: string, close: boolean): string | null {
  const nums = pointsStr.trim().split(/[\s,]+/).map(Number);
  if (nums.length < 4) return null;

  let path = `M${nums[0]},${nums[1]}`;
  for (let i = 2; i < nums.length; i += 2) {
    if (i + 1 < nums.length) {
      path += ` L${nums[i]},${nums[i + 1]}`;
    }
  }
  if (close) path += ' Z';
  return path;
}

function circleToPath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`;
}

function ellipseToPath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
}

function rectToPath(x: number, y: number, w: number, h: number, rx: number, ry: number): string {
  if (rx === 0 && ry === 0) {
    return `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
  }
  const r = Math.min(rx, w / 2);
  const rr = Math.min(ry, h / 2);
  return `M${x + r},${y} L${x + w - r},${y} A${r},${rr} 0 0,1 ${x + w},${y + rr} L${x + w},${y + h - rr} A${r},${rr} 0 0,1 ${x + w - r},${y + h} L${x + r},${y + h} A${r},${rr} 0 0,1 ${x},${y + h - rr} L${x},${y + rr} A${r},${rr} 0 0,1 ${x + r},${y} Z`;
}
