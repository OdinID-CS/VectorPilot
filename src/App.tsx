import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, AlertCircle, Plus, CheckCircle, RefreshCw } from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { StatsBar } from './components/StatsBar.tsx';
import { LeadTable } from './components/LeadTable.tsx';
import { LeadModal } from './components/LeadModal.tsx';
import { LeadDetailModal } from './components/LeadDetailModal.tsx';
import { api } from './services/apiClient.ts';
import type { Lead, CreateLeadDTO, UpdateLeadDTO } from '../shared/types.ts';
import { LeadStatus } from '../shared/types.ts';

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'score' | 'firstName' | 'company'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchLeads = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    else setIsRefreshing(true);

    setError(null);
    try {
      const data = await api.getLeads({
        status: selectedStatus !== 'ALL' ? (selectedStatus as LeadStatus) : undefined,
        search: searchQuery.trim() || undefined,
        sortBy,
        sortOrder,
      });
      setLeads(data);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Failed to fetch leads from database');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedStatus, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreateOrUpdateLead = async (data: CreateLeadDTO | UpdateLeadDTO) => {
    setIsSubmitting(true);
    try {
      if (editingLead) {
        const updated = await api.updateLead(editingLead.id, data as UpdateLeadDTO);
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        showNotification(`Lead "${updated.firstName} ${updated.lastName}" updated successfully`);
      } else {
        const created = await api.createLead(data as CreateLeadDTO);
        setLeads((prev) => [created, ...prev]);
        showNotification(`Lead "${created.firstName} ${created.lastName}" added to pipeline`);
      }
      setIsModalOpen(false);
      setEditingLead(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    setIsDeletingId(id);
    try {
      await api.deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (viewingLead?.id === id) {
        setViewingLead(null);
      }
      showNotification('Lead successfully deleted');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showNotification(errorObj.message || 'Failed to delete lead', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleStatusChange = async (id: number, status: LeadStatus) => {
    try {
      const updated = await api.updateLead(id, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      if (viewingLead?.id === id) {
        setViewingLead(updated);
      }
      showNotification(`Status updated to ${status}`);
    } catch (err: unknown) {
      const errorObj = err as Error;
      showNotification(errorObj.message || 'Failed to update status', 'error');
    }
  };

  const statusOptions = useMemo(() => ['ALL', ...Object.values(LeadStatus)], []);

  return (
    <div id="leadpilot-app" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        onAddLead={() => {
          setEditingLead(null);
          setIsModalOpen(true);
        }}
        onRefresh={() => fetchLeads(true)}
        isRefreshing={isRefreshing}
        totalCount={leads.length}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Banner */}
        {notification && (
          <div
            id="app-notification-banner"
            className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm shadow-xs border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-semibold hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <StatsBar leads={leads} />

        {/* Filter and Search Bar */}
        <div
          id="controls-bar"
          className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
        >
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-leads-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, email, or company..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter Tabs & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  id={`filter-tab-${status.toLowerCase()}`}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    selectedStatus === status
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="sort-by-select" className="sr-only">
                Sort Leads By
              </label>
              <div className="flex items-center space-x-1 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  id="sort-by-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'score' | 'firstName' | 'company')}
                  className="bg-transparent font-medium focus:outline-none cursor-pointer"
                >
                  <option value="createdAt">Date Added</option>
                  <option value="score">Lead Score</option>
                  <option value="firstName">Name</option>
                  <option value="company">Company</option>
                </select>
              </div>

              <button
                id="toggle-sort-order-btn"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {error ? (
          <div id="error-state-card" className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center my-8">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-rose-900">Database Connection Error</h3>
            <p className="text-sm text-rose-700 mt-1 max-w-md mx-auto">{error}</p>
            <button
              id="retry-fetch-btn"
              onClick={() => fetchLeads()}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Query</span>
            </button>
          </div>
        ) : loading ? (
          <div id="loading-state-card" className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading leads from PostgreSQL...</p>
          </div>
        ) : leads.length === 0 ? (
          <div id="empty-state-card" className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No leads found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== 'ALL'
                ? 'No leads matched your filter criteria. Try adjusting search terms or status.'
                : 'Get started by creating your first lead in the PostgreSQL pipeline.'}
            </p>
            <div className="mt-6 flex items-center justify-center space-x-3">
              {(searchQuery || selectedStatus !== 'ALL') && (
                <button
                  id="clear-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('ALL');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              )}
              <button
                id="empty-create-lead-btn"
                onClick={() => {
                  setEditingLead(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Lead</span>
              </button>
            </div>
          </div>
        ) : (
          <LeadTable
            leads={leads}
            onView={(lead) => setViewingLead(lead)}
            onEdit={(lead) => {
              setEditingLead(lead);
              setIsModalOpen(true);
            }}
            onDelete={handleDeleteLead}
            onStatusChange={handleStatusChange}
            isDeletingId={isDeletingId}
          />
        )}
      </main>

      {/* Modals */}
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLead(null);
        }}
        onSubmit={handleCreateOrUpdateLead}
        initialData={editingLead}
        isSubmitting={isSubmitting}
      />

      <LeadDetailModal
        lead={viewingLead}
        onClose={() => setViewingLead(null)}
        onEdit={(lead) => {
          setEditingLead(lead);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteLead}
      />
    </div>
  );
}
