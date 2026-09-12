export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  organizationId: number;
}

export interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: LeadStatus;
  score: number;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  organizationId: number;
  createdById?: number | null;
}

export interface CreateLeadDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status?: LeadStatus;
  score?: number;
  notes?: string | null;
}

export interface UpdateLeadDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status?: LeadStatus;
  score?: number;
  notes?: string | null;
}

export interface LeadFilterQuery {
  status?: LeadStatus;
  search?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: 'createdAt' | 'score' | 'firstName' | 'company';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type LeadClassification = 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED';

export interface LeadQualificationResult {
  classification: LeadClassification;
  reasoning: string;
  recommendedAction: string;
  confidence: number;
  isFallback?: boolean;
  fallbackReason?: string;
}
