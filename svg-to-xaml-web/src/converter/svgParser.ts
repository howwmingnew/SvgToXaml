// Named SVG colors → hex mapping (subset of most common)
const namedColors: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000',
  blue: '#0000FF', yellow: '#FFFF00', cyan: '#00FFFF', magenta: '#FF00FF',
  orange: '#FFA500', purple: '#800080', pink: '#FFC0CB', gray: '#808080',
  grey: '#808080', silver: '#C0C0C0', maroon: '#800000', olive: '#808000',
  lime: '#00FF00', aqua: '#00FFFF', teal: '#008080', navy: '#000080',
  fuchsia: '#FF00FF', transparent: 'Transparent',
  aliceblue: '#F0F8FF', antiquewhite: '#FAEBD7', aquamarine: '#7FFFD4',
  azure: '#F0FFFF', beige: '#F5F5DC', bisque: '#FFE4C4', blanchedalmond: '#FFEBCD',
  blueviolet: '#8A2BE2', brown: '#A52A2A', burlywood: '#DEB887', cadetblue: '#5F9EA0',
  chartreuse: '#7FFF00', chocolate: '#D2691E', coral: '#FF7F50', cornflowerblue: '#6495ED',
  cornsilk: '#FFF8DC', crimson: '#DC143C', darkblue: '#00008B', darkcyan: '#008B8B',
  darkgoldenrod: '#B8860B', darkgray: '#A9A9A9', darkgreen: '#006400', darkgrey: '#A9A9A9',
  darkkhaki: '#BDB76B', darkmagenta: '#8B008B', darkolivegreen: '#556B2F',
  darkorange: '#FF8C00', darkorchid: '#9932CC', darkred: '#8B0000',
  darksalmon: '#E9967A', darkseagreen: '#8FBC8F', darkslateblue: '#483D8B',
  darkslategray: '#2F4F4F', darkslategrey: '#2F4F4F', darkturquoise: '#00CED1',
  darkviolet: '#9400D3', deeppink: '#FF1493', deepskyblue: '#00BFFF',
  dimgray: '#696969', dimgrey: '#696969', dodgerblue: '#1E90FF',
  firebrick: '#B22222', floralwhite: '#FFFAF0', forestgreen: '#228B22',
  gainsboro: '#DCDCDC', ghostwhite: '#F8F8FF', gold: '#FFD700',
  goldenrod: '#DAA520', greenyellow: '#ADFF2F', honeydew: '#F0FFF0',
  hotpink: '#FF69B4', indianred: '#CD5C5C', indigo: '#4B0082',
  ivory: '#FFFFF0', khaki: '#F0E68C', lavender: '#E6E6FA',
  lavenderblush: '#FFF0F5', lawngreen: '#7CFC00', lemonchiffon: '#FFFACD',
  lightblue: '#ADD8E6', lightcoral: '#F08080', lightcyan: '#E0FFFF',
  lightgoldenrodyellow: '#FAFAD2', lightgray: '#D3D3D3', lightgreen: '#90EE90',
  lightgrey: '#D3D3D3', lightpink: '#FFB6C1', lightsalmon: '#FFA07A',
  lightseagreen: '#20B2AA', lightskyblue: '#87CEFA', lightslategray: '#778899',
  lightslategrey: '#778899', lightsteelblue: '#B0C4DE', lightyellow: '#FFFFE0',
  limegreen: '#32CD32', linen: '#FAF0E6', mediumaquamarine: '#66CDAA',
  mediumblue: '#0000CD', mediumorchid: '#BA55D3', mediumpurple: '#9370DB',
  mediumseagreen: '#3CB371', mediumslateblue: '#7B68EE', mediumspringgreen: '#00FA9A',
  mediumturquoise: '#48D1CC', mediumvioletred: '#C71585', midnightblue: '#191970',
  mintcream: '#F5FFFA', mistyrose: '#FFE4E1', moccasin: '#FFE4B5',
  navajowhite: '#FFDEAD', oldlace: '#FDF5E6', olivedrab: '#6B8E23',
  orangered: '#FF4500', orchid: '#DA70D6', palegoldenrod: '#EEE8AA',
  palegreen: '#98FB98', paleturquoise: '#AFEEEE', palevioletred: '#DB7093',
  papayawhip: '#FFEFD5', peachpuff: '#FFDAB9', peru: '#CD853F', plum: '#DDA0DD',
  powderblue: '#B0E0E6', rosybrown: '#BC8F8F', royalblue: '#4169E1',
  saddlebrown: '#8B4513', salmon: '#FA8072', sandybrown: '#F4A460',
  seagreen: '#2E8B57', seashell: '#FFF5EE', sienna: '#A0522D',
  skyblue: '#87CEEB', slateblue: '#6A5ACD', slategray: '#708090',
  slategrey: '#708090', snow: '#FFFAFA', springgreen: '#00FF7F',
  steelblue: '#4682B4', tan: '#D2B48C', thistle: '#D8BFD8',
  tomato: '#FF6347', turquoise: '#40E0D0', violet: '#EE82EE',
  wheat: '#F5DEB3', whitesmoke: '#F5F5F5', yellowgreen: '#9ACD32',
  none: 'none',
};

