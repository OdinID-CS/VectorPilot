import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aiQualificationResponseSchema,
  leadClassificationSchema,
} from '../src/validators/ai-qualification.validator.ts';
import { DeterministicScorer } from '../src/services/deterministic-scorer.service.ts';
import { AILeadQualifierService } from '../src/services/ai-lead-qualifier.service.ts';
import { errorHandler } from '../src/middleware/error.middleware.ts';
import { DatabaseError, AppError } from '../src/errors/app.errors.ts';
import { LeadStatus, type Lead } from '../shared/types.ts';
import type { Request, Response } from 'express';

describe('AI Qualification Schema Validation', () => {
  it('validates a compliant model qualification output', () => {
    const validOutput = {
      classification: 'HOT',
      reasoning: 'Strong budget, enterprise company, and requested immediate product demo.',
      recommendedAction: 'Schedule immediate discovery call with enterprise account executive.',
      confidence: 0.92,
    };

    const result = aiQualificationResponseSchema.safeParse(validOutput);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.classification, 'HOT');
      assert.equal(result.data.confidence, 0.92);
    }
  });

  it('rejects invalid classifications not in the enum', () => {
    const invalidOutput = {
      classification: 'SUPER_HOT',
      reasoning: 'Lead is very excited',
      recommendedAction: 'Call them',
      confidence: 0.9,
    };

    const result = aiQualificationResponseSchema.safeParse(invalidOutput);
    assert.equal(result.success, false);
  });

  it('rejects confidence scores outside [0, 1]', () => {
    const tooHigh = {
      classification: 'WARM',
      reasoning: 'Good lead with viable potential',
      recommendedAction: 'Send brochure',
      confidence: 85, // Should be 0.85, not 85
    };
    assert.equal(aiQualificationResponseSchema.safeParse(tooHigh).success, false);

    const negative = {
      classification: 'COLD',
      reasoning: 'Low engagement',
      recommendedAction: 'Nurture monthly',
      confidence: -0.1,
    };
    assert.equal(aiQualificationResponseSchema.safeParse(negative).success, false);
  });

  it('rejects empty or whitespace reasoning and recommended action', () => {
    const emptyReasoning = {
      classification: 'COLD',
      reasoning: '   ',
      recommendedAction: 'Send email',
      confidence: 0.5,
    };
    assert.equal(aiQualificationResponseSchema.safeParse(emptyReasoning).success, false);
  });
});

describe('Deterministic Lead Scoring Engine (Fallback)', () => {
  const scorer = new DeterministicScorer();

  it('qualifies a high-intent enterprise lead as HOT with appropriate action', () => {
    const enterpriseLead: Lead = {
      id: 101,
      organizationId: 1,
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 's.connor@cyberdyne-defense.com',
      phone: '+1-415-555-0100',
      company: 'Cyberdyne Defense',
      source: 'Referral',
      status: LeadStatus.NEW,
      score: 95,
      notes: 'Requested urgent enterprise pricing and demo for annual contract.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const qualification = scorer.scoreAndQualify(enterpriseLead, 'Test fallback');
    assert.equal(qualification.classification, 'HOT');
    assert.ok(qualification.confidence >= 0.8);
    assert.ok(qualification.recommendedAction.includes('executive') || qualification.recommendedAction.includes('call'));
    assert.equal(qualification.isFallback, true);
    assert.equal(qualification.fallbackReason, 'Test fallback');
  });

  it('qualifies a lead with minimal info as UNQUALIFIED or COLD', () => {
    const minimalLead: Lead = {
      id: 102,
      organizationId: 1,
      firstName: 'John',
      lastName: 'Anonymous',
      email: 'unknown123@gmail.com',
      phone: null,
      company: null,
      source: null,
      status: LeadStatus.NEW,
      score: 5,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const qualification = scorer.scoreAndQualify(minimalLead);
    assert.ok(qualification.classification === 'UNQUALIFIED' || qualification.classification === 'COLD');
    assert.equal(qualification.isFallback, true);
  });
});

describe('Isolated AI Lead Qualifier Service', () => {
  const mockLead: Lead = {
    id: 1,
    organizationId: 1,
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex.morgan@acme.com',
    phone: '+1-555-0199',
    company: 'Acme Corp',
    source: 'Website',
    status: LeadStatus.NEW,
    score: 80,
    notes: 'Interested in enterprise annual plan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('gracefully uses deterministic fallback when GEMINI_API_KEY is not configured', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      const service = new AILeadQualifierService();
      const result = await service.qualifyLead(mockLead);

      assert.ok(result.classification);
      assert.ok(result.reasoning);
      assert.ok(result.recommendedAction);
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
      assert.equal(result.isFallback, true);
      assert.ok(result.fallbackReason?.includes('GEMINI_API_KEY'));
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('never mutates the input lead record directly (read-only analytical operation)', async () => {
    const inputCopy = { ...mockLead };
    const service = new AILeadQualifierService();
    await service.qualifyLead(mockLead);

    assert.deepEqual(mockLead, inputCopy);
  });
});

describe('Security & Error Handling Review Checks', () => {
  it('sanitizes internal database error causes to prevent info leaks', () => {
    let capturedStatus = 0;
    let capturedBody: unknown = null;

    const mockRes = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(body: unknown) {
        capturedBody = body;
        return this;
      },
    } as unknown as Response;

    const mockReq = {} as Request;
    const mockNext = () => {};

    // Database error with internal PG driver details
    const secretError = new DatabaseError('Database operation failed', {
      cause: {
        host: '10.0.0.5',
        query: 'SELECT * FROM leads WHERE internal_hash = 1234',
        stack: 'Error: at PGClient.query',
      },
    });

    errorHandler(secretError, mockReq, mockRes, mockNext);

    assert.equal(capturedStatus, 500);
    const body = capturedBody as { success: boolean; error: { code: string; details?: unknown } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'DATABASE_ERROR');
    // Ensure cause object was stripped and not leaked to client
    assert.equal(body.error.details, undefined);
  });
});
