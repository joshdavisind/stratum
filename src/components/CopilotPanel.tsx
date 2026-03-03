import { useState } from 'react';
import { useStore } from '../store';
import { callCopilot, applyDiff, loadConfig, saveConfig, CopilotConfig } from '../lib/copilot';
import { MeridiaModel } from '../types';

export function CopilotPanel({ onClose }: { onClose: () => void }) {
  const { model, setJsonText } = useStore();
  const [config, setConfig] = useState<CopilotConfig>(loadConfig);
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [lastExplanation, setLastExplanation] = useState('');
  const [lastWarnings, setLastWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<MeridiaModel[]>([]);

  async function handleSend() {
    if (!instruction.trim() || !config.endpoint) return;
    setStatus('loading');
    setLastExplanation('');
    setLastWarnings([]);
    try {
      setHistory(h => [...h, model]);
      const result = await callCopilot(config, model, instruction);
      const newModel = applyDiff(model, result.diff);
      setJsonText(JSON.stringify(newModel, null, 2));
      setLastExplanation(result.explanation ?? '');
      setLastWarnings(result.warnings ?? []);
      setInstruction('');
      setStatus('done');
    } catch (e) {
      setLastExplanation(`Error: ${(e as Error).message}`);
      setStatus('error');
    }
  }

  function handleUndo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setJsonText(JSON.stringify(prev, null, 2));
    setStatus('idle');
    setLastExplanation('');
  }

  function updateConfig(updates: Partial<CopilotConfig>) {
    const next = { ...config, ...updates };
    setConfig(next);
    saveConfig(next);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="font-semibold text-blue-400 text-xs tracking-wider">✦ COPILOT</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
      </div>

      {/* Config */}
      <div className="px-3 py-2 border-b border-gray-800 space-y-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Provider</label>
          <select
            value={config.endpointType}
            onChange={e => updateConfig({ endpointType: e.target.value as CopilotConfig['endpointType'] })}
            className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-700"
          >
            <option value="ollama">Ollama (local)</option>
            <option value="gaia">Gaia (cloud)</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            {config.endpointType === 'ollama' ? 'Ollama URL' : 'Endpoint URL'}
          </label>
          <input
            value={config.endpoint}
            onChange={e => updateConfig({ endpoint: e.target.value })}
            placeholder={config.endpointType === 'ollama' ? 'http://localhost:11434' : 'https://…'}
            className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-700 placeholder-gray-600"
          />
        </div>
        {config.endpointType === 'ollama' && (
          <div>
            <label className="text-xs text-gray-500 block mb-1">Model</label>
            <input
              value={config.model}
              onChange={e => updateConfig({ model: e.target.value })}
              placeholder="qwen2.5:7b-instruct"
              className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-700 placeholder-gray-600"
            />
          </div>
        )}
      </div>

      {/* Instruction */}
      <div className="flex-1 flex flex-col px-3 py-2 gap-2">
        <label className="text-xs text-gray-500">Instruction</label>
        <textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
          placeholder="Add a Redis cache connected to the app server…"
          rows={4}
          className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-700 placeholder-gray-600 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={status === 'loading' || !config.endpoint || !instruction.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs py-1.5 rounded transition-colors"
          >
            {status === 'loading' ? 'Thinking…' : 'Send (⌘↵)'}
          </button>
          {history.length > 0 && (
            <button
              onClick={handleUndo}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded"
            >
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      {lastExplanation && (
        <div className={`mx-3 mb-3 p-2 rounded text-xs leading-relaxed ${
          status === 'error'
            ? 'bg-red-950 text-red-300 border border-red-800'
            : 'bg-gray-800 text-gray-300 border border-gray-700'
        }`}>
          {lastExplanation}
          {lastWarnings.length > 0 && (
            <ul className="mt-1 text-yellow-400 space-y-0.5">
              {lastWarnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
