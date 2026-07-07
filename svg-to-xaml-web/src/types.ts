export interface SvgFileEntry {
  id: string;
  name: string;
  filename: string;
  svgContent: string;
  svgDataUrl: string;
  xamlGeometry?: string;
  xamlDrawingImage?: string;
  xamlButton?: string;
  isComplex: boolean;
  viewBox: { x: number; y: number; width: number; height: number };
}

export type PreviewBackground = 'dark' | 'light' | 'checkerboard';

export type OutputFormat = 'geometry' | 'drawingImage' | 'button';

export interface ConversionResult {
  geometry: string;
  drawingImage: string;
  button: string;
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
  // SVG 預設 fill-rule = nonzero；WPF Path mini-language 預設 = EvenOdd。
  // 這欄位告訴輸出器要在 path data 前加 F1 (Nonzero) 或 F0 (EvenOdd)，
  // 缺了會讓含重疊 sub-path 的 icon 在 WPF 顯示破洞（Figma export 的 stroke-to-fill icon 是常見受害者）。
  // EllipseGeometry / RectangleGeometry 為單一閉合形狀且 WPF type 沒有 FillRule 屬性，可填 null。
  fillRule: 'Nonzero' | 'EvenOdd' | null;
}

export interface GeometryResult {
  entries: GeometryEntry[];
  isComplex: boolean;
  width: number;
  height: number;
  // fill/stroke 為 url(#id) 時，這裡放解析好的漸層定義（id → GradientInfo）。
  gradients?: Map<string, import('./converter/gradients').GradientInfo>;
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
  | { type: 'UPDATE_FILE_XAML'; payload: { id: string; xamlGeometry: string; xamlDrawingImage: string; xamlButton: string; isComplex: boolean } };
