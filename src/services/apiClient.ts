import type { Lead, CreateLeadDTO, UpdateLeadDTO, LeadFilterQuery, ApiResponse } from '../../shared/types.ts';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const body = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !body.success) {
    const message = body.error?.message || `Request failed with status ${res.status}`;
    const error = new Error(message) as Error & { code?: string; details?: unknown; status?: number };
    error.code = body.error?.code;
    error.details = body.error?.details;
    error.status = res.status;
    throw error;
  }

  return body.data as T;
}

export const api = {
  async getLeads(filters?: LeadFilterQuery): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.minScore !== undefined) params.set('minScore', String(filters.minScore));
    if (filters?.maxScore !== undefined) params.set('maxScore', String(filters.maxScore));
    if (filters?.sortBy) params.set('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = `/api/leads${queryString ? `?${queryString}` : ''}`;
    return request<Lead[]>(url);
  },

  async getLeadById(id: number): Promise<Lead> {
    return request<Lead>(`/api/leads/${id}`);
  },

  async createLead(payload: CreateLeadDTO): Promise<Lead> {
    return request<Lead>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateLead(id: number, payload: UpdateLeadDTO): Promise<Lead> {
    return request<Lead>(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteLead(id: number): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>(`/api/leads/${id}`, {
      method: 'DELETE',
    });
  },
};
