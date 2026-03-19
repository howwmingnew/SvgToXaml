import { useRef, useCallback } from 'react';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { loadFilesFromInput } from '../utils/fileLoader';
import { convertSvgToXaml } from '../converter';
import { SearchBar } from './SearchBar';
import type { PreviewBackground, SvgFileEntry } from '../types';

const bgOptions: { value: PreviewBackground; label: string }[] = [
  { value: 'dark', label: '深灰' },
  { value: 'light', label: '淺灰' },
  { value: 'checkerboard', label: '棋盤' },
];

export function Toolbar({ onExport }: { onExport: () => void }) {
  const { background, iconSize, files } = useAppState();
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (entries: SvgFileEntry[]) => {
    dispatch({ type: 'ADD_FILES', payload: entries });

    // Convert in next tick to avoid blocking UI
    for (const entry of entries) {
      const result = convertSvgToXaml(entry.svgContent, entry.filename);
      dispatch({
        type: 'UPDATE_FILE_XAML',
        payload: {
          id: entry.id,
          xamlGeometry: result.geometry,
          xamlDrawingImage: result.drawingImage,
          isComplex: result.isComplex,
        },
      });
    }
  }, [dispatch]);

  const handleOpenFiles = useCallback(async () => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const entries = await loadFilesFromInput(e.target.files);
    await processFiles(entries);
    e.target.value = '';
  }, [processFiles]);

  const handleBgChange = useCallback((bg: PreviewBackground) => {
    dispatch({ type: 'SET_BACKGROUND', payload: bg });
  }, [dispatch]);

  const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_ICON_SIZE', payload: parseInt(e.target.value) });
  }, [dispatch]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2D2D30] border-b border-[#3F3F46] shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept=".svg"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Open Files */}
      <button
        onClick={handleOpenFiles}
        className="flex items-center gap-1 px-3 py-1 rounded text-sm text-[#CCCCCC] hover:bg-[#3F3F3F] active:bg-[#5F5F5F] transition-colors"
        title="開啟 SVG 檔案"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.5 14h13l.5-.5V7l-.5-.5H8.71l-1-1H1.5l-.5.5v7.5l.5.5zM2 7h5.29l1 1H14v5H2V7z"/>
        </svg>
        <span>開啟檔案</span>
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-[#555555]" />

      {/* Background toggle */}
      <div className="flex items-center gap-1">
        {bgOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleBgChange(opt.value)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              background === opt.value
                ? 'bg-[#007ACC] text-white'
                : 'text-[#CCCCCC] hover:bg-[#3F3F3F]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-[#555555]" />

      {/* Icon size slider */}
      <div className="flex items-center gap-2">
        <svg className="w-3 h-3 text-[#808080]" viewBox="0 0 16 16" fill="currentColor">
          <rect x="4" y="4" width="8" height="8" rx="1"/>
        </svg>
        <input
          type="range"
          min="40"
          max="160"
          value={iconSize}
          onChange={handleSizeChange}
          className="w-24 accent-[#007ACC]"
        />
        <svg className="w-4 h-4 text-[#808080]" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="12" height="12" rx="1"/>
        </svg>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-[#555555]" />

      {/* Search */}
      <SearchBar />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export */}
      {files.length > 0 && (
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-3 py-1 rounded text-sm text-[#CCCCCC] hover:bg-[#3F3F3F] active:bg-[#5F5F5F] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1L3 6h3v5h4V6h3L8 1zM3 13v1h10v-1H3z"/>
          </svg>
          <span>匯出</span>
        </button>
      )}
    </div>
  );
}
