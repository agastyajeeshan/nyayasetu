export const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('nyayasetu_token') || localStorage.getItem('kavach_token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status} ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new ApiError(response.status, errorMsg);
  }

  // Handle blob responses (e.g. preview or download)
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('image/') || contentType.includes('application/octet-stream'))) {
    return (await response.blob()) as any;
  }

  return response.json();
}

export function apiGet<T>(endpoint: string): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.replace('/api', '') : endpoint;
  return request<T>(cleanEndpoint, { method: 'GET' });
}

export function apiPost<T>(endpoint: string, body: any): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.replace('/api', '') : endpoint;
  return request<T>(cleanEndpoint, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(endpoint: string, body: any): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.replace('/api', '') : endpoint;
  return request<T>(cleanEndpoint, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(endpoint: string): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.replace('/api', '') : endpoint;
  return request<T>(cleanEndpoint, { method: 'DELETE' });
}

export const api = {

  // Auth
  login: (identifier: string, password: string, enforceMfa?: boolean) => 
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, officerId: identifier, password, enforceMfa }) }),
  
  verifyMfa: (challengeToken: string, code: string) =>
    request<any>('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ challengeToken, code }) }),

  switchRole: (role: string) =>
    request<any>('/auth/switch-role', { method: 'POST', body: JSON.stringify({ role }) }),

  getMe: () => request<any>('/auth/me'),
  getUsers: () => request<any[]>('/auth/users'),

  // Cases
  getCases: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<any[]>(`/cases${query ? `?${query}` : ''}`);
  },
  createCase: (data: any) =>
    request<any>('/cases', { method: 'POST', body: JSON.stringify(data) }),
  getCaseDetail: (id: string) =>
    request<any>(`/cases/${id}`),
  updateCaseStatus: (id: string, status: string) =>
    request<any>(`/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  toggleLegalHold: (id: string, isLegalHold: boolean) =>
    request<any>(`/cases/${id}/legal-hold`, { method: 'PATCH', body: JSON.stringify({ isLegalHold }) }),

  // Documents
  getDocuments: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<{ total: number; documents: any[] }>(`/documents${query ? `?${query}` : ''}`);
  },
  uploadDocument: (formData: FormData) =>
    request<any>('/documents', { method: 'POST', body: formData }),
  uploadDocumentVersion: (id: string, formData: FormData) =>
    request<any>(`/documents/${id}/version`, { method: 'POST', body: formData }),
  getDocumentDetail: (id: string) =>
    request<any>(`/documents/${id}`),
  verifyDocumentIntegrity: (id: string, versionNumber?: number) =>
    request<any>(`/documents/${id}/verify-integrity`, { method: 'POST', body: JSON.stringify({ versionNumber }) }),
  simulateDocumentTamper: (id: string) =>
    request<any>(`/documents/${id}/simulate-tamper`, { method: 'POST' }),
  deleteDocument: (id: string) =>
    request<any>(`/documents/${id}`, { method: 'DELETE' }),

  // Evidence
  getEvidence: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<any[]>(`/evidence${query ? `?${query}` : ''}`);
  },
  createEvidence: (data: any) =>
    request<any>('/evidence', { method: 'POST', body: JSON.stringify(data) }),
  getEvidenceDetail: (id: string) =>
    request<any>(`/evidence/${id}`),
  transferCustody: (id: string, data: any) =>
    request<any>(`/evidence/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),

  // Reviews & Signatures
  addReviewComment: (data: any) =>
    request<any>('/reviews/comments', { method: 'POST', body: JSON.stringify(data) }),
  updateReviewStatus: (data: any) =>
    request<any>('/reviews/status', { method: 'PATCH', body: JSON.stringify(data) }),
  signDocument: (data: any) =>
    request<any>('/reviews/sign', { method: 'POST', body: JSON.stringify(data) }),
  verifySignature: (signatureId: string) =>
    request<any>(`/reviews/signatures/${signatureId}/verify`),

  // Intelligence & Graph
  getKnowledgeGraph: (caseId?: string) =>
    request<{ nodes: any[]; edges: any[] }>(`/intelligence/graph${caseId ? `?caseId=${caseId}` : ''}`),

  // Shares
  getShares: () => request<any[]>('/shares'),
  createShare: (data: any) =>
    request<any>('/shares', { method: 'POST', body: JSON.stringify(data) }),
  accessSharedResource: (token: string, passcode?: string) =>
    request<any>(`/shares/access/${token}`, { method: 'POST', body: JSON.stringify({ passcode }) }),
  revokeShare: (id: string) =>
    request<any>(`/shares/${id}`, { method: 'DELETE' }),

  // Audit & Ledger
  getAuditLogs: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<{ total: number; logs: any[] }>(`/audit/logs${query ? `?${query}` : ''}`);
  },
  getLedgerBlocks: () =>
    request<{ totalBlocks: number; blocks: any[] }>('/audit/ledger'),
  verifyLedger: () =>
    request<any>('/audit/ledger/verify'),
  simulateLedgerTamper: (blockIndex?: number) =>
    request<any>('/audit/ledger/simulate-tamper', { method: 'POST', body: JSON.stringify({ blockIndex }) }),
  repairLedger: () =>
    request<any>('/audit/ledger/repair', { method: 'POST' }),

  // Assets
  getAssets: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<any[]>(`/assets${query ? `?${query}` : ''}`);
  },
  createAsset: (data: any) =>
    request<any>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  getAssetDetail: (id: string) =>
    request<any>(`/assets/${id}`),
  updateAssetStatus: (id: string, data: any) =>
    request<any>(`/assets/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // System
  getSystemHealth: () => request<any>('/system/health'),
  getSystemStats: () => request<any>('/system/stats'),

  // FEATURE 1: Case Timeline
  getCaseTimeline: (caseId: string) =>
    request<any[]>(`/cases/${caseId}/timeline`),

  // FEATURE 4: Case Readiness
  getCaseReadiness: (caseId: string) =>
    request<any>(`/cases/${caseId}/readiness`),

  // FEATURE 8: Export Evidence Package
  exportEvidencePackage: async (caseId: string, options: any) => {
    const token = localStorage.getItem('nyayasetu_token');
    const response = await fetch(`${API_BASE}/cases/${caseId}/export-package`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(options)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(err.error || 'Failed to export evidence package');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EVIDENCE_PACKAGE_${caseId}_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // FEATURE 10: Investigation Summary
  getInvestigationSummary: (caseId: string) =>
    request<any>(`/cases/${caseId}/investigation-summary`),

  // FEATURE 5: Document Version Comparison
  compareVersions: (docId: string, v1?: number, v2?: number) => {
    const params = new URLSearchParams();
    if (v1) params.append('v1', v1.toString());
    if (v2) params.append('v2', v2.toString());
    return request<any>(`/documents/${docId}/compare-versions?${params.toString()}`);
  },

  // FEATURE 6: Secure PII Redaction
  detectPII: (docId: string, versionNumber?: number) =>
    request<{ detected: any[]; totalFound: number }>(`/documents/${docId}/detect-pii`, {
      method: 'POST',
      body: JSON.stringify({ versionNumber })
    }),
  createRedactedDerivative: (docId: string, data: any) =>
    request<any>(`/documents/${docId}/create-redacted`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getRedactedCopies: (docId: string) =>
    request<any[]>(`/documents/${docId}/redacted-copies`),

  // FEATURE 7: Evidence Integrity Center
  getIntegrityCenterReport: (caseId?: string) =>
    request<{ items: any[]; stats: any; verifiedAt?: string }>(`/system/integrity-center${caseId ? `?caseId=${caseId}` : ''}`),
  verifyIntegrityAll: (caseId?: string) =>
    request<any>('/system/verify-integrity-all', {
      method: 'POST',
      body: JSON.stringify({ caseId })
    }),

  // SETTINGS & PROFILE
  updateProfile: (data: { name?: string; phone?: string; department?: string; organization?: string }) =>
    request<any>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  toggleMfa: (enabled?: boolean) =>
    request<any>('/auth/mfa/toggle', { method: 'POST', body: JSON.stringify({ enabled }) }),
  enrollFace: (templateHash: string) =>
    request<any>('/auth/face/enroll', { method: 'POST', body: JSON.stringify({ templateHash }) }),
  removeFace: (password: string) =>
    request<any>('/auth/face/remove', { method: 'DELETE', body: JSON.stringify({ password }) }),
  verifyFace: () =>
    request<any>('/auth/face/verify', { method: 'POST', body: JSON.stringify({}) }),
  updateNotificationPreferences: (prefs: any) =>
    request<any>('/auth/notification-preferences', { method: 'PATCH', body: JSON.stringify(prefs) }),
  getSessionInfo: () =>
    request<{ currentSession: any; securityEvents: any[] }>('/auth/session-info'),
  revokeOtherSessions: () =>
    request<any>('/auth/sessions/revoke-others', { method: 'POST', body: JSON.stringify({}) }),
  deactivateAccount: (password: string) =>
    request<any>('/auth/deactivate', { method: 'POST', body: JSON.stringify({ password }) }),
  updateUserStatus: (userId: string, isActive: boolean) =>
    request<any>(`/auth/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  updateUserRole: (userId: string, role: string) =>
    request<any>(`/auth/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
};
