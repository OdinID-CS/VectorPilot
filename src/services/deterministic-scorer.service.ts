import type { Lead, LeadQualificationResult, LeadClassification } from '../../shared/types.ts';

export interface IDeterministicScorer {
  scoreAndQualify(lead: Lead, reason?: string): LeadQualificationResult;
}

export class DeterministicScorer implements IDeterministicScorer {
  /**
   * Deterministically qualifies a lead using rule-based scoring criteria.
   * Ensures uninterrupted qualification even when external AI services are unavailable,
   * rate-limited, timed out, or returning malformed responses.
   */
  scoreAndQualify(lead: Lead, fallbackReason?: string): LeadQualificationResult {
    let computedScore = lead.score;
    const notesLower = (lead.notes || '').toLowerCase();
    const sourceLower = (lead.source || '').toLowerCase();
    const emailLower = (lead.email || '').toLowerCase();

    // Check email domain: business domain vs common free consumer domains
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    const emailParts = emailLower.split('@');
    const domain = emailParts[1] || '';
    const isBusinessDomain = domain.length > 0 && !freeDomains.includes(domain);

    // Intent indicators in notes
    const highIntentKeywords = ['demo', 'pricing', 'enterprise', 'budget', 'procurement', 'urgent', 'contract', 'annual'];
    const hasHighIntentNotes = highIntentKeywords.some((kw) => notesLower.includes(kw));

    // High converting sources
    const isHighIntentSource = sourceLower.includes('referral') || sourceLower.includes('inbound') || sourceLower.includes('demo');

    // Rule-based classification
    let classification: LeadClassification;
    let action: string;
    let reasoning: string;
    let confidence = 0.75;

    if (computedScore >= 75 || (hasHighIntentNotes && lead.company && isBusinessDomain)) {
      classification = 'HOT';
      action = 'Assign account executive immediately for discovery call within 24 hours';
      reasoning = `Lead demonstrates high purchase readiness with strong qualification profile${
        lead.company ? ` from ${lead.company}` : ''
      }${isBusinessDomain ? ' using a verified business domain' : ''}. Deterministic score: ${computedScore}/100.`;
      confidence = 0.85;
    } else if (computedScore >= 45 || lead.company || isHighIntentSource) {
      classification = 'WARM';
      action = 'Enroll in personalized product showcase and email nurture sequence';
      reasoning = `Lead has viable qualification indicators (${
        lead.company ? 'company identified' : 'source engaged'
      }) with moderate intent. Deterministic score: ${computedScore}/100.`;
      confidence = 0.75;
    } else if (computedScore >= 20 || isBusinessDomain) {
      classification = 'COLD';
      action = 'Send educational content sequence and monitor engagement triggers';
      reasoning = `Early-stage prospect with low direct engagement signals. Deterministic score: ${computedScore}/100.`;
      confidence = 0.7;
    } else {
      classification = 'UNQUALIFIED';
      action = 'Archive or maintain on low-frequency monthly newsletter';
      reasoning = `Insufficient qualification signals or unverified contact data. Deterministic score: ${computedScore}/100.`;
      confidence = 0.8;
    }

    return {
      classification,
      reasoning,
      recommendedAction: action,
      confidence,
      isFallback: true,
      fallbackReason: fallbackReason || 'Calculated via deterministic qualification engine',
    };
  }
}

export const deterministicScorer = new DeterministicScorer();
