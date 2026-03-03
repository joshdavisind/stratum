import { Handle, Position } from '@xyflow/react';

interface InfraNodeData {
  label: string;
  type: string;
  color: string;
}

export function InfraNode({ data }: { data: InfraNodeData }) {
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs text-white shadow-md"
      style={{
        backgroundColor: data.color + '22',
        borderColor: data.color,
        minWidth: 120,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.color }} />
      <div className="font-semibold truncate">{data.label}</div>
      <div className="text-gray-400 truncate">{data.type}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: data.color }} />
    </div>
  );
}
