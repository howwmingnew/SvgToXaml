import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { SvgFileEntry } from '../types';
import { generateResourceDictionary } from '../converter/resourceDictionary';
import { generateUserControlXaml } from '../converter/userControl';
import { validateName } from '../converter/xamlFormatter';

type ExportMode = 'geometry' | 'drawingImage' | 'button';

function pickXaml(file: SvgFileEntry, mode: ExportMode): string | undefined {
  if (mode === 'geometry') return file.xamlGeometry;
  if (mode === 'drawingImage') return file.xamlDrawingImage;
  return file.xamlButton;
}

export async function exportAsZip(files: SvgFileEntry[], mode: ExportMode): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    const xaml = pickXaml(file, mode);
    if (xaml) {
      const name = validateName(file.name) + '.xaml';
      zip.file(name, xaml);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'svg-to-xaml-export.zip');
}

export function exportAsResourceDictionary(files: SvgFileEntry[], mode: ExportMode): void {
  const xaml = generateResourceDictionary(files, mode);
  const blob = new Blob([xaml], { type: 'application/xml' });
  saveAs(blob, 'ResourceDictionary.xaml');
}

export function exportAsUserControl(files: SvgFileEntry[]): void {
  const xaml = generateUserControlXaml(files);
  const blob = new Blob([xaml], { type: 'application/xml' });
  saveAs(blob, 'IconsUserControl.xaml');
}
