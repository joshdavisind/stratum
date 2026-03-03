import { useState } from 'react';
import { Editor } from './components/Editor';
import { Canvas } from './components/Canvas';
import { StatusBar } from './components/StatusBar';
import { CopilotPanel } from './components/CopilotPanel';
import { useStore } from './store';

export function App() {
  const { model } = useStore();
  const [showCopilot, setShowCopilot] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="font-bold text-sm tracking-wider text-blue-400">STRATUM</span>
        <span className="ml-3 text-gray-400 text-sm truncate">{model.metadata.title}</span>
        <button
          onClick={() => setShowCopilot(v => !v)}
          className={`ml-auto px-3 py-1 text-xs rounded transition-colors ${
            showCopilot
              ? 'bg-blue-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          ✦ Copilot
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/5 border-r border-gray-800 flex flex-col">
          <Editor />
        </div>
        <div className="flex-1 overflow-hidden">
          <Canvas />
        </div>
        {showCopilot && (
          <div className="w-72 flex-shrink-0">
            <CopilotPanel onClose={() => setShowCopilot(false)} />
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
}
