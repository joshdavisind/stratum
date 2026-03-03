import { useStore } from '../store';

export function StatusBar() {
  const { model, parseError } = useStore();
  const nodeCount = model.nodes?.length ?? 0;
  const relCount = model.relationships?.length ?? 0;
  return (
    <div className="flex items-center gap-4 px-4 py-1 bg-blue-900/30 border-t border-gray-800 text-xs text-gray-400">
      <span>{nodeCount} nodes</span>
      <span>{relCount} relationships</span>
      {parseError ? (
        <span className="text-red-400">⚠ JSON parse error</span>
      ) : (
        <span className="text-green-400">✓ valid</span>
      )}
    </div>
  );
}
