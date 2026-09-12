import { GoogleGenAI, Type } from '@google/genai';
import type { Lead, LeadQualificationResult } from '../../shared/types.ts';
import { aiQualificationResponseSchema } from '../validators/ai-qualification.validator.ts';
import { type IDeterministicScorer, deterministicScorer } from './deterministic-scorer.service.ts';

export interface IAILeadQualifier {
  qualifyLead(lead: Lead): Promise<LeadQualificationResult>;
}

export class AILeadQualifierService implements IAILeadQualifier {
  private aiClient: GoogleGenAI | null = null;
  private readonly defaultTimeoutMs: number;

  constructor(
    private readonly fallbackScorer: IDeterministicScorer = deterministicScorer,
    timeoutMs: number = 8000
  ) {
    this.defaultTimeoutMs = timeoutMs;
  }

  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI();
    }
    return this.aiClient;
  }

  /**
   * Qualifies a lead using Gemini AI with strict validation and robust fallback.
   * If any failure occurs (missing key, timeout, rate limit, malformed JSON, schema violation),
   * it seamlessly falls back to the deterministic scoring engine.
   */
  async qualifyLead(lead: Lead): Promise<LeadQualificationResult> {
    const client = this.getClient();

    if (!client) {
      // Deterministic fallback when Gemini API key is missing or placeholder
      return this.fallbackScorer.scoreAndQualify(
        lead,
        'AI service unconfigured: GEMINI_API_KEY not set. Using deterministic lead qualification.'
      );
    }

    try {
      const prompt = `You are an expert enterprise B2B sales development AI.
Analyze the following lead data and assess qualification:

Lead Information:
- Full Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Company: ${lead.company || 'Not specified'}
- Phone: ${lead.phone || 'Not specified'}
- Acquisition Source: ${lead.source || 'Not specified'}
- Current Pipeline Status: ${lead.status}
- Current Engagement Score: ${lead.score}/100
- Recorded Notes: ${lead.notes || 'None'}

Classification Rules:
- "HOT": High purchase intent, identified organization, valid business domain, ready for direct executive contact.
- "WARM": Moderate interest, established company or high-intent channel, requires targeted nurturing or product demo.
- "COLD": Early inquiry, low direct signal, requires educational drip.
- "UNQUALIFIED": Missing necessary business signals or invalid contact parameters.

Output strictly valid JSON with classification, reasoning, recommendedAction, and confidence (0.0 to 1.0).`;

      // Execute with timeout protection
      const responsePromise = client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classification: {
                type: Type.STRING,
                enum: ['HOT', 'WARM', 'COLD', 'UNQUALIFIED'],
              },
              reasoning: {
                type: Type.STRING,
                description: 'Objective explanation for the classification based on lead profile',
              },
              recommendedAction: {
                type: Type.STRING,
                description: 'Clear, actionable next step for the sales representative',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence score between 0.0 and 1.0',
              },
            },
            required: ['classification', 'reasoning', 'recommendedAction', 'confidence'],
          },
          temperature: 0.2, // Low temperature for consistent evaluation
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI_REQUEST_TIMEOUT')), this.defaultTimeoutMs);
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const responseText = response.text;

      if (!responseText) {
        throw new Error('EMPTY_MODEL_RESPONSE');
      }

      // Step 1: Safe JSON Parse (Never trust raw strings)
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(responseText.trim());
      } catch (jsonErr) {
        console.warn('AI returned malformed non-JSON payload:', jsonErr);
        return this.fallbackScorer.scoreAndQualify(
          lead,
          'AI service returned malformed JSON response. Using deterministic lead qualification.'
        );
      }

      // Step 2: Strict Schema Validation (Never trust unvalidated model output)
      const validationResult = aiQualificationResponseSchema.safeParse(rawJson);
      if (!validationResult.success) {
        console.warn('AI response failed strict schema validation:', validationResult.error.format());
        return this.fallbackScorer.scoreAndQualify(
          lead,
          'AI response failed strict schema validation. Using deterministic lead qualification.'
        );
      }

      const validatedData = validationResult.data;

      // Successfully qualified via AI
      return {
        classification: validatedData.classification,
        reasoning: validatedData.reasoning,
        recommendedAction: validatedData.recommendedAction,
        confidence: Math.round(validatedData.confidence * 100) / 100,
        isFallback: false,
      };
    } catch (err: unknown) {
      const error = err as { message?: string; status?: number; code?: string };
      const errorMessage = error?.message || String(err);

      // Handle specific operational failures
      if (errorMessage === 'AI_REQUEST_TIMEOUT') {
        console.warn('AI qualification timed out after', this.defaultTimeoutMs, 'ms');
        return this.fallbackScorer.scoreAndQualify(
          lead,
          'AI service request timed out. Using deterministic lead qualification.'
        );
      }

      // Rate limit or quota exhaustion handling
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        error?.status === 429
      ) {
        console.warn('AI service rate limit or quota exceeded:', errorMessage);
        return this.fallbackScorer.scoreAndQualify(
          lead,
          'AI service rate limit reached. Using deterministic lead qualification.'
        );
      }

      // General network/service failure
      console.error('AI lead qualification encountered an unexpected error:', errorMessage);
      return this.fallbackScorer.scoreAndQualify(
        lead,
        'AI service connection error. Using deterministic lead qualification.'
      );
    }
  }
}

export const aiLeadQualifierService = new AILeadQualifierService();
