import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  Building2,
  Calendar,
  Award,
  Edit3,
  Trash2,
  Tag,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import type { Lead, LeadQualificationResult, LeadStatus } from '../../shared/types.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { api } from '../services/apiClient.ts';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  onLeadUpdated?: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onEdit,
  onDelete,
  onLeadUpdated,
}) => {
  const [isQualifying, setIsQualifying] = useState(false);
  const [qualification, setQualification] = useState<LeadQualificationResult | null>(null);
  const [qualifyError, setQualifyError] = useState<string | null>(null);
  const [isApplyingRecommendation, setIsApplyingRecommendation] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!lead) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lead, onClose]);

  // Reset qualification state when viewing a different lead
  useEffect(() => {
    setQualification(null);
    setQualifyError(null);
    setAppliedNotice(null);
  }, [lead?.id]);

  if (!lead) return null;

  const handleRunAIQualification = async () => {
    setIsQualifying(true);
    setQualifyError(null);
    setAppliedNotice(null);
    try {
      const result = await api.qualifyLead(lead.id);
      setQualification(result);
    } catch (err: unknown) {
      const error = err as Error;
      setQualifyError(error.message || 'Failed to qualify lead');
    } finally {
      setIsQualifying(false);
    }
  };

  /**
   * Human-in-the-loop action application.
   * AI never mutates records directly; user must explicitly trigger recommendation application.
   */
  const handleApplyRecommendation = async () => {
    if (!qualification || !onLeadUpdated) return;
    setIsApplyingRecommendation(true);
    try {
      let targetStatus: LeadStatus | undefined = undefined;
      if (qualification.classification === 'HOT' && lead.status === 'NEW') {
        targetStatus = 'QUALIFIED' as LeadStatus;
      } else if (qualification.classification === 'UNQUALIFIED' && lead.status === 'NEW') {
        targetStatus = 'LOST' as LeadStatus;
      }

      const timestamp = new Date().toLocaleDateString();
      const qualificationNote = `[AI Qualification - ${timestamp}]: ${qualification.classification} (${Math.round(
        qualification.confidence * 100
      )}% confidence). Action: ${qualification.recommendedAction}`;

      const newNotes = lead.notes
        ? `${lead.notes}\n\n${qualificationNote}`
        : qualificationNote;

      const updated = await api.updateLead(lead.id, {
        ...(targetStatus ? { status: targetStatus } : {}),
        notes: newNotes,
      });

      onLeadUpdated(updated);
      setAppliedNotice('Recommendation applied to lead notes and status!');
    } catch (err: unknown) {
      const error = err as Error;
      setQualifyError(error.message || 'Failed to apply recommendation');
    } finally {
      setIsApplyingRecommendation(false);
    }
  };

  const getClassificationBadgeClass = (classification: string) => {
    switch (classification) {
      case 'HOT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'WARM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COLD':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'UNQUALIFIED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      id="lead-detail-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        id="lead-detail-content"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
              {lead.firstName[0]}{lead.lastName[0]}
            </div>
            <div>
              <h2 id="detail-modal-title" className="text-lg font-semibold text-slate-900">
                {lead.firstName} {lead.lastName}
              </h2>
              <p className="text-xs text-slate-500">Lead ID #{lead.id}</p>
            </div>
          </div>
          <button
            id="detail-close-btn"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status & Score Row */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Pipeline Status</span>
              <StatusBadge status={lead.status} size="md" />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block mb-1">Lead Score</span>
              <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-sm">
                <Award className="w-4 h-4 text-amber-500" />
                <span>{lead.score} / 100</span>
              </div>
            </div>
          </div>

          {/* AI Lead Qualification Section */}
          <div id="ai-qualification-card" className="p-4 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">AI Qualification</h3>
                  <p className="text-xs text-slate-500">Gemini-assisted intent analysis & recommendations</p>
                </div>
              </div>

              {!qualification && (
                <button
                  id="run-ai-qualify-btn"
                  onClick={handleRunAIQualification}
                  disabled={isQualifying}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isQualifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Lead</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {qualifyError && (
              <div id="ai-qualify-error" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{qualifyError}</span>
              </div>
            )}

            {appliedNotice && (
              <div id="ai-qualify-applied" className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{appliedNotice}</span>
              </div>
            )}

            {qualification && (
              <div id="ai-qualification-results" className="pt-2 border-t border-slate-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500">Classification:</span>
                    <span
                      id="ai-classification-badge"
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getClassificationBadgeClass(
                        qualification.classification
                      )}`}
                    >
                      {qualification.classification}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500">Confidence:</span>
                    <span className="font-semibold text-slate-800">
                      {Math.round(qualification.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Engine Source Badge */}
                <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                  {qualification.isFallback ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-amber-700 font-medium">Deterministic Engine Fallback</span>
                      {qualification.fallbackReason && (
                        <span className="text-slate-400">({qualification.fallbackReason})</span>
                      )}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-indigo-700 font-medium">Verified by Gemini Model Output</span>
                    </>
                  )}
                </div>

                {/* Reasoning */}
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-slate-700 flex items-center space-x-1">
                    <Info className="w-3 h-3 text-slate-400" />
                    <span>Reasoning</span>
                  </span>
                  <p id="ai-reasoning-text" className="text-slate-600 leading-relaxed">
                    {qualification.reasoning}
                  </p>
                </div>

                {/* Recommended Action */}
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-slate-700 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Recommended Action</span>
                  </span>
                  <p id="ai-action-text" className="text-slate-600 leading-relaxed">
                    {qualification.recommendedAction}
                  </p>
                </div>

                {/* Human-in-the-loop action trigger */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    id="re-analyze-btn"
                    onClick={handleRunAIQualification}
                    disabled={isQualifying}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors underline cursor-pointer"
                  >
                    Re-analyze
                  </button>

                  <button
                    id="apply-recommendation-btn"
                    onClick={handleApplyRecommendation}
                    disabled={isApplyingRecommendation || Boolean(appliedNotice)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    title="AI will not modify records directly; click to confirm and apply to lead"
                  >
                    {isApplyingRecommendation ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Apply to Lead</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center space-x-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={`mailto:${lead.email}`}
                  className="text-indigo-600 hover:underline"
                >
                  {lead.email}
                </a>
              </div>

              {lead.phone && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-slate-800 hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}

              {lead.company && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{lead.company}</span>
                </div>
              )}

              {lead.source && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">Source: {lead.source}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Notes & History
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
              {lead.notes || <span className="italic text-slate-400">No notes recorded for this lead.</span>}
            </div>
          </div>

          {/* Timestamps */}
          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Created: {new Date(lead.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1.5 justify-end">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Updated: {new Date(lead.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              id="detail-delete-btn"
              onClick={() => {
                onDelete(lead.id);
                onClose();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Lead</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                id="detail-edit-btn"
                onClick={() => {
                  onClose();
                  onEdit(lead);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Lead</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
