import { parseColor } from './svgParser';
import { parseTransform, isIdentity } from './transforms';

/**
 * SVG 漸層 → WPF 漸層筆刷。
 *
 * 背景：舊版轉換器把 fill="url(#id)" 當成一般顏色字串直接吐出去，
 * 於是 geometry/button 產生無效的 <SolidColorBrush Color="url(#id)">，
 * WPF 載入時丟 XamlParseException，那條 path 就畫不出來。
 * 這裡把 <defs> 裡的漸層定義解析成真正的 LinearGradientBrush / RadialGradientBrush。
 *
 * 已知限制：對「被漸層填色的元素本身或其祖先帶有 transform」的 userSpaceOnUse 漸層，
 * 座標未套用該 transform（本轉換器把 transform 烘進 path data，但漸層座標另外處理）。
 * 一般 icon 很少對漸層 path 加 transform，命中此限制的機率低。
 */

export interface GradientStopInfo {
  color: string; // #AARRGGBB
  offset: string; // 0..1 字串
}

export interface GradientInfo {
  type: 'linear' | 'radial';
  mappingMode: 'Absolute' | 'RelativeToBoundingBox';
  // linear
  start?: string; // "x,y"
  end?: string;
  // radial
  center?: string;
  origin?: string;
  radiusX?: string;
  radiusY?: string;
  stops: GradientStopInfo[];
}

