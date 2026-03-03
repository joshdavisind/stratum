import type { MeridiaModel } from '../types';

export interface ValidationError {
  path: string;
  message: string;
}

export function validateModel(model: MeridiaModel): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!model.meridia) {
    errors.push({ path: 'meridia', message: 'Missing required field: meridia (version string)' });
  }

  if (!model.metadata?.title) {
    errors.push({ path: 'metadata.title', message: 'Missing required field: metadata.title' });
  }

  if (!Array.isArray(model.nodes) || model.nodes.length === 0) {
    errors.push({ path: 'nodes', message: 'Model must have at least one node' });
    return errors;
  }

  const nodeIds = new Set(model.nodes.map((n) => n.id));

  for (const node of model.nodes) {
    if (!node.id) errors.push({ path: `nodes[?].id`, message: 'Node missing id' });
    if (!node.type) errors.push({ path: `nodes[${node.id}].type`, message: 'Node missing type' });
    if (!node.label) errors.push({ path: `nodes[${node.id}].label`, message: 'Node missing label' });

    if (node.children) {
      for (const childId of node.children) {
        if (!nodeIds.has(childId)) {
          errors.push({
            path: `nodes[${node.id}].children`,
            message: `Child node "${childId}" not found in nodes array`,
          });
        }
      }
    }
  }

  for (const rel of model.relationships ?? []) {
    if (!nodeIds.has(rel.source)) {
      errors.push({
        path: `relationships[${rel.id}].source`,
        message: `Source node "${rel.source}" not found`,
      });
    }
    if (!nodeIds.has(rel.target)) {
      errors.push({
        path: `relationships[${rel.id}].target`,
        message: `Target node "${rel.target}" not found`,
      });
    }
  }

  return errors;
}
