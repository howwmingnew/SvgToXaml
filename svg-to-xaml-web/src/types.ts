export interface SvgFileEntry {
  id: string;
  name: string;
  filename: string;
  svgContent: string;
  svgDataUrl: string;
  xamlGeometry?: string;
  xamlDrawingImage?: string;
  isComplex: boolean;
  viewBox: { x: number; y: number; width: number; height: number };
}

export type PreviewBackground = 'dark' | 'light' | 'checkerboard';

export type OutputFormat = 'geometry' | 'drawingImage';

export interface ConversionResult {
  geometry: string;
  drawingImage: string;
  isComplex: boolean;
}

export interface GeometryEntry {
  data: string | null;
  geometryType: 'inline' | 'EllipseGeometry' | 'RectangleGeometry';
  geometryAttrs: Record<string, string>;
  fill: string | null;
  stroke: string | null;
  strokeThickness: string | null;
  strokeStartLineCap: string | null;
  strokeEndLineCap: string | null;
  strokeLineJoin: string | null;
  strokeMiterLimit: string | null;
}

export interface GeometryResult {
  entries: GeometryEntry[];
  isComplex: boolean;
  width: number;
  height: number;
}

export type ExportFormat = 'resourceDictionary' | 'userControl' | 'zip';

export interface AppState {
  files: SvgFileEntry[];
  selectedId: string | null;
  background: PreviewBackground;
  iconSize: number;
  searchQuery: string;
  toast: { message: string; visible: boolean };
}

export type AppAction =
  | { type: 'ADD_FILES'; payload: SvgFileEntry[] }
  | { type: 'SET_SELECTED'; payload: string | null }
  | { type: 'SET_BACKGROUND'; payload: PreviewBackground }
  | { type: 'SET_ICON_SIZE'; payload: number }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SHOW_TOAST'; payload: string }
  | { type: 'HIDE_TOAST' }
  | { type: 'UPDATE_FILE_XAML'; payload: { id: string; xamlGeometry: string; xamlDrawingImage: string; isComplex: boolean } };
