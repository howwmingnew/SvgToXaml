import { memo } from 'react';
import type { SvgFileEntry } from '../types';
import { useAppState, useAppDispatch } from '../store/AppContext';
import { useClipboard } from '../hooks/useClipboard';

interface IconCardProps {
  file: SvgFileEntry;
}

export const IconCard = memo(function IconCard({ file }: IconCardProps) {
  const { selectedId, iconSize } = useAppState();
  const dispatch = useAppDispatch();
  const { copyToClipboard } = useClipboard();
  const isSelected = selectedId === file.id;

  const handleClick = () => {
    dispatch({ type: 'SET_SELECTED', payload: file.id });
  };

  const handleDoubleClick = () => {
    const xaml = file.xamlGeometry || file.xamlDrawingImage;
    if (xaml) {
      copyToClipboard(xaml);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_SELECTED', payload: file.id });
  };

  return (
    <div
      className={`group flex flex-col items-center p-2 rounded-md border cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#40264F78] border-[#3794FF]'
          : 'bg-[#22FFFFFF] border-[#18FFFFFF] hover:bg-[#28FFFFFF] hover:border-[#30FFFFFF]'
      }`}
      style={{ width: iconSize + 24, minHeight: iconSize + 40 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="relative flex items-center justify-center" style={{ width: iconSize, height: iconSize }}>
        <img
          src={file.svgDataUrl}
          alt={file.name}
          className="max-w-full max-h-full object-contain"
          style={{ width: iconSize - 8, height: iconSize - 8 }}
          draggable={false}
        />
        {file.isComplex && (
          <span className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-1 rounded">
            DI
          </span>
        )}
      </div>
      <span
        className="text-[11px] text-center text-[#CCCCCC] mt-1 w-full truncate"
        title={file.filename}
      >
        {file.name}
      </span>
    </div>
  );
});
