import React from 'react';
import { UserPlus, RefreshCw, Database } from 'lucide-react';

interface NavbarProps {
  onAddLead: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onAddLead,
  onRefresh,
  isRefreshing,
  totalCount,
}) => {
  return (
    <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            LP
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 id="brand-title" className="text-lg font-semibold text-slate-900 tracking-tight">
                LeadPilot
              </h1>
              <span id="mvp-badge" className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
                MVP
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              AI-Assisted Lead Management Platform
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div id="db-indicator" className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>PostgreSQL Active</span>
          </div>

          <button
            id="refresh-leads-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
            title="Refresh Leads"
            aria-label="Refresh leads from database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="create-lead-btn"
            onClick={onAddLead}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Lead</span>
          </button>
        </div>
      </div>
    </header>
  );
};
