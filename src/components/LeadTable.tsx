import React from 'react';
import { Eye, Edit3, Trash2, Mail, Phone, Building2, ChevronDown } from 'lucide-react';
import type { Lead } from '../../shared/types.ts';
import { LeadStatus } from '../../shared/types.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface LeadTableProps {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: LeadStatus) => void;
  isDeletingId: number | null;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  isDeletingId,
}) => {
  return (
    <div id="leads-table-container" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table id="leads-table" className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-3.5">Lead</th>
              <th scope="col" className="px-6 py-3.5">Company & Source</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5">Score</th>
              <th scope="col" className="px-6 py-3.5">Created</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                id={`lead-row-${lead.id}`}
                className="hover:bg-slate-50/75 transition-colors group"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs shrink-0">
                      {lead.firstName[0]}{lead.lastName[0]}
                    </div>
                    <div>
                      <button
                        onClick={() => onView(lead)}
                        className="font-medium text-slate-900 hover:text-indigo-600 text-left transition-colors cursor-pointer"
                        title="View lead details"
                      >
                        {lead.firstName} {lead.lastName}
                      </button>
                      <div className="flex items-center text-xs text-slate-500 mt-0.5 space-x-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[180px]">{lead.email}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {lead.company ? (
                      <div className="flex items-center space-x-1 font-medium text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.company}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">No company</span>
                    )}
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {lead.source || 'Direct / Organic'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative inline-block">
                    <select
                      id={`lead-status-select-${lead.id}`}
                      value={lead.status}
                      onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                      aria-label={`Update status for ${lead.firstName} ${lead.lastName}`}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    >
                      {Object.values(LeadStatus).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center space-x-1 cursor-pointer group-hover:ring-1 group-hover:ring-slate-300 rounded-full p-0.5">
                      <StatusBadge status={lead.status} />
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          lead.score >= 70
                            ? 'bg-emerald-500'
                            : lead.score >= 40
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, lead.score))}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{lead.score}</span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                  {new Date(lead.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      id={`lead-view-btn-${lead.id}`}
                      onClick={() => onView(lead)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                      title="View Details"
                      aria-label="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      id={`lead-edit-btn-${lead.id}`}
                      onClick={() => onEdit(lead)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                      title="Edit Lead"
                      aria-label="Edit Lead"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`lead-delete-btn-${lead.id}`}
                      onClick={() => onDelete(lead.id)}
                      disabled={isDeletingId === lead.id}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
                      title="Delete Lead"
                      aria-label="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
