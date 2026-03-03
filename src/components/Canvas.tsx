import { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// @ts-ignore — no types for bundled build
import ELK from 'elkjs/lib/elk.bundled.js';
import { useStore } from '../store';
import { InfraNode } from './NodeTypes/InfraNode';
import type { MeridiaModel } from '../types';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
const elk = new ELK();

const nodeTypes = { infra: InfraNode };

function getNodeColor(type: string): string {
  if (type.startsWith('k8s') || type === 'kubernetes_cluster' || type === 'cluster' || type === 'namespace') return '#7c3aed';
  if (['subnet', 'vlan', 'load_balancer', 'firewall', 'vpn_gateway', 'waf'].includes(type)) return '#0ea5e9';
  if (['virtual_machine', 'bare_metal', 'container', 'pod', 'deployment', 'service', 'ingress'].includes(type)) return '#10b981';
  if (['storage_volume', 'object_storage', 'block_storage', 'nfs_share', 'storage_block', 'database', 'cache'].includes(type)) return '#f59e0b';
  if (type.includes('site') || type === 'datacenter' || type === 'region' || type === 'vpc' || type === 'platform' || type === 'solution') return '#64748b';
  return '#3b82f6';
}

interface ElkNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkNode[];
}

async function runLayout(model: MeridiaModel): Promise<ElkNode> {
  // Build a set of child IDs so we can detect top-level nodes
  const childIds = new Set<string>();
  for (const n of model.nodes) {
    if (n.children) {
      for (const c of n.children) childIds.add(c);
    }
  }

  // Only put truly top-level nodes at the root (nodes that have no parent)
  // We flatten the hierarchy for ELK to avoid nested layout complexity
  const elkNodes = model.nodes.map((n) => ({
    id: n.id,
    width: 160,
    height: 60,
  }));

  const elkEdges = (model.relationships || []).map((r) => ({
    id: r.id,
    sources: [r.source],
    targets: [r.target],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return elk.layout(graph) as Promise<ElkNode>;
}

export function Canvas() {
  const { model } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    runLayout(model)
      .then((layout) => {
        const rfNodes: Node[] = [];
        const rfEdges: Edge[] = (model.relationships || []).map((r) => ({
          id: r.id,
          source: r.source,
          target: r.target,
          label: r.label ?? r.type,
          style: { stroke: '#475569' },
          labelStyle: { fill: '#94a3b8', fontSize: 10 },
        }));

        for (const elkNode of layout.children ?? []) {
          const modelNode = model.nodes.find((n) => n.id === elkNode.id);
          if (!modelNode) continue;

          rfNodes.push({
            id: elkNode.id,
            type: 'infra',
            position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
            data: {
              label: modelNode.label,
              type: modelNode.type,
              color: getNodeColor(modelNode.type),
            },
            style: {
              width: elkNode.width,
              height: elkNode.height,
            },
          });
        }

        setNodes(rfNodes);
        setEdges(rfEdges);
      })
      .catch(console.error);
  }, [model, setNodes, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background color="#1e293b" gap={20} />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          const color = (n.data as { color?: string }).color;
          return color ?? '#3b82f6';
        }}
      />
    </ReactFlow>
  );
}
