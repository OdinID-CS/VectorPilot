import React from 'react';
import { X, Mail, Phone, Building2, Calendar, Award, Edit3, Trash2, Tag } from 'lucide-react';
import type { Lead } from '../../shared/types.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!lead) return null;

  return (
    <div
      id="lead-detail-backdrop"
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
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
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
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
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
