const COMPLEX_TAGS = [
  'linearGradient',
  'radialGradient',
  'clipPath',
  'text',
  'image',
  'filter',
  'mask',
  'pattern',
  'foreignObject',
];

export function detectComplexity(svgDoc: Document): boolean {
  const svg = svgDoc.querySelector('svg');
  if (!svg) return true;

  for (const tag of COMPLEX_TAGS) {
    if (svg.querySelector(tag)) return true;
  }

  return false;
}

export function hasGradients(svgDoc: Document): boolean {
  const svg = svgDoc.querySelector('svg');
  if (!svg) return false;
  return !!(svg.querySelector('linearGradient') || svg.querySelector('radialGradient'));
}