/** 判斷值是否為 url(#id) 形式的漸層/pattern 參照。 */
export function isGradientRef(value: string | null | undefined): boolean {
  return !!value && /^url\(#.+\)$/i.test(value.trim());
}

/** 從 url(#id) 取出 id；非參照回傳 null。 */
export function gradientRefId(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.trim().match(/^url\(#(.+)\)$/i);
  return m ? m[1] : null;
}

function hex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase();
}

/** 把 stop-color + stop-opacity 併成 WPF 需要的 #AARRGGBB。 */
function resolveStopColor(colorStr: string | null, opacityStr: string | null): string {
  let hex = parseColor(colorStr) ?? '#000000';
  if (!hex.startsWith('#')) hex = '#000000';
  const h = hex.slice(1);
  let a = 255, r = 0, g = 0, b = 0;
  if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (h.length === 8) {
    a = parseInt(h.slice(0, 2), 16);
    r = parseInt(h.slice(2, 4), 16);
    g = parseInt(h.slice(4, 6), 16);
    b = parseInt(h.slice(6, 8), 16);
  }
  const op = opacityStr != null && opacityStr !== '' ? Math.max(0, Math.min(1, parseFloat(opacityStr))) : 1;
  a = a * op;
  return `#${hex2(a)}${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** offset 可能是 "0.5" 或 "50%"；正規化成 0..1 字串。 */
function normalizeOffset(raw: string | null): string {
  if (!raw) return '0';
  const t = raw.trim();
  if (t.endsWith('%')) {
    const v = parseFloat(t) / 100;
    return String(isNaN(v) ? 0 : v);
  }
  const v = parseFloat(t);
  return String(isNaN(v) ? 0 : v);
}

/** bounding-box 座標可能帶 %；userSpace 為純數字。回傳 float。 */
function coord(raw: string | null, fallback: number, isBoundingBox: boolean): number {
  if (raw == null || raw === '') return fallback;
  const t = raw.trim();
  if (t.endsWith('%')) {
    const v = parseFloat(t);
    return isNaN(v) ? fallback : (isBoundingBox ? v / 100 : v);
  }
  const v = parseFloat(t);
  return isNaN(v) ? fallback : v;
}

function fmt(n: number): string {
  // 去掉浮點雜訊，最多 5 位小數
  return String(Math.round(n * 100000) / 100000);
}

function transformPoint(m: DOMMatrix, x: number, y: number): { x: number; y: number } {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

function getHref(el: Element): string | null {
  return el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
}

/** 沿 xlink:href 鏈解析 stops（子代優先，否則繼承被參照者）。 */
function resolveStops(el: Element, byId: Map<string, Element>, visited: Set<string>): GradientStopInfo[] {
  const stops = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'stop');
  if (stops.length > 0) {
    return stops.map(s => ({
      color: resolveStopColor(
        s.getAttribute('stop-color') || readStyle(s, 'stop-color'),
        s.getAttribute('stop-opacity') || readStyle(s, 'stop-opacity'),
      ),
      offset: normalizeOffset(s.getAttribute('offset')),
    }));
  }
  const href = getHref(el);
  if (href && href.startsWith('#')) {
    const id = href.slice(1);
    if (!visited.has(id)) {
      visited.add(id);
      const ref = byId.get(id);
      if (ref) return resolveStops(ref, byId, visited);
    }
  }
  return [];
}

function readStyle(el: Element, prop: string): string | null {
  const style = el.getAttribute('style');
  if (!style) return null;
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    if (decl.slice(0, idx).trim() === prop) return decl.slice(idx + 1).trim();
  }
  return null;
}

/** 讀屬性，缺了就沿 href 繼承。 */
function inheritAttr(el: Element, attr: string, byId: Map<string, Element>, visited: Set<string>): string | null {
  const v = el.getAttribute(attr);
  if (v != null) return v;
  const href = getHref(el);
  if (href && href.startsWith('#')) {
    const id = href.slice(1);
    if (!visited.has(id)) {
      visited.add(id);
      const ref = byId.get(id);
      if (ref) return inheritAttr(ref, attr, byId, visited);
    }
  }
  return null;
}

/** 掃描整份 SVG，建立 id → GradientInfo。 */
export function parseGradients(svgDoc: Document): Map<string, GradientInfo> {
  const result = new Map<string, GradientInfo>();
  const svg = svgDoc.querySelector('svg');
  if (!svg) return result;

  const gradientEls = Array.from(svg.querySelectorAll('linearGradient, radialGradient'));
  const byId = new Map<string, Element>();
  for (const el of gradientEls) {
    const id = el.getAttribute('id');
    if (id) byId.set(id, el);
  }

  for (const el of gradientEls) {
    const id = el.getAttribute('id');
    if (!id) continue;

    const units = (inheritAttr(el, 'gradientUnits', byId, new Set([id])) || 'objectBoundingBox').trim();
    const isBoundingBox = units !== 'userSpaceOnUse';
    const mappingMode: GradientInfo['mappingMode'] = isBoundingBox ? 'RelativeToBoundingBox' : 'Absolute';

    const transformAttr = inheritAttr(el, 'gradientTransform', byId, new Set([id]));
    const matrix = transformAttr ? parseTransform(transformAttr) : null;
    const applyM = (x: number, y: number) => {
      if (matrix && !isIdentity(matrix)) return transformPoint(matrix, x, y);
      return { x, y };
    };

    const stops = resolveStops(el, byId, new Set([id]));

    if (el.tagName.toLowerCase() === 'lineargradient') {
      const x1 = coord(inheritAttr(el, 'x1', byId, new Set([id])), isBoundingBox ? 0 : 0, isBoundingBox);
      const y1 = coord(inheritAttr(el, 'y1', byId, new Set([id])), 0, isBoundingBox);
      const x2 = coord(inheritAttr(el, 'x2', byId, new Set([id])), isBoundingBox ? 1 : 1, isBoundingBox);
      const y2 = coord(inheritAttr(el, 'y2', byId, new Set([id])), 0, isBoundingBox);
      const p1 = applyM(x1, y1);
      const p2 = applyM(x2, y2);
      result.set(id, {
        type: 'linear',
        mappingMode,
        start: `${fmt(p1.x)},${fmt(p1.y)}`,
        end: `${fmt(p2.x)},${fmt(p2.y)}`,
        stops,
      });
    } else {
      const cx = coord(inheritAttr(el, 'cx', byId, new Set([id])), 0.5, isBoundingBox);
      const cy = coord(inheritAttr(el, 'cy', byId, new Set([id])), 0.5, isBoundingBox);
      const r = coord(inheritAttr(el, 'r', byId, new Set([id])), 0.5, isBoundingBox);
      const fx = coord(inheritAttr(el, 'fx', byId, new Set([id])), cx, isBoundingBox);
      const fy = coord(inheritAttr(el, 'fy', byId, new Set([id])), cy, isBoundingBox);
      const c = applyM(cx, cy);
      const o = applyM(fx, fy);
      result.set(id, {
        type: 'radial',
        mappingMode,
        center: `${fmt(c.x)},${fmt(c.y)}`,
        origin: `${fmt(o.x)},${fmt(o.y)}`,
        radiusX: fmt(r),
        radiusY: fmt(r),
        stops,
      });
    }
  }

  return result;
}

/**
 * 產生漸層筆刷的 XAML 行。
 * @param keyAttr 資源用途傳 `x:Key="..."`；inline 用途傳 ''。
 * @param indent  該筆刷開頭要縮排的空白字串。
 */
export function gradientBrushLines(info: GradientInfo, keyAttr: string, indent: string): string[] {
  const lines: string[] = [];
  const key = keyAttr ? keyAttr + ' ' : '';
  const mm = info.mappingMode === 'Absolute' ? ' MappingMode="Absolute"' : '';

  if (info.type === 'linear') {
    lines.push(`${indent}<LinearGradientBrush ${key}StartPoint="${info.start}" EndPoint="${info.end}"${mm}>`);
  } else {
    lines.push(
      `${indent}<RadialGradientBrush ${key}Center="${info.center}" GradientOrigin="${info.origin}" RadiusX="${info.radiusX}" RadiusY="${info.radiusY}"${mm}>`,
    );
  }

  for (const s of info.stops) {
    lines.push(`${indent}    <GradientStop Color="${s.color}" Offset="${s.offset}" />`);
  }

  lines.push(`${indent}</${info.type === 'linear' ? 'LinearGradientBrush' : 'RadialGradientBrush'}>`);
  return lines;
}
