import React from 'react';
import { LeadStatus } from '../../shared/types.ts';

interface StatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getStyles = () => {
    switch (status) {
      case LeadStatus.NEW:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case LeadStatus.CONTACTED:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case LeadStatus.QUALIFIED:
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case LeadStatus.CONVERTED:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case LeadStatus.LOST:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const sizeStyles = size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      id={`status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap ${getStyles()} ${sizeStyles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {status}
    </span>
  );
};
