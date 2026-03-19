import { useState } from 'react';
import { useAppState } from '../store/AppContext';
import { exportAsZip, exportAsResourceDictionary, exportAsUserControl } from '../utils/exportUtils';
import type { ExportFormat } from '../types';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { files } = useAppState();
  const [format, setFormat] = useState<ExportFormat>('resourceDictionary');
  const [mode, setMode] = useState<'geometry' | 'drawingImage'>('geometry');

  if (!open) return null;

  const handleExport = async () => {
    switch (format) {
      case 'resourceDictionary':
        exportAsResourceDictionary(files, mode);
        break;
      case 'userControl':
        exportAsUserControl(files);
        break;
      case 'zip':
        await exportAsZip(files, mode);
        break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[#2D2D30] rounded-lg border border-[#3F3F46] shadow-2xl p-6 w-96"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg text-white mb-4">匯出 XAML</h2>

        {/* Format selection */}
        <div className="mb-4">
          <label className="text-sm text-[#CCCCCC] block mb-2">匯出格式</label>
          <div className="space-y-2">
            {[
              { value: 'resourceDictionary' as ExportFormat, label: 'ResourceDictionary', desc: '所有圖示合併為單一 XAML 資源字典' },
              { value: 'userControl' as ExportFormat, label: 'UserControl', desc: '含視覺預覽的 UserControl' },
              { value: 'zip' as ExportFormat, label: 'ZIP (個別檔案)', desc: '每個 SVG 產生獨立 XAML 檔，打包為 ZIP' },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${
                  format === opt.value ? 'bg-[#264F78]' : 'hover:bg-[#3F3F3F]'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={opt.value}
                  checked={format === opt.value}
                  onChange={() => setFormat(opt.value)}
                  className="mt-1 accent-[#007ACC]"
                />
                <div>
                  <div className="text-sm text-[#CCCCCC]">{opt.label}</div>
                  <div className="text-xs text-[#808080]">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Mode selection (not for UserControl) */}
        {format !== 'userControl' && (
          <div className="mb-4">
            <label className="text-sm text-[#CCCCCC] block mb-2">輸出模式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('geometry')}
                className={`px-3 py-1 rounded text-sm ${
                  mode === 'geometry' ? 'bg-[#007ACC] text-white' : 'text-[#808080] bg-[#3C3C3C] hover:text-[#CCCCCC]'
                }`}
              >
                Geometry
              </button>
              <button
                onClick={() => setMode('drawingImage')}
                className={`px-3 py-1 rounded text-sm ${
                  mode === 'drawingImage' ? 'bg-[#007ACC] text-white' : 'text-[#808080] bg-[#3C3C3C] hover:text-[#CCCCCC]'
                }`}
              >
                DrawingImage
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-[#808080] mb-4">
          將匯出 {files.length} 個圖示
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-sm text-[#CCCCCC] hover:bg-[#3F3F3F] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-1.5 rounded text-sm bg-[#007ACC] text-white hover:bg-[#1C8CD9] transition-colors"
          >
            匯出
          </button>
        </div>
      </div>
    </div>
  );
}
