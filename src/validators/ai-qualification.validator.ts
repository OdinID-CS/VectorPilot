import { z } from 'zod';

export const leadClassificationSchema = z.enum(['HOT', 'WARM', 'COLD', 'UNQUALIFIED']);

/**
 * Strict schema for model output.
 * Any model output that violates this schema is rejected by the system.
 */
export const aiQualificationResponseSchema = z.object({
  classification: leadClassificationSchema,
  reasoning: z
    .string()
    .trim()
    .min(5, 'Reasoning must be at least 5 characters')
    .max(1000, 'Reasoning must not exceed 1000 characters'),
  recommendedAction: z
    .string()
    .trim()
    .min(3, 'Recommended action must be at least 3 characters')
    .max(500, 'Recommended action must not exceed 500 characters'),
  confidence: z
    .number()
    .min(0, 'Confidence must be between 0 and 1')
    .max(1, 'Confidence must be between 0 and 1'),
});

export type ValidatedAIQualification = z.infer<typeof aiQualificationResponseSchema>;
