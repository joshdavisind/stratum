export interface MeridiaMetadata {
  title: string;
  description?: string;
  created?: string;
  authors?: string[];
  tags?: string[];
}

export interface MeridiaNode {
  id: string;
  type: string;
  label: string;
  children?: string[];
  group?: boolean;
  parent?: string;
  metadata?: Record<string, unknown>;
  typeHint?: string;
}

export interface MeridiaRelationship {
  id: string;
  type: string;
  source: string;
  target: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface MeridiaView {
  id: string;
  label: string;
  level?: number;
  scope?: string;
  include?: string[];
  exclude?: string[];
  scenario?: boolean;
}

export interface MeridiaModel {
  meridia: string;
  metadata: MeridiaMetadata;
  nodes: MeridiaNode[];
  relationships?: MeridiaRelationship[];
  views?: MeridiaView[];
}
