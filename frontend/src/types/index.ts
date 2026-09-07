// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst';
  avatar?: string;
  createdAt: string;
}

// ── Projects ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  riskScore: number;
  assetCount: number;
  findingCount: number;
  createdAt: string;
}

// ── Assets ────────────────────────────────────────────────────────────────────
export type AssetType = 'host' | 'domain' | 'ip' | 'webapp' | 'api' | 'cloud';
export type ExposureLevel = 'internet' | 'internal' | 'dmz';
export type AssetStatus = 'active' | 'inactive' | 'unknown';

export interface Port {
  number: number;
  protocol: 'tcp' | 'udp';
  service: string;
  state: 'open' | 'closed' | 'filtered';
}

export interface Asset {
  id: string;
  projectId: string;
  hostname: string;
  ip: string;
  type: AssetType;
  ports: Port[];
  technologies: string[];
  exposure: ExposureLevel;
  status: AssetStatus;
  riskScore: number;
  findingCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  authorized: boolean;
  lastSeen: string;
  createdAt: string;
  tags: string[];
  os?: string;
}

// ── Scans ─────────────────────────────────────────────────────────────────────
export type ScannerType = 'nmap' | 'nuclei';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScanOptions {
  portRange?: string;
  timing?: string;
  scanType?: string;
  templates?: string[];
  severity?: string[];
}

export interface Scan {
  id: string;
  projectId: string;
  assetId: string;
  assetHostname: string;
  scanner: ScannerType;
  status: ScanStatus;
  progress: number;
  options: ScanOptions;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  findingsCount?: number;
  newFindings?: number;
  createdBy: string;
  authorized: boolean;
}

// ── Vulnerabilities ───────────────────────────────────────────────────────────
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingStatus = 'open' | 'confirmed' | 'false_positive' | 'accepted_risk' | 'in_progress' | 'resolved';

export interface RiskBreakdown {
  baseSeverity: number;
  internetExposure: number;
  assetCriticality: number;
  total: number;
}

export interface StatusHistoryEntry {
  status: FindingStatus;
  changedBy: string;
  changedAt: string;
  note?: string;
}

export interface Finding {
  id: string;
  projectId: string;
  assetId: string;
  assetHostname: string;
  scanId: string;
  title: string;
  description: string;
  severity: Severity;
  status: FindingStatus;
  riskScore: number;
  riskBreakdown: RiskBreakdown;
  cve?: string;
  cvss?: number;
  scanner: ScannerType;
  evidence: string;
  technicalDetails: string;
  whyRisky: string;
  remediation: string;
  affectedService?: string;
  affectedPort?: number;
  assignedTo?: string;
  discoveredAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
  tags: string[];
}

// ── Attack Paths ──────────────────────────────────────────────────────────────
export interface AttackNode {
  id: string;
  type: 'internet' | 'asset' | 'service' | 'vulnerability' | 'target';
  label: string;
  riskScore?: number;
  severity?: Severity;
  x: number;
  y: number;
}

export interface AttackEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface AttackPath {
  id: string;
  projectId: string;
  name: string;
  description: string;
  riskScore: number;
  severity: Severity;
  entryPoint: string;
  target: string;
  hops: number;
  nodes: AttackNode[];
  edges: AttackEdge[];
  whyRisky: string;
  mitigations: string[];
  discoveredAt: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface ReportSummary {
  projectId: string;
  generatedAt: string;
  riskScore: number;
  totalAssets: number;
  activeAssets: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  resolvedCount: number;
  attackPathCount: number;
  topAttackPaths: AttackPath[];
  criticalFindings: Finding[];
  riskTrend: { date: string; score: number }[];
}

// ── UI State ──────────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
