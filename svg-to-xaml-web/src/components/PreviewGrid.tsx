import { useMemo } from 'react';
import { useAppState } from '../store/AppContext';
import { IconCard } from './IconCard';
import type { PreviewBackground } from '../types';

function getBgClass(bg: PreviewBackground): string {
  switch (bg) {
    case 'dark': return 'bg-[#3C3C3C]';
    case 'light': return 'bg-[#D0D0D0]';
    case 'checkerboard': return 'bg-checkerboard';
  }
}

export function PreviewGrid() {
  const { files, background, searchQuery } = useAppState();

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q) || f.filename.toLowerCase().includes(q));
  }, [files, searchQuery]);

  if (files.length === 0) return null;

  return (
    <div className={`flex-1 overflow-auto p-4 ${getBgClass(background)}`}>
      <div className="flex flex-wrap gap-2 content-start">
        {filteredFiles.map(file => (
          <IconCard key={file.id} file={file} />
        ))}
      </div>
      {filteredFiles.length === 0 && searchQuery && (
        <div className="text-center text-[#808080] mt-12">
          找不到符合「{searchQuery}」的圖示
        </div>
      )}
    </div>
  );
}
