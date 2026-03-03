/**
 * Stratum CLI Renderer Test Suite (GOR-311)
 *
 * Tests the Node.js CLI renderer (cli.mjs) against the Meridia example model.
 * Verifies SVG output structure, dimensions, and graceful error handling.
 */

import { test, describe, expect, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, unlinkSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dir, '../cli.mjs');
const MERIDIA_EXAMPLE = join(__dir, '../../meridia/examples/multi-site-dr.json');
const OUTPUT_FILE = join(__dir, 'test-output.svg');

// Cleanup after all tests
afterAll(() => {
  if (existsSync(OUTPUT_FILE)) unlinkSync(OUTPUT_FILE);
});

describe('Stratum CLI renderer', () => {
  test('renders multi-site-dr.json to SVG without error', () => {
    const r = spawnSync('node', [CLI, 'render', MERIDIA_EXAMPLE, '--output', OUTPUT_FILE], {
      encoding: 'utf8',
      timeout: 30000,
    });
    expect(r.status).toBe(0);
    expect(existsSync(OUTPUT_FILE)).toBe(true);
  });

  test('output is valid XML (starts with <?xml)', () => {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    expect(content.startsWith('<?xml')).toBe(true);
  });

  test('output contains SVG root element', () => {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    expect(content).toContain('<svg');
    expect(content).toContain('</svg>');
  });

  test('output SVG contains node labels from model', () => {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    const model = JSON.parse(readFileSync(MERIDIA_EXAMPLE, 'utf8'));
    const firstNode = model.nodes[0];
    // First 10 chars of the label should appear in the SVG
    expect(content).toContain(firstNode.label.substring(0, 10));
  });

  test('output SVG dimensions are reasonable (> 400px wide)', () => {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    const widthMatch = content.match(/width="(\d+)"/);
    expect(widthMatch).toBeTruthy();
    expect(parseInt(widthMatch[1])).toBeGreaterThan(400);
  });

  test('output SVG contains arrow marker definition', () => {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    expect(content).toContain('marker');
    expect(content).toContain('arrow');
  });

  test('output SVG contains footer attribution', () => {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    expect(content).toContain('rendered by stratum');
  });

  test('output SVG contains all 27 nodes from multi-site-dr model', () => {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    // Count <g id="..."> elements — one per node (groups + leaves = 27 total)
    const nodeCount = (content.match(/<g id="/g) || []).length;
    expect(nodeCount).toBe(27);
  });

  test('CLI exits non-zero on missing model file', () => {
    const r = spawnSync('node', [CLI, 'render', 'nonexistent-model.json'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(r.status).toBe(1);
  });

  test('CLI shows help when called without arguments', () => {
    const r = spawnSync('node', [CLI], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('stratum CLI');
  });
});
