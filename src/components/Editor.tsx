import MonacoEditor from '@monaco-editor/react';
import { useStore } from '../store';

export function Editor() {
  const { jsonText, setJsonText, parseError } = useStore();
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1 text-xs text-gray-500 bg-gray-900 border-b border-gray-800">
        meridia model · json
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language="json"
          theme="vs-dark"
          value={jsonText}
          onChange={(v) => setJsonText(v ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>
      {parseError && (
        <div className="px-3 py-1 text-xs text-red-400 bg-red-950 border-t border-red-800">
          ⚠ {parseError}
        </div>
      )}
    </div>
  );
}
