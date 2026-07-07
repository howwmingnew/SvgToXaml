import type { ConversionResult, GeometryResult } from '../types';
import { parseSvgDocument, parseViewBox } from './svgParser';
import { detectComplexity } from './complexity';
import { parseGradients } from './gradients';
import { extractEntries } from './elements';
import { generateGeometryXaml } from './geometryMode';
import { generateDrawingImageXaml } from './drawingImageMode';
import { generateButtonXaml } from './buttonMode';

/**
 * Main conversion entry point.
 * DOMParser → complexity check → extract geometry entries → generate both XAML modes.
 */
export function convertSvgToXaml(svgContent: string, filename: string): ConversionResult {
  const doc = parseSvgDocument(svgContent);
  const svg = doc.querySelector('svg');

  if (!svg) {
    return { geometry: '', drawingImage: '', button: '', isComplex: true };
  }

  const isComplex = detectComplexity(doc);
  const viewBox = parseViewBox(svg);
  const entries = extractEntries(svg);
  const gradients = parseGradients(doc);

  const geoResult: GeometryResult = {
    entries,
    isComplex,
    width: viewBox.width,
    height: viewBox.height,
    gradients,
  };

  const geometry = generateGeometryXaml(geoResult, filename);
  const drawingImage = generateDrawingImageXaml(geoResult, filename);
  const button = generateButtonXaml(geoResult, filename);

  return { geometry, drawingImage, button, isComplex };
}
