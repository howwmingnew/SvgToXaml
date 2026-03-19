import { useState, useMemo } from 'react';
import { useAppState } from '../store/AppContext';
import { useClipboard } from '../hooks/useClipboard';
import { XamlEditor } from './XamlEditor';

type Tab = 'preview' | 'xaml' | 'svg';

export function DetailPanel() {
  const { files, selectedId } = useAppState();
  const [activeTab, setActiveTab] = useState<Tab>('xaml');
  const [xamlMode, setXamlMode] = useState<'geometry' | 'drawingImage'>('geometry');
  const { copyToClipboard } = useClipboard();

  const selectedFile = useMemo(
    () => files.find(f => f.id === selectedId),
    [files, selectedId]
  );

  if (!selectedFile) {
    return (
      <div className="w-96 bg-[#252526] border-l border-[#3F3F46] flex items-center justify-center text-[#555555] shrink-0">
        <p>選擇圖示以查看詳細資訊</p>
      </div>
    );
  }

  const xamlContent = xamlMode === 'geometry'
    ? (selectedFile.xamlGeometry || '(無 Geometry 輸出)')
    : (selectedFile.xamlDrawingImage || '(無 DrawingImage 輸出)');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'preview', label: '預覽' },
    { key: 'xaml', label: 'XAML' },
    { key: 'svg', label: 'SVG' },
  ];

  const handleCopy = () => {
    const text = activeTab === 'svg' ? selectedFile.svgContent : xamlContent;
    copyToClipboard(text, activeTab === 'svg' ? '已複製 SVG' : '已複製 XAML');
  };

  return (
    <div className="w-96 bg-[#252526] border-l border-[#3F3F46] flex flex-col shrink-0">
      {/* Tab bar */}
      <div className="flex items-center bg-[#2D2D30] border-b border-[#3F3F46]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-[#007ACC] bg-[#1E1E1E]'
                : 'text-[#808080] hover:text-[#CCCCCC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        {activeTab !== 'preview' && (
          <button
            onClick={handleCopy}
            className="px-3 py-1 mr-2 text-xs text-[#CCCCCC] hover:bg-[#3F3F3F] rounded transition-colors"
            title="複製到剪貼簿"
          >
            複製
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="bg-[#3C3C3C] rounded-lg p-6 mb-4">
              <div
                className="flex items-center justify-center"
                style={{ width: 200, height: 200 }}
                dangerouslySetInnerHTML={{ __html: selectedFile.svgContent }}
              />
            </div>
            <div className="text-sm text-[#808080] space-y-1 text-center">
              <p>{selectedFile.filename}</p>
              <p>{selectedFile.viewBox.width} x {selectedFile.viewBox.height}</p>
              {selectedFile.isComplex && (
                <p className="text-orange-400">Complex SVG (含漸層/文字等)</p>
              )}
            </div>
          </div>
        )}
        {activeTab === 'xaml' && (
          <div className="h-full flex flex-col">
            {/* Mode toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1E1E1E] border-b border-[#3F3F46]">
              <button
                onClick={() => setXamlMode('geometry')}
                className={`px-2 py-0.5 rounded text-xs ${
                  xamlMode === 'geometry' ? 'bg-[#007ACC] text-white' : 'text-[#808080] hover:text-[#CCCCCC]'
                }`}
              >
                Geometry
              </button>
              <button
                onClick={() => setXamlMode('drawingImage')}
                className={`px-2 py-0.5 rounded text-xs ${
                  xamlMode === 'drawingImage' ? 'bg-[#007ACC] text-white' : 'text-[#808080] hover:text-[#CCCCCC]'
                }`}
              >
                DrawingImage
              </button>
            </div>
            <div className="flex-1">
              <XamlEditor value={xamlContent} />
            </div>
          </div>
        )}
        {activeTab === 'svg' && (
          <XamlEditor value={selectedFile.svgContent} />
        )}
      </div>
    </div>
  );
}
