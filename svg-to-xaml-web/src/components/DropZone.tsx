import { useState, useCallback } from 'react';
import { useAppDispatch, useAppState } from '../store/AppContext';
import { loadFilesFromDrop, loadFilesFromInput } from '../utils/fileLoader';
import { convertSvgToXaml } from '../converter';
import type { SvgFileEntry } from '../types';

export function DropZone() {
  const { files } = useAppState();
  const dispatch = useAppDispatch();
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (entries: SvgFileEntry[]) => {
    dispatch({ type: 'ADD_FILES', payload: entries });
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const entries = await loadFilesFromDrop(e.dataTransfer);
    if (entries.length > 0) {
      await processFiles(entries);
    }
  }, [processFiles]);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg';
    input.multiple = true;
    input.onchange = async () => {
      if (input.files?.length) {
        const entries = await loadFilesFromInput(input.files);
        await processFiles(entries);
      }
    };
    input.click();
  }, [processFiles]);

  // Full-screen drop zone when no files loaded
  if (files.length === 0) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragging ? 'bg-[#264F78]' : 'bg-[#1E1E1E]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <svg className="w-16 h-16 text-[#555555] mb-4" viewBox="0 0 64 64" fill="currentColor">
          <path d="M32 8L16 24h10v14h12V24h10L32 8zM12 48v4h40v-4H12z"/>
        </svg>
        <p className="text-[#808080] text-lg mb-2">拖放 SVG 檔案或資料夾到此處</p>
        <p className="text-[#555555] text-sm">或點擊此處選擇檔案</p>
      </div>
    );
  }

  // Invisible overlay for additional drag-and-drop when files exist
  return (
    <>
      {isDragging && (
        <div
          className="fixed inset-0 z-40 bg-[#264F78] bg-opacity-80 flex items-center justify-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="text-white text-xl">放開以加入更多 SVG 檔案</p>
        </div>
      )}
      <div
        className="hidden"
        onDragOver={handleDragOver}
      />
    </>
  );
}

/**
 * Invisible drag overlay component for when files exist.
 * Attach to body level to detect drag events.
 */
export function DragOverlay({ onFilesAdded }: { onFilesAdded: (entries: SvgFileEntry[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const entries = await loadFilesFromDrop(e.dataTransfer);
    if (entries.length > 0) onFilesAdded(entries);
  }, [onFilesAdded]);

  if (!isDragging) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-[#264F78]/80 flex items-center justify-center"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className="text-white text-xl">放開以加入更多 SVG 檔案</p>
    </div>
  );
}
