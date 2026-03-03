import { Handle, Position } from '@xyflow/react';

interface GroupNodeData {
  label: string;
  type: string;
  color: string;
}

export function GroupNode({ data }: { data: GroupNodeData }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 8,
        border: `1.5px solid ${data.color}44`,
        backgroundColor: data.color + '0d',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Label bar at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '5px 10px',
          borderRadius: '6px 6px 0 0',
          backgroundColor: data.color + '22',
          borderBottom: `1px solid ${data.color}33`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: data.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: data.color,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.label}
        </span>
        <span
          style={{
            fontSize: 8,
            color: data.color + '99',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          {data.type}
        </span>
      </div>

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: data.color, zIndex: 20, width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: data.color, zIndex: 20, width: 8, height: 8 }}
      />
    </div>
  );
}
