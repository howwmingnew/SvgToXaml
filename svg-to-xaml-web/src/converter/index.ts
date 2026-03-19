import type { ConversionResult, GeometryResult } from '../types';
import { parseSvgDocument, parseViewBox } from './svgParser';
import { detectComplexity } from './complexity';
import { extractEntries } from './elements';
import { generateGeometryXaml } from './geometryMode';
import { generateDrawingImageXaml } from './drawingImageMode';

/**
 * Main conversion entry point.
 * DOMParser → complexity check → extract geometry entries → generate both XAML modes.
 */
export function convertSvgToXaml(svgContent: string, filename: string): ConversionResult {
  const doc = parseSvgDocument(svgContent);
  const svg = doc.querySelector('svg');

  if (!svg) {
    return { geometry: '', drawingImage: '', isComplex: true };
  }

  const isComplex = detectComplexity(doc);
  const viewBox = parseViewBox(svg);
  const entries = extractEntries(svg);

  const geoResult: GeometryResult = {
    entries,
    isComplex,
    width: viewBox.width,
    height: viewBox.height,
  };

  const geometry = generateGeometryXaml(geoResult, filename);
  const drawingImage = generateDrawingImageXaml(geoResult, filename);

  return { geometry, drawingImage, isComplex };
}
