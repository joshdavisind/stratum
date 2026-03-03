/**
 * Stratum CLI — Fixture Rendering Tests (GOR-313)
 *
 * Edge case tests covering: single-node models, all color categories,
 * unicode/XML-special labels, nested groups, and large model performance.
 */

import { test, describe, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, unlinkSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dir, '../cli.mjs');
const FIXTURES = join(__dir, 'fixtures');

// ─── Large model generator (self-contained, no import) ────────────────────────

function generateLargeModel(nodeCount = 50) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: i % 3 === 0 ? 'virtual_machine' : i % 3 === 1 ? 'database' : 'subnet',
    label: `Component ${i}`,
  }));
  const relationships = Array.from({ length: Math.min(nodeCount - 1, 40) }, (_, i) => ({
    id: `rel-${i}`,
    type: 'uses',
    source: `node-${i}`,
    target: `node-${i + 1}`,
  }));
  return {
    meridia: '1.0',
    metadata: { title: 'Large Model Test' },
    nodes,
    relationships,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Stratum CLI — fixture rendering', () => {
  test('single-node model renders without crash', () => {
    const r = spawnSync('node', [CLI, 'render', join(FIXTURES, 'single-node.json')], {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('<svg');
    expect(r.stdout).toContain('My System');
  });

  test('all-color-categories model renders all 7 nodes', () => {
    const r = spawnSync('node', [CLI, 'render', join(FIXTURES, 'all-colors.json')], {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.status).toBe(0);
    // Verify color hex values appear for each category
    expect(r.stdout).toContain('#7c3aed'); // kubernetes purple
    expect(r.stdout).toContain('#0ea5e9'); // network blue
    expect(r.stdout).toContain('#10b981'); // compute green
    expect(r.stdout).toContain('#f59e0b'); // storage amber
    expect(r.stdout).toContain('#64748b'); // site gray
    expect(r.stdout).toContain('#ec4899'); // database pink
    expect(r.stdout).toContain('#3b82f6'); // default blue
  });

  test('unicode labels are XML-escaped in SVG output', () => {
    const r = spawnSync('node', [CLI, 'render', join(FIXTURES, 'unicode-labels.json')], {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.status).toBe(0);
    // & should be escaped to &amp; in SVG
    expect(r.stdout).toContain('&amp;');
    // < should be escaped
    expect(r.stdout).toContain('&lt;');
    // Non-ASCII unicode should pass through (or be preserved)
    expect(r.stdout).toContain('Syst'); // partial match for Système
  });

  test('nested groups model renders without crash', () => {
    const r = spawnSync('node', [CLI, 'render', join(FIXTURES, 'nested-groups.json')], {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('<svg');
  });

  test('large model (50 nodes) renders in under 10 seconds', () => {
    const tmp = join(FIXTURES, 'tmp-large.json');
    writeFileSync(tmp, JSON.stringify(generateLargeModel(50)));
    const start = Date.now();
    const r = spawnSync('node', [CLI, 'render', tmp], {
      encoding: 'utf8',
      timeout: 15000,
    });
    const elapsed = Date.now() - start;
    if (existsSync(tmp)) unlinkSync(tmp);
    expect(r.status).toBe(0);
    expect(elapsed).toBeLessThan(10000);
  });

  test('stdout mode (no --output) writes valid SVG to stdout', () => {
    const r = spawnSync('node', [CLI, 'render', join(FIXTURES, 'single-node.json')], {
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim().startsWith('<?xml')).toBe(true);
    expect(r.stdout).toContain('</svg>');
  });
});
