#!/usr/bin/env node
/**
 * Stratum CLI — Node.js SVG renderer for Meridia infrastructure diagrams
 *
 * Usage:
 *   node cli.mjs validate <model.json>   Validate a Meridia model
 *   node cli.mjs render <model.json> [--output file.svg]   Render to SVG
 *
 * Exit codes:
 *   0 — success
 *   1 — error
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import ELK from 'elkjs/lib/elk.bundled.js';

// ─── Color map ────────────────────────────────────────────────────────────────

function nodeColor(type) {
  if (!type) return '#3b82f6';
  if (type.startsWith('k8s') || type === 'kubernetes_cluster') return '#7c3aed';
  if (['subnet', 'vlan', 'load_balancer', 'firewall', 'vpn_gateway', 'network_zone'].includes(type)) return '#0ea5e9';
  if (['virtual_machine', 'bare_metal', 'container', 'pod', 'compute_cluster'].includes(type)) return '#10b981';
  if (['storage_volume', 'object_storage', 'block_storage', 'nfs_share', 'storage_array'].includes(type)) return '#f59e0b';
  if (['site', 'datacenter', 'region', 'availability_zone', 'colocation_facility'].includes(type)) return '#64748b';
  if (['database', 'cache', 'message_queue', 'data_warehouse'].includes(type)) return '#ec4899';
  return '#3b82f6';
}

// ─── XML escape ───────────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── ELK layout ───────────────────────────────────────────────────────────────

async function layoutModel(elk, model) {
  const children = model.nodes.map(n => ({
    id: n.id,
    width: 180,
    height: 60,
    labels: [{ text: n.label }],
  }));

  const edges = (model.relationships || []).map(r => ({
    id: r.id,
    sources: [r.source],
    targets: [r.target],
    labels: r.label ? [{ text: r.label }] : [],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '50',
      'elk.layered.spacing.nodeNodeBetweenLayers': '70',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children,
    edges,
  };

  return elk.layout(graph);
}

// ─── SVG generation ───────────────────────────────────────────────────────────

function generateSVG(layout, model) {
  const nodeMap = new Map(model.nodes.map(n => [n.id, n]));

  const nodes = layout.children || [];
  const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => (n.x || 0) + (n.width || 180))) + 60 : 800;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => (n.y || 0) + (n.height || 60))) + 60 : 400;
  const width = Math.max(800, maxX + 40);
  const height = Math.max(400, maxY + 40);

  const nodesSVG = nodes.map(elkNode => {
    const modelNode = nodeMap.get(elkNode.id);
    const x = (elkNode.x || 0) + 20;
    const y = (elkNode.y || 0) + 20;
    const w = elkNode.width || 180;
    const h = elkNode.height || 60;
    const color = nodeColor(modelNode?.type);
    const label = (modelNode?.label || elkNode.id).substring(0, 24);
    const typeLabel = (modelNode?.type || '').substring(0, 20);

    return `  <g class="node" id="${elkNode.id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="${color}22" stroke="${color}" stroke-width="1.5"/>
    <text x="${x + w / 2}" y="${y + h / 2 - 6}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="11" font-weight="600" fill="${color}">${escapeXml(label)}</text>
    <text x="${x + w / 2}" y="${y + h / 2 + 10}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="9" fill="#94a3b8">${escapeXml(typeLabel)}</text>
  </g>`;
  }).join('\n');

  const edges = layout.edges || [];
  const edgesSVG = edges.map(edge => {
    const srcNode = nodes.find(n => n.id === edge.sources?.[0]);
    const tgtNode = nodes.find(n => n.id === edge.targets?.[0]);
    if (!srcNode || !tgtNode) return '';

    const x1 = (srcNode.x || 0) + (srcNode.width || 180) / 2 + 20;
    const y1 = (srcNode.y || 0) + (srcNode.height || 60) + 20;
    const x2 = (tgtNode.x || 0) + (tgtNode.width || 180) / 2 + 20;
    const y2 = (tgtNode.y || 0) + 20;

    const modelRel = model.relationships?.find(r => r.id === edge.id);
    const edgeLabel = modelRel?.label || modelRel?.type || '';

    return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
  ${edgeLabel ? `<text x="${(x1 + x2) / 2 + 4}" y="${(y1 + y2) / 2}" font-family="monospace" font-size="9" fill="#64748b">${escapeXml(edgeLabel)}</text>` : ''}`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#475569"/>
    </marker>
  </defs>
  <rect width="${width}" height="${height}" fill="#0f172a"/>
  <!-- Title -->
  <text x="20" y="22" font-family="monospace" font-size="12" font-weight="bold" fill="#60a5fa">${escapeXml(model.metadata?.title || 'Meridia Diagram')}</text>
  <!-- Edges (behind nodes) -->
${edgesSVG}
  <!-- Nodes -->
${nodesSVG}
  <!-- Footer -->
  <text x="${width - 10}" y="${height - 8}" text-anchor="end" font-family="monospace" font-size="9" fill="#334155">rendered by stratum · meridia v${model.meridia || '1.0'}</text>
</svg>`;
}

// ─── CLI dispatch ─────────────────────────────────────────────────────────────

const [, , subcommand, modelArg, ...rest] = process.argv;

if (!subcommand || subcommand === '--help' || subcommand === 'help') {
  console.log(`stratum CLI

Usage:
  node cli.mjs validate <model.json>              Validate a Meridia model
  node cli.mjs render <model.json> [--output file.svg]  Render to SVG

Options:
  --output <file>   Write output to file (default: stdout)
  --help            Show this help
`);
  process.exit(0);
}

if (subcommand === 'validate') {
  if (!modelArg) {
    console.error('Error: model.json path required');
    process.exit(1);
  }
  // Delegate to the meridia validator via child process
  const { spawnSync } = await import('child_process');
  const { dirname, join } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dir = dirname(fileURLToPath(import.meta.url));
  const validatorPath = join(__dir, '..', 'meridia', 'spec', 'schema', 'validate.mjs');
  const result = spawnSync('node', [validatorPath, resolve(modelArg)], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

if (subcommand === 'render') {
  if (!modelArg) {
    console.error('Error: model.json path required');
    process.exit(1);
  }

  const outputFlag = rest.indexOf('--output');
  const outputFile = outputFlag >= 0 ? rest[outputFlag + 1] : null;

  let model;
  try {
    model = JSON.parse(readFileSync(resolve(modelArg), 'utf8'));
  } catch (e) {
    console.error(`Error reading model: ${e.message}`);
    process.exit(1);
  }

  const elk = new ELK();

  try {
    const layout = await layoutModel(elk, model);
    const svg = generateSVG(layout, model);

    if (outputFile) {
      writeFileSync(resolve(outputFile), svg, 'utf8');
      console.error(`✓ Rendered ${model.nodes?.length || 0} nodes → ${outputFile}`);
    } else {
      process.stdout.write(svg);
    }
  } catch (e) {
    console.error(`Render error: ${e.message}`);
    process.exit(1);
  }
} else if (subcommand !== 'validate') {
  console.error(`Unknown subcommand: ${subcommand}`);
  console.error('Run "node cli.mjs --help" for usage.');
  process.exit(1);
}
