import React from 'react';
import { Users, CheckCircle2, TrendingUp, Award } from 'lucide-react';
import type { Lead } from '../../shared/types.ts';
import { LeadStatus } from '../../shared/types.ts';

interface StatsBarProps {
  leads: Lead[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ leads }) => {
  const total = leads.length;
  const qualified = leads.filter(l => l.status === LeadStatus.QUALIFIED).length;
  const converted = leads.filter(l => l.status === LeadStatus.CONVERTED).length;
  const avgScore = total > 0 ? Math.round(leads.reduce((acc, l) => acc + l.score, 0) / total) : 0;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  return (
    <div id="stats-container" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div id="stat-card-total" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Leads</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{total}</p>
        <p className="mt-1 text-xs text-slate-500">In CRM pipeline</p>
      </div>

      <div id="stat-card-qualified" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Qualified</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{qualified}</p>
        <p className="mt-1 text-xs text-slate-500">Ready for engagement</p>
      </div>

      <div id="stat-card-converted" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Converted</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{converted}</p>
        <p className="mt-1 text-xs text-slate-500">{conversionRate}% conversion rate</p>
      </div>

      <div id="stat-card-avg-score" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Lead Score</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900">{avgScore}/100</p>
        <p className="mt-1 text-xs text-slate-500">Quality score metric</p>
      </div>
    </div>
  );
};