export function parseColor(color: string | null | undefined): string | null {
  if (!color) return null;
  color = color.trim();
  if (color === 'none' || color === 'transparent') return null;

  // Already hex
  if (color.startsWith('#')) {
    if (color.length === 4) {
      // #RGB → #RRGGBB
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
    }
    return color.toUpperCase();
  }

  // rgb(r,g,b) or rgba(r,g,b,a)
  const rgbMatch = color.match(/rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    const parseComponent = (s: string) => {
      if (s.endsWith('%')) return Math.round(parseFloat(s) * 2.55);
      return Math.round(parseFloat(s));
    };
    const r = parseComponent(rgbMatch[1]);
    const g = parseComponent(rgbMatch[2]);
    const b = parseComponent(rgbMatch[3]);
    const a = rgbMatch[4] !== undefined ? Math.round(parseFloat(rgbMatch[4]) * 255) : 255;
    if (a === 0) return null;
    const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
    if (a < 255) return `#${hex(a)}${hex(r)}${hex(g)}${hex(b)}`;
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  // Named color
  const lower = color.toLowerCase();
  if (lower in namedColors) {
    const v = namedColors[lower];
    if (v === 'none' || v === 'Transparent') return null;
    return v;
  }

  return color;
}

export function parseStyleAttribute(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!style) return result;
  for (const decl of style.split(';')) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx < 0) continue;
    const prop = decl.substring(0, colonIdx).trim();
    const val = decl.substring(colonIdx + 1).trim();
    if (prop && val) result[prop] = val;
  }
  return result;
}

export function getEffectiveAttribute(el: Element, attr: string): string | null {
  // Direct attribute first
  const direct = el.getAttribute(attr);
  if (direct) return direct;

  // Then check style attribute
  const style = el.getAttribute('style');
  if (style) {
    const parsed = parseStyleAttribute(style);
    if (parsed[attr]) return parsed[attr];
  }

  return null;
}

export function getInheritedAttribute(el: Element, attr: string): string | null {
  let current: Element | null = el;
  while (current) {
    const val = getEffectiveAttribute(current, attr);
    if (val) return val;
    current = current.parentElement;
  }
  return null;
}

export function parseViewBox(svg: Element): { x: number; y: number; width: number; height: number } {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }
  const w = parseFloat(svg.getAttribute('width') || '24');
  const h = parseFloat(svg.getAttribute('height') || '24');
  return { x: 0, y: 0, width: isNaN(w) ? 24 : w, height: isNaN(h) ? 24 : h };
}

export function parseSvgDocument(svgContent: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(svgContent, 'image/svg+xml');
}
