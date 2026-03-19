import { useState, useCallback, useEffect } from 'react';
import { useAppState, useAppDispatch } from './store/AppContext';
import { Toolbar } from './components/Toolbar';
import { DropZone } from './components/DropZone';
import { PreviewGrid } from './components/PreviewGrid';
import { DetailPanel } from './components/DetailPanel';
import { StatusBar } from './components/StatusBar';
import { Toast } from './components/Toast';
import { ExportDialog } from './components/ExportDialog';
import { loadFilesFromDrop } from './utils/fileLoader';
import { convertSvgToXaml } from './converter';
import type { SvgFileEntry } from './types';

function App() {
  const { files } = useAppState();
  const dispatch = useAppDispatch();
  const [exportOpen, setExportOpen] = useState(false);

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

  // Global drag-and-drop handler for when files already exist
  useEffect(() => {
    if (files.length === 0) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer) return;
      const entries = await loadFilesFromDrop(e.dataTransfer);
      if (entries.length > 0) {
        await processFiles(entries);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [files.length, processFiles]);

  return (
    <div className="h-full flex flex-col">
      <Toolbar onExport={() => setExportOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        {files.length === 0 ? (
          <DropZone />
        ) : (
          <>
            <PreviewGrid />
            <DetailPanel />
          </>
        )}
      </div>

      <StatusBar />
      <Toast />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

export default App;
