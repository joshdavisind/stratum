import { Editor } from './components/Editor';
import { Canvas } from './components/Canvas';
import { StatusBar } from './components/StatusBar';
import { useStore } from './store';

export function App() {
  const { model } = useStore();
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="font-bold text-sm tracking-wider text-blue-400">STRATUM</span>
        <span className="ml-3 text-gray-400 text-sm">{model.metadata.title}</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/5 border-r border-gray-800 flex flex-col">
          <Editor />
        </div>
        <div className="flex-1">
          <Canvas />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
