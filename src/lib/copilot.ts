import { MeridiaModel, MeridiaNode, MeridiaRelationship } from '../types';

export interface CopilotConfig {
  endpoint: string;
  endpointType: 'ollama' | 'gaia' | 'custom';
  model: string;
}

export interface CopilotDiff {
  explanation?: string;
  diff: {
    add_nodes?: MeridiaNode[];
    add_relationships?: MeridiaRelationship[];
    update_nodes?: Array<{ id: string; changes: Partial<MeridiaNode> }>;
    remove_nodes?: string[];
    remove_relationships?: string[];
  };
  validation_passed?: boolean;
  warnings?: string[];
}

const SYSTEM_PROMPT = `You are a diagram editing assistant for Meridia infrastructure diagrams.

When given a Meridia JSON model and an instruction, respond with ONLY a JSON object:
{
  "explanation": "brief description of what you changed",
  "diff": {
    "add_nodes": [],
    "add_relationships": [],
    "update_nodes": [],
    "remove_nodes": [],
    "remove_relationships": []
  },
  "validation_passed": true,
  "warnings": []
}

Rules:
- Only use valid Meridia node types (e.g. virtual_machine, database, load_balancer, kubernetes_cluster, subnet, firewall, software_system, container, cache, message_queue, etc.)
- New node IDs must be unique snake_case strings not already in the model
- Relationship sources and targets must reference existing or newly added node IDs
- Keep diffs minimal — only change what was asked
- Respond with ONLY the JSON object — no markdown, no explanation outside the JSON`;

export async function callCopilot(
  config: CopilotConfig,
  currentModel: MeridiaModel,
  instruction: string
): Promise<CopilotDiff> {
  const userPrompt = `Current model:\n${JSON.stringify(currentModel, null, 2)}\n\nInstruction: ${instruction}`;

  let responseText: string;

  if (config.endpointType === 'ollama') {
    const res = await fetch(`${config.endpoint.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    responseText = data.message?.content ?? data.response ?? '';
  } else {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standard: 'meridia', model: config.model, instruction, currentModel }),
    });
    if (!res.ok) throw new Error(`Copilot error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    responseText = typeof data === 'string' ? data : JSON.stringify(data);
  }

  const cleaned = responseText.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(cleaned) as CopilotDiff;
}

export function applyDiff(model: MeridiaModel, diff: CopilotDiff['diff']): MeridiaModel {
  let nodes = [...(model.nodes ?? [])];
  let relationships = [...(model.relationships ?? [])];

  const removeNodeIds = new Set(diff.remove_nodes ?? []);
  nodes = nodes.filter(n => !removeNodeIds.has(n.id));

  const removeRelIds = new Set(diff.remove_relationships ?? []);
  relationships = relationships.filter(r => !removeRelIds.has(r.id));

  for (const update of (diff.update_nodes ?? [])) {
    const idx = nodes.findIndex(n => n.id === update.id);
    if (idx >= 0) nodes[idx] = { ...nodes[idx], ...update.changes };
  }

  const existingIds = new Set(nodes.map(n => n.id));
  for (const node of (diff.add_nodes ?? [])) {
    if (!existingIds.has(node.id)) { nodes.push(node); existingIds.add(node.id); }
  }

  const existingRelIds = new Set(relationships.map(r => r.id));
  for (const rel of (diff.add_relationships ?? [])) {
    if (!existingRelIds.has(rel.id)) relationships.push(rel);
  }

  return { ...model, nodes, relationships };
}

export const CONFIG_KEY = 'stratum_copilot_config';

export function loadConfig(): CopilotConfig {
  try {
    const s = localStorage.getItem(CONFIG_KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return { endpoint: '', endpointType: 'ollama', model: 'qwen2.5:7b-instruct' };
}

export function saveConfig(config: CopilotConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
