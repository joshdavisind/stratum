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
// @ts-ignore
import ELK from 'elkjs/lib/elk.bundled.js';
import { useStore } from '../store';
import { InfraNode } from './NodeTypes/InfraNode';
import { GroupNode } from './NodeTypes/GroupNode';
import type { MeridiaModel, MeridiaNode } from '../types';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const elk = new ELK();

const nodeTypes = { infra: InfraNode, group: GroupNode };

export function getNodeColor(type: string): string {
  if (['kubernetes_cluster', 'cluster', 'namespace', 'k8s_cluster'].includes(type) || type.startsWith('k8s')) return '#7c3aed';
  if (['subnet', 'vlan', 'load_balancer', 'firewall', 'vpn_gateway', 'waf', 'pub_subnet', 'priv_subnet', 'data_subnet', 'alb'].includes(type)) return '#0ea5e9';
  if (['virtual_machine', 'bare_metal', 'container', 'pod', 'deployment', 'service', 'ingress'].includes(type)) return '#10b981';
  if (['storage_volume', 'object_storage', 'block_storage', 'nfs_share', 'storage_block'].includes(type)) return '#f59e0b';
  if (['database', 'cache', 'message_queue', 'data_warehouse'].includes(type)) return '#ec4899';
  if (['site', 'datacenter', 'region', 'vpc', 'platform', 'solution', 'availability_zone', 'colocation_facility'].includes(type) || type.includes('site') || type === 'vpc') return '#64748b';
  return '#3b82f6';
}

interface ElkNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkNode[];
  edges?: ElkEdge[];
  layoutOptions?: Record<string, string>;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

// Build parent→children map from the model
function buildParentMap(model: MeridiaModel): Map<string, string> {
  const parentOf = new Map<string, string>(); // childId → parentId
  for (const n of model.nodes) {
    for (const childId of (n.children ?? [])) {
      parentOf.set(childId, n.id);
    }
  }
  return parentOf;
}

// Recursively build an ELK node with nested children
function buildElkNode(
  node: MeridiaNode,
  nodeMap: Map<string, MeridiaNode>,
  level: number,
): ElkNode {
  const isGroup = (node.children?.length ?? 0) > 0;

  if (!isGroup) {
    return { id: node.id, width: 160, height: 56 };
  }

  const elkChildren: ElkNode[] = (node.children ?? [])
    .map(cid => nodeMap.get(cid))
    .filter((c): c is MeridiaNode => c !== undefined)
    .map(c => buildElkNode(c, nodeMap, level + 1));

  // Direction alternates by level: even=RIGHT (sites side-by-side), odd=DOWN (zones stacked)
  const direction = level % 2 === 0 ? 'RIGHT' : 'DOWN';
  const topPad = 36; // room for the label

  return {
    id: node.id,
    children: elkChildren,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': '32',
      'elk.padding': `[top=${topPad},left=16,bottom=16,right=16]`,
    },
  };
}

async function runLayout(model: MeridiaModel): Promise<ElkNode> {
  const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
  const parentOf = buildParentMap(model);

  // Top-level nodes: not a child of any other node
  const topLevel = model.nodes.filter(n => !parentOf.has(n.id));

  const elkChildren = topLevel.map(n => buildElkNode(n, nodeMap, 0));

  // All edges at root level — ELK handles cross-container routing
  const elkEdges: ElkEdge[] = (model.relationships ?? []).map(r => ({
    id: r.id,
    sources: [r.source],
    targets: [r.target],
  }));

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.padding': '[top=20,left=20,bottom=20,right=20]',
    },
    children: elkChildren,
    edges: elkEdges,
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return elk.layout(graph) as Promise<ElkNode>;
}

// Flatten ELK compound output to React Flow nodes (BFS so parents appear before children)
function flattenElk(
  elkNode: ElkNode,
  model: MeridiaModel,
  rfNodes: Node[],
  parentId?: string,
): void {
  if (elkNode.id === 'root') {
    for (const child of elkNode.children ?? []) flattenElk(child, model, rfNodes, undefined);
    return;
  }

  const modelNode = model.nodes.find(n => n.id === elkNode.id);
  if (!modelNode) return;

  const isGroup = (elkNode.children?.length ?? 0) > 0;
  const color = getNodeColor(modelNode.type);

  rfNodes.push({
    id: elkNode.id,
    type: isGroup ? 'group' : 'infra',
    position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
    ...(parentId ? { parentId, extent: 'parent' as const } : {}),
    data: { label: modelNode.label, type: modelNode.type, color },
    style: {
      width: elkNode.width,
      height: elkNode.height,
      // group nodes: let the GroupNode component draw the background
      ...(isGroup ? { background: 'transparent', border: 'none' } : {}),
    },
    zIndex: isGroup ? 0 : 10,
  });

  for (const child of elkNode.children ?? []) {
    flattenElk(child, model, rfNodes, elkNode.id);
  }
}

export function Canvas() {
  const { model } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    runLayout(model)
      .then((layout) => {
        const rfNodes: Node[] = [];
        flattenElk(layout, model, rfNodes);

        const rfEdges: Edge[] = (model.relationships ?? []).map(r => {
          const isReplication = r.type === 'replicates' || r.type === 'syncs';
          return {
            id: r.id,
            source: r.source,
            target: r.target,
            type: 'smoothstep',
            animated: isReplication,
            label: r.label ?? (isReplication ? r.type : undefined),
            style: {
              stroke: isReplication ? '#f59e0b' : '#64748b',
              strokeDasharray: isReplication ? '6 3' : undefined,
              strokeWidth: 1.5,
            },
            labelStyle: { fill: '#94a3b8', fontSize: 9 },
            labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
          };
        });

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
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.1}
    >
      <Background color="#1e293b" gap={20} />
      <Controls />
      <MiniMap
        nodeColor={n => ((n.data as { color?: string }).color ?? '#3b82f6')}
        style={{ background: '#0f172a' }}
      />
    </ReactFlow>
  );
}
