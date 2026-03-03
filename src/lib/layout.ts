// @ts-ignore
import ELK from 'elkjs/lib/elk.bundled.js';
import type { MeridiaModel } from '../types';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
const elk = new ELK();

export interface ElkLayoutNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkLayoutNode[];
}

export async function computeLayout(model: MeridiaModel): Promise<ElkLayoutNode> {
  const elkNodes = model.nodes.map((n) => ({
    id: n.id,
    width: 160,
    height: 60,
  }));

  const elkEdges = (model.relationships ?? []).map((r) => ({
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
  return elk.layout(graph) as Promise<ElkLayoutNode>;
}
