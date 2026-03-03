import { MeridiaModel } from './types';

export const defaultModel: MeridiaModel = {
  "meridia": "1.0",
  "metadata": {
    "title": "Production Platform with DR",
    "description": "Multi-site deployment with Kubernetes, managed database, and async DR replication",
    "created": "2026-03-03",
    "authors": ["Platform Team"],
    "tags": ["production", "dr", "kubernetes"]
  },
  "views": [
    {
      "id": "context",
      "label": "System Context",
      "level": 1
    },
    {
      "id": "topology",
      "label": "Infrastructure Topology",
      "level": 2,
      "scope": "platform"
    },
    {
      "id": "k8s-detail",
      "label": "Production Kubernetes Detail",
      "level": 3,
      "scope": "prod-cluster"
    }
  ],
  "nodes": [
    {
      "id": "platform",
      "type": "solution",
      "label": "Production Platform",
      "children": ["primary-site", "dr-site"]
    },
    {
      "id": "users",
      "type": "actor",
      "label": "End Users"
    },
    {
      "id": "corp-ad",
      "type": "external_system",
      "label": "Corporate Active Directory"
    },
    {
      "id": "salesforce",
      "type": "external_system",
      "label": "Salesforce"
    },
    {
      "id": "primary-site",
      "type": "site",
      "group": true,
      "label": "Primary Datacenter",
      "children": ["prod-vpc"],
      "metadata": {
        "location": "US-East (Virginia)",
        "provider": "AWS",
        "tier": "Production"
      }
    },
    {
      "id": "prod-vpc",
      "type": "vpc",
      "group": true,
      "label": "Production VPC",
      "children": ["pub-subnet", "priv-subnet", "data-subnet"],
      "metadata": { "cidr": "10.0.0.0/16" }
    },
    {
      "id": "pub-subnet",
      "type": "subnet",
      "group": true,
      "label": "Public Subnet",
      "children": ["prod-alb", "prod-waf"],
      "metadata": { "cidr": "10.0.1.0/24" }
    },
    {
      "id": "priv-subnet",
      "type": "subnet",
      "group": true,
      "label": "Private Subnet",
      "children": ["prod-cluster"],
      "metadata": { "cidr": "10.0.10.0/24" }
    },
    {
      "id": "data-subnet",
      "type": "subnet",
      "group": true,
      "label": "Data Subnet",
      "children": ["prod-db", "prod-cache", "prod-storage"],
      "metadata": { "cidr": "10.0.20.0/24" }
    },
    {
      "id": "prod-alb",
      "type": "load_balancer",
      "label": "Application Load Balancer"
    },
    {
      "id": "prod-waf",
      "type": "waf",
      "label": "Web Application Firewall"
    },
    {
      "id": "prod-cluster",
      "type": "cluster",
      "label": "Production EKS Cluster",
      "children": ["ns-production", "ns-monitoring"],
      "metadata": {
        "k8s_version": "1.29",
        "distribution": "EKS",
        "node_count": 6,
        "cni": "AWS VPC CNI"
      }
    },
    {
      "id": "prod-db",
      "type": "database",
      "label": "PostgreSQL Primary",
      "metadata": {
        "engine": "PostgreSQL 16",
        "mode": "primary",
        "storage": "500 GB gp3"
      }
    },
    {
      "id": "prod-cache",
      "type": "cache",
      "label": "Redis Cluster"
    },
    {
      "id": "prod-storage",
      "type": "storage_block",
      "label": "Block Storage"
    },
    {
      "id": "ns-production",
      "type": "namespace",
      "group": true,
      "label": "production",
      "children": ["api-deploy", "web-deploy", "api-svc", "api-ingress"]
    },
    {
      "id": "ns-monitoring",
      "type": "namespace",
      "group": true,
      "label": "monitoring",
      "children": ["prometheus-deploy", "grafana-deploy"]
    },
    {
      "id": "api-deploy",
      "type": "deployment",
      "label": "api-server",
      "metadata": { "replicas": 4 }
    },
    {
      "id": "web-deploy",
      "type": "deployment",
      "label": "web-frontend"
    },
    {
      "id": "api-svc",
      "type": "service",
      "label": "api-service"
    },
    {
      "id": "api-ingress",
      "type": "ingress",
      "label": "api-ingress"
    },
    {
      "id": "prometheus-deploy",
      "type": "deployment",
      "label": "Prometheus"
    },
    {
      "id": "grafana-deploy",
      "type": "deployment",
      "label": "Grafana"
    },
    {
      "id": "dr-site",
      "type": "site",
      "group": true,
      "label": "DR Datacenter",
      "children": ["dr-cluster", "dr-db", "dr-storage"],
      "metadata": {
        "location": "US-West (Oregon)",
        "provider": "AWS",
        "tier": "DR"
      }
    },
    {
      "id": "dr-cluster",
      "type": "cluster",
      "label": "DR EKS Cluster",
      "metadata": {
        "k8s_version": "1.29",
        "distribution": "EKS",
        "node_count": 3
      }
    },
    {
      "id": "dr-db",
      "type": "database",
      "label": "PostgreSQL Standby",
      "metadata": {
        "engine": "PostgreSQL 16",
        "mode": "standby"
      }
    },
    {
      "id": "dr-storage",
      "type": "storage_block",
      "label": "Block Storage (Replica)"
    }
  ],
  "relationships": [
    {
      "id": "r-users-platform",
      "source": "users",
      "target": "prod-alb",
      "type": "data_flow",
      "label": "HTTPS"
    },
    {
      "id": "r-waf-alb",
      "source": "prod-waf",
      "target": "prod-alb",
      "type": "data_flow",
      "label": "Filtered traffic"
    },
    {
      "id": "r-alb-cluster",
      "source": "prod-alb",
      "target": "api-ingress",
      "type": "data_flow",
      "label": "HTTP to ingress"
    },
    {
      "id": "r-ingress-svc",
      "source": "api-ingress",
      "target": "api-svc",
      "type": "data_flow",
      "label": "Route to service"
    },
    {
      "id": "r-svc-api",
      "source": "api-svc",
      "target": "api-deploy",
      "type": "data_flow",
      "label": "Load balanced pods"
    },
    {
      "id": "r-api-db",
      "source": "api-deploy",
      "target": "prod-db",
      "type": "data_flow",
      "label": "SQL queries"
    },
    {
      "id": "r-api-cache",
      "source": "api-deploy",
      "target": "prod-cache",
      "type": "data_flow",
      "label": "Cache reads/writes"
    },
    {
      "id": "r-platform-ad",
      "source": "api-deploy",
      "target": "corp-ad",
      "type": "auth",
      "label": "SAML SSO"
    },
    {
      "id": "r-platform-sf",
      "source": "api-deploy",
      "target": "salesforce",
      "type": "api_call",
      "label": "REST API"
    },
    {
      "id": "r-db-repl",
      "source": "prod-db",
      "target": "dr-db",
      "type": "replication",
      "label": "Streaming replication",
      "metadata": {
        "rpo": "< 1 min",
        "rto": "15 min",
        "mode": "asynchronous"
      }
    },
    {
      "id": "r-storage-repl",
      "source": "prod-storage",
      "target": "dr-storage",
      "type": "replication",
      "label": "Cross-region replication",
      "metadata": {
        "rpo": "15 min",
        "mode": "asynchronous"
      }
    },
    {
      "id": "r-site-vpn",
      "source": "primary-site",
      "target": "dr-site",
      "type": "vpn_tunnel",
      "label": "Site-to-site VPN",
      "metadata": {
        "encryption": "AES-256-GCM",
        "bandwidth": "1 Gbps"
      }
    },
    {
      "id": "r-prom-cluster",
      "source": "prometheus-deploy",
      "target": "prod-cluster",
      "type": "monitoring",
      "label": "Metrics scrape"
    }
  ]
};
