import { useAppState } from '../store/AppContext';
import { useMemo } from 'react';

export function StatusBar() {
  const { files, selectedId, searchQuery } = useAppState();

  const selectedFile = useMemo(
    () => files.find(f => f.id === selectedId),
    [files, selectedId]
  );

  const filteredCount = useMemo(() => {
    if (!searchQuery) return files.length;
    const q = searchQuery.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q)).length;
  }, [files, searchQuery]);

  return (
    <div className="flex items-center px-3 py-1 bg-[#007ACC] text-white text-xs shrink-0">
      <span>
        {selectedFile
          ? selectedFile.filename
          : `${filteredCount} 個圖示${searchQuery ? ` (共 ${files.length} 個)` : ''}`}
      </span>
      <div className="flex-1" />
      {selectedFile && (
        <span className="text-white/70">
          {selectedFile.viewBox.width} x {selectedFile.viewBox.height}
          {selectedFile.isComplex && ' | Complex'}
        </span>
      )}
    </div>
  );
}
