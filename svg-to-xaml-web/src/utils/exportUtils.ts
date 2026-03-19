import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { SvgFileEntry } from '../types';
import { generateResourceDictionary } from '../converter/resourceDictionary';
import { generateUserControlXaml } from '../converter/userControl';
import { validateName } from '../converter/xamlFormatter';

export async function exportAsZip(files: SvgFileEntry[], mode: 'geometry' | 'drawingImage'): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    const xaml = mode === 'geometry' ? file.xamlGeometry : file.xamlDrawingImage;
    if (xaml) {
      const name = validateName(file.name) + '.xaml';
      zip.file(name, xaml);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'svg-to-xaml-export.zip');
}

export function exportAsResourceDictionary(files: SvgFileEntry[], mode: 'geometry' | 'drawingImage'): void {
  const xaml = generateResourceDictionary(files, mode);
  const blob = new Blob([xaml], { type: 'application/xml' });
  saveAs(blob, 'ResourceDictionary.xaml');
}

export function exportAsUserControl(files: SvgFileEntry[]): void {
  const xaml = generateUserControlXaml(files);
  const blob = new Blob([xaml], { type: 'application/xml' });
  saveAs(blob, 'IconsUserControl.xaml');
}
