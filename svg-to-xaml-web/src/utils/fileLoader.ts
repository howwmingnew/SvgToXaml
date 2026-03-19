import type { SvgFileEntry } from '../types';

let idCounter = 0;

function generateId(): string {
  return `svg-${Date.now()}-${idCounter++}`;
}

function svgToDataUrl(svgContent: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
}

export function parseSvgViewBox(svgText: string): { x: number; y: number; width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { x: 0, y: 0, width: 24, height: 24 };

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

function createEntry(filename: string, content: string): SvgFileEntry {
  const name = filename.replace(/\.svg$/i, '');
  return {
    id: generateId(),
    name,
    filename,
    svgContent: content,
    svgDataUrl: svgToDataUrl(content),
    isComplex: false,
    viewBox: parseSvgViewBox(content),
  };
}

export async function loadFilesFromInput(fileList: FileList): Promise<SvgFileEntry[]> {
  const entries: SvgFileEntry[] = [];
  for (const file of Array.from(fileList)) {
    if (!file.name.toLowerCase().endsWith('.svg')) continue;
    const content = await file.text();
    entries.push(createEntry(file.name, content));
  }
  return entries;
}

export async function loadFilesFromDrop(dataTransfer: DataTransfer): Promise<SvgFileEntry[]> {
  const entries: SvgFileEntry[] = [];

  // Try webkitGetAsEntry for folder support
  const items = dataTransfer.items;
  if (items && items.length > 0 && items[0].webkitGetAsEntry) {
    const fileEntries = await collectFileEntries(items);
    for (const fileEntry of fileEntries) {
      const file = await getFile(fileEntry);
      if (file.name.toLowerCase().endsWith('.svg')) {
        const content = await file.text();
        entries.push(createEntry(file.name, content));
      }
    }
    return entries;
  }

  // Fallback to regular files
  return loadFilesFromInput(dataTransfer.files);
}

async function collectFileEntries(items: DataTransferItemList): Promise<FileSystemFileEntry[]> {
  const results: FileSystemFileEntry[] = [];

  async function traverseEntry(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      results.push(entry as FileSystemFileEntry);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const child of entries) {
        await traverseEntry(child);
      }
    }
  }

  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry();
    if (entry) await traverseEntry(entry);
  }
  return results;
}

function getFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}
