import type { Asset, Finding, Project, Scan, User, AttackPath } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface RiskOverview {
  score: number;
  explanation: string;
  totalAssets: number;
  activeAssets: number;
  totalFindings: number;
  openFindings: number;
  breakdown: Record<string, number>;
}

export interface BackendReport {
  id: string;
  projectId: string;
  reportType: string;
  generatedAt: string;
  project: Project;
  risk: RiskOverview;
  executive: { headline: string; priority: string };
  technical: { findings: Finding[]; assets: Asset[] };
  attackPaths: AttackPath[];
}

export const getStoredUser = (): User | null => {
  const value = localStorage.getItem('nexavise_user');
  if (!value) return null;
  try { return JSON.parse(value) as User; } catch { return null; }
};

export const logout = () => api<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' });

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = getStoredUser();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { 'X-User-Id': user.id } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data as T;
}

export const getProjects = () => api<Project[]>('/api/projects');
export const getAssets = (projectId: string) => api<Asset[]>(`/api/assets?projectId=${encodeURIComponent(projectId)}`);
export const createAsset = (payload: Record<string, unknown>) => api<Asset>('/api/assets', { method: 'POST', body: JSON.stringify(payload) });
export const getScans = (projectId: string) => api<Scan[]>(`/api/scans?projectId=${encodeURIComponent(projectId)}`);
export const createScan = (payload: Record<string, unknown>) => api<Scan>('/api/scans', { method: 'POST', body: JSON.stringify(payload) });
export const cancelScan = (id: string) => api<Scan>(`/api/scans/${id}/cancel`, { method: 'POST' });
export const getFindings = (projectId: string) => api<Finding[]>(`/api/findings?projectId=${encodeURIComponent(projectId)}`);
export const getFinding = (id: string) => api<Finding>(`/api/findings/${id}`);
export const getFindingAssignees = () => api<User[]>('/api/findings/assignees');
export const updateFinding = (id: string, payload: Record<string, unknown>) => api<Finding>(`/api/findings/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const assignFinding = (id: string, userId: string) => api<Finding>(`/api/findings/${id}/assign`, { method: 'POST', body: JSON.stringify({ userId }) });
export const getRisk = (projectId: string) => api<RiskOverview>(`/api/risk/overview?projectId=${encodeURIComponent(projectId)}`);
export const getRiskTrend = (projectId: string) => api<{ date: string; score: number }[]>(`/api/risk/trend?projectId=${encodeURIComponent(projectId)}`);
export const getAttackPaths = (projectId: string) => api<AttackPath[]>(`/api/attack-paths?projectId=${encodeURIComponent(projectId)}`);
export const analyzeAttackPaths = (projectId: string) => api<{ paths: AttackPath[] }>(`/api/attack-paths/analyze?projectId=${encodeURIComponent(projectId)}`, { method: 'POST' });
export const createReport = (projectId: string) => api<BackendReport>('/api/reports', { method: 'POST', body: JSON.stringify({ projectId, reportType: 'combined' }) });
export const getUsers = () => api<User[]>('/api/users');
export const getAuditLogs = () => api<Array<Record<string, unknown>>>('/api/audit-logs');
