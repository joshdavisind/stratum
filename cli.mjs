#!/usr/bin/env node
/**
 * Stratum CLI — Node.js SVG renderer for Meridia infrastructure diagrams
 *
 * Usage:
 *   node cli.mjs validate <model.json>
 *   node cli.mjs render <model.json> [--output file.svg]
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import ELK from 'elkjs/lib/elk.bundled.js';

// ─── Color map ────────────────────────────────────────────────────────────────

function nodeColor(type) {
  if (!type) return '#3b82f6';
  if (['kubernetes_cluster', 'cluster', 'namespace', 'k8s_cluster'].includes(type) || type.startsWith('k8s')) return '#7c3aed';
  if (['subnet', 'vlan', 'load_balancer', 'firewall', 'vpn_gateway', 'waf', 'pub_subnet', 'priv_subnet', 'data_subnet', 'alb', 'network_zone'].includes(type)) return '#0ea5e9';
  if (['virtual_machine', 'bare_metal', 'container', 'pod', 'deployment', 'service', 'ingress'].includes(type)) return '#10b981';
  if (['storage_volume', 'object_storage', 'block_storage', 'nfs_share', 'storage_block'].includes(type)) return '#f59e0b';
  if (['database', 'cache', 'message_queue', 'data_warehouse'].includes(type)) return '#ec4899';
  if (['site', 'datacenter', 'region', 'vpc', 'platform', 'solution', 'availability_zone', 'colocation_facility'].includes(type) || type.includes('site') || type === 'vpc') return '#64748b';
  return '#3b82f6';
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Build parent map ─────────────────────────────────────────────────────────

function buildParentMap(model) {
  const parentOf = new Map(); // childId → parentId
  for (const n of model.nodes) {
    for (const cid of (n.children || [])) parentOf.set(cid, n.id);
  }
  return parentOf;
}

// ─── Compound ELK graph ───────────────────────────────────────────────────────

function buildElkNode(node, nodeMap, level) {
  const isGroup = (node.children || []).length > 0;
  if (!isGroup) return { id: node.id, width: 160, height: 56 };

  const direction = level % 2 === 0 ? 'RIGHT' : 'DOWN';
  const topPad = 32;

  return {
    id: node.id,
    children: (node.children || [])
      .map(cid => nodeMap.get(cid))
      .filter(Boolean)
      .map(c => buildElkNode(c, nodeMap, level + 1)),
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': '28',
      'elk.padding': `[top=${topPad},left=16,bottom=16,right=16]`,
    },
  };
}

async function layoutModel(elk, model) {
  const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
  const parentOf = buildParentMap(model);
  const topLevel = model.nodes.filter(n => !parentOf.has(n.id));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    },
    children: topLevel.map(n => buildElkNode(n, nodeMap, 0)),
    edges: (model.relationships || []).map(r => ({ id: r.id, sources: [r.source], targets: [r.target] })),
  };

  return elk.layout(graph);
}

// ─── Flatten ELK to absolute positions ───────────────────────────────────────

function flattenElk(elkNode, model, results, offsetX = 0, offsetY = 0) {
  if (elkNode.id === 'root') {
    const rootOffX = 0;
    const rootOffY = 0;
    for (const child of elkNode.children || []) flattenElk(child, model, results, rootOffX, rootOffY);
    return;
  }

  const absX = offsetX + (elkNode.x || 0);
  const absY = offsetY + (elkNode.y || 0);
  const modelNode = model.nodes.find(n => n.id === elkNode.id);

  results.push({
    id: elkNode.id,
    x: absX,
    y: absY,
    width: elkNode.width || 160,
    height: elkNode.height || 56,
    isGroup: (elkNode.children || []).length > 0,
    label: modelNode?.label || elkNode.id,
    type: modelNode?.type || '',
    color: nodeColor(modelNode?.type),
  });

  for (const child of elkNode.children || []) {
    flattenElk(child, model, results, absX, absY);
  }
}

// ─── Orthogonal border-to-border edge routing ─────────────────────────────────
// Routes from the appropriate border of the source node to the target node,
// using an L-shaped elbow connector. Ignores ELK sections (compound graph edge
// sections have coordinate-space issues) and computes clean paths directly
// from absolute node positions.

function routeEdge(src, tgt) {
  const srcCx = src.x + src.width / 2;
  const srcCy = src.y + src.height / 2;
  const tgtCx = tgt.x + tgt.width / 2;
  const tgtCy = tgt.y + tgt.height / 2;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;

  let x1, y1, x2, y2;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Primarily horizontal
    if (dx >= 0) {
      x1 = src.x + src.width; y1 = srcCy;
      x2 = tgt.x;             y2 = tgtCy;
    } else {
      x1 = src.x;             y1 = srcCy;
      x2 = tgt.x + tgt.width; y2 = tgtCy;
    }
  } else {
    // Primarily vertical
    if (dy >= 0) {
      x1 = srcCx; y1 = src.y + src.height;
      x2 = tgtCx; y2 = tgt.y;
    } else {
      x1 = srcCx; y1 = src.y;
      x2 = tgtCx; y2 = tgt.y + tgt.height;
    }
  }

  // L-shaped elbow: horizontal segment first, then vertical
  const midX = (x1 + x2) / 2;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} `
       + `L${midX.toFixed(1)},${y1.toFixed(1)} `
       + `L${midX.toFixed(1)},${y2.toFixed(1)} `
       + `L${x2.toFixed(1)},${y2.toFixed(1)}`;
}

// ─── SVG generation ───────────────────────────────────────────────────────────

function generateSVG(layout, model) {
  const nodePositions = [];
  flattenElk(layout, model, nodePositions);

  // Canvas size
  const maxX = nodePositions.reduce((m, n) => Math.max(m, n.x + n.width), 0);
  const maxY = nodePositions.reduce((m, n) => Math.max(m, n.y + n.height), 0);
  const width = Math.max(900, maxX + 40);
  const height = Math.max(400, maxY + 40);

  const MARGIN = 8; // padding inside SVG root

  // Groups first (rendered behind leaf nodes)
  const groupsSVG = nodePositions
    .filter(n => n.isGroup)
    .map(n => {
      const { x, y, width: w, height: h, color, label, type: t } = n;
      const px = x + MARGIN;
      const py = y + MARGIN;
      return `
  <g id="${n.id}">
    <rect x="${px}" y="${py}" width="${w}" height="${h}" rx="8" ry="8"
          fill="${color}10" stroke="${color}55" stroke-width="1.5"/>
    <rect x="${px}" y="${py}" width="${w}" height="28" rx="8" ry="8"
          fill="${color}22" stroke="none"/>
    <rect x="${px}" y="${py + 14}" width="${w}" height="14"
          fill="${color}22" stroke="none"/>
    <rect x="${px + 8}" y="${py + 9}" width="8" height="8" rx="2"
          fill="${color}"/>
    <text x="${px + 22}" y="${py + 19}"
          font-family="monospace" font-size="10" font-weight="700"
          fill="${color}" letter-spacing="0.05em">${escapeXml(label)}</text>
    <text x="${px + w - 6}" y="${py + 19}" text-anchor="end"
          font-family="monospace" font-size="8" fill="${color}88">${escapeXml(t)}</text>
  </g>`;
    }).join('');

  // Leaf nodes
  const leafSVG = nodePositions
    .filter(n => !n.isGroup)
    .map(n => {
      const { x, y, width: w, height: h, color, label, type: t } = n;
      const px = x + MARGIN;
      const py = y + MARGIN;
      const displayLabel = label.length > 22 ? label.substring(0, 21) + '…' : label;
      const displayType = t.length > 20 ? t.substring(0, 19) + '…' : t;
      return `
  <g id="${n.id}">
    <rect x="${px}" y="${py}" width="${w}" height="${h}" rx="6" ry="6"
          fill="${color}20" stroke="${color}" stroke-width="1.5"/>
    <text x="${px + w / 2}" y="${py + h / 2 - 6}" text-anchor="middle"
          font-family="monospace" font-size="11" font-weight="600"
          fill="${color}">${escapeXml(displayLabel)}</text>
    <text x="${px + w / 2}" y="${py + h / 2 + 9}" text-anchor="middle"
          font-family="monospace" font-size="8" fill="#94a3b8">${escapeXml(displayType)}</text>
  </g>`;
    }).join('');

  // Use model relationships directly — route via absolute node positions
  // (bypasses ELK compound-graph edge section coordinate issues)
  const posMap = new Map(nodePositions.map(n => [n.id, { ...n, x: n.x + MARGIN, y: n.y + MARGIN }]));

  const edgesSVG = (model.relationships || []).map(rel => {
    const src = posMap.get(rel.source);
    const tgt = posMap.get(rel.target);
    if (!src || !tgt) return '';
    const isReplication = rel.type === 'replicates' || rel.type === 'syncs';
    const strokeColor = isReplication ? '#f59e0b' : '#475569';
    const dash = isReplication ? 'stroke-dasharray="6 3"' : '';
    const d = routeEdge(src, tgt);
    const label = rel.label || (isReplication ? 'replicates' : '');
    const edgeId = `e_${rel.id.replace(/[^a-z0-9]/gi, '_')}`;
    return `
  <path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="1.5" ${dash} marker-end="url(#arrow-${isReplication ? 'amber' : 'gray'})"/>
  ${label ? `<path id="${edgeId}" d="${d}" fill="none" stroke="none"/>
  <text font-family="monospace" font-size="9" fill="${strokeColor}cc">
    <textPath href="#${edgeId}" startOffset="50%" text-anchor="middle">${escapeXml(label)}</textPath>
  </text>` : ''}`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width + MARGIN * 2}" height="${height + MARGIN * 2 + 30}"
     viewBox="0 0 ${width + MARGIN * 2} ${height + MARGIN * 2 + 30}">
  <defs>
    <marker id="arrow-gray" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#475569"/>
    </marker>
    <marker id="arrow-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="16" y="20" font-family="monospace" font-size="12" font-weight="bold" fill="#60a5fa">${escapeXml(model.metadata?.title || 'Meridia Diagram')}</text>
  <g transform="translate(0, 28)">
${groupsSVG}
${edgesSVG}
${leafSVG}
  </g>
  <text x="${width + MARGIN}" y="${height + MARGIN * 2 + 24}" text-anchor="end"
        font-family="monospace" font-size="9" fill="#334155">rendered by stratum · meridia v${model.meridia || '1.0'}</text>
</svg>`;
}

// ─── CLI dispatch ─────────────────────────────────────────────────────────────

const [, , subcommand, modelArg, ...rest] = process.argv;

if (!subcommand || subcommand === '--help' || subcommand === 'help') {
  console.log(`stratum CLI\n\nUsage:\n  node cli.mjs render <model.json> [--output file.svg]\n  node cli.mjs validate <model.json>\n`);
  process.exit(0);
}

if (subcommand === 'validate') {
  console.log('Run: npm test (from the meridia repo)');
  process.exit(0);
}

if (subcommand === 'render') {
  if (!modelArg) { console.error('Error: model.json path required'); process.exit(1); }

  const outputFlag = rest.indexOf('--output');
  const outputFile = outputFlag >= 0 ? rest[outputFlag + 1] : null;

  let model;
  try { model = JSON.parse(readFileSync(resolve(modelArg), 'utf8')); }
  catch (e) { console.error(`Error reading model: ${e.message}`); process.exit(1); }

  const elk = new ELK();
  try {
    const layout = await layoutModel(elk, model);
    const svg = generateSVG(layout, model);
    if (outputFile) {
      writeFileSync(resolve(outputFile), svg, 'utf8');
      const groups = model.nodes.filter(n => (n.children || []).length > 0).length;
      const leaves = model.nodes.length - groups;
      console.error(`✓ Rendered ${leaves} nodes in ${groups} containers → ${outputFile}`);
    } else {
      process.stdout.write(svg);
    }
  } catch (e) {
    console.error(`Render error: ${e.message}`);
    process.exit(1);
  }
}
