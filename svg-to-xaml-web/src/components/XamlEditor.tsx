import { lazy, Suspense } from 'react';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface XamlEditorProps {
  value: string;
  language?: string;
}

export function XamlEditor({ value, language = 'xml' }: XamlEditorProps) {
  return (
    <Suspense fallback={<div className="flex-1 bg-[#1E1E1E] flex items-center justify-center text-[#555]">載入編輯器...</div>}>
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        theme="vs-dark"
        options={{
          readOnly: true,
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: 'on',
          renderLineHighlight: 'none',
          folding: true,
          automaticLayout: true,
        }}
      />
    </Suspense>
  );
}
