import { z } from 'zod';
import { LeadStatus } from '../../shared/types.ts';

export const leadStatusEnum = z.nativeEnum(LeadStatus);

export const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100, 'First name cannot exceed 100 characters'),
  lastName: z.string().trim().min(1, 'Last name is required').max(100, 'Last name cannot exceed 100 characters'),
  email: z.string().trim().email('Invalid email address format').max(255, 'Email cannot exceed 255 characters').toLowerCase(),
  phone: z.string().trim().max(50, 'Phone cannot exceed 50 characters').nullable().optional(),
  company: z.string().trim().max(255, 'Company cannot exceed 255 characters').nullable().optional(),
  source: z.string().trim().max(100, 'Source cannot exceed 100 characters').nullable().optional(),
  status: leadStatusEnum.default(LeadStatus.NEW).optional(),
  score: z.number().int('Score must be an integer').min(0, 'Score must be between 0 and 100').max(100, 'Score must be between 0 and 100').default(0).optional(),
  notes: z.string().nullable().optional(),
});

export const updateLeadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name cannot be empty').max(100, 'First name cannot exceed 100 characters').optional(),
  lastName: z.string().trim().min(1, 'Last name cannot be empty').max(100, 'Last name cannot exceed 100 characters').optional(),
  email: z.string().trim().email('Invalid email address format').max(255, 'Email cannot exceed 255 characters').toLowerCase().optional(),
  phone: z.string().trim().max(50, 'Phone cannot exceed 50 characters').nullable().optional(),
  company: z.string().trim().max(255, 'Company cannot exceed 255 characters').nullable().optional(),
  source: z.string().trim().max(100, 'Source cannot exceed 100 characters').nullable().optional(),
  status: leadStatusEnum.optional(),
  score: z.number().int('Score must be an integer').min(0, 'Score must be between 0 and 100').max(100, 'Score must be between 0 and 100').optional(),
  notes: z.string().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const leadIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Lead ID must be a positive integer').transform(val => parseInt(val, 10)),
});

export const leadFilterQuerySchema = z.object({
  status: leadStatusEnum.optional(),
  search: z.string().trim().optional(),
  minScore: z.string().regex(/^\d+$/).transform(v => parseInt(v, 10)).optional(),
  maxScore: z.string().regex(/^\d+$/).transform(v => parseInt(v, 10)).optional(),
  sortBy: z.enum(['createdAt', 'score', 'firstName', 'company']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
