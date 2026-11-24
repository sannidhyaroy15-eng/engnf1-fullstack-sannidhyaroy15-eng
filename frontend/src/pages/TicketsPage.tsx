import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  DownloadCloud,
  FileText,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { TicketFilters } from '../features/tickets/TicketFilters';
import { TicketStatsBar } from '../features/tickets/TicketStatsBar';
import { TicketImportModal } from '../features/tickets/TicketImportModal';
import {
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from '../components/ui/Badge';
import { format } from 'date-fns';

export const TicketsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Query tickets list
  const {
    data: ticketsData,
    isLoading: isTicketsLoading,
    refetch: refetchTickets,
  } = useQuery({
    queryKey: ['tickets', { page, status, category, priority, q: searchQuery }],
    queryFn: () =>
      api.tickets.getTickets({
        page,
        limit: 10,
        status: status !== 'ALL' ? status : undefined,
        category: category !== 'ALL' ? category : undefined,
        priority: priority !== 'ALL' ? priority : undefined,
        q: searchQuery.trim() || undefined,
      }),
  });

  // Query stats summary
  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['ticketStats'],
    queryFn: () => api.tickets.getStats(),
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatus('ALL');
    setCategory('ALL');
    setPriority('ALL');
    setPage(1);
  };

  const handleImportSuccess = () => {
    refetchTickets();
    refetchStats();
  };

  return (
    <div>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Support Triage Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time keyword-classified tickets, agent review, and audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold shadow-sm transition-colors"
          >
            <DownloadCloud className="w-4 h-4 text-blue-600" />
            <span>Re-Import Feed</span>
          </button>
        </div>
      </div>

      {/* Top Stats Bar */}
      <TicketStatsBar stats={statsData || null} isLoading={isStatsLoading} />

      {/* Dynamic Filters */}
      <TicketFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        category={category}
        onCategoryChange={(c) => {
          setCategory(c);
          setPage(1);
        }}
        priority={priority}
        onPriorityChange={(p) => {
          setPriority(p);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Tickets Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4 text-center">Reviewed</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {isTicketsLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                  </tr>
                ))
              ) : ticketsData?.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800">No tickets found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your search criteria or filter options.
                    </p>
                  </td>
                </tr>
              ) : (
                ticketsData?.data.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    {/* External ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs whitespace-nowrap">
                      <Link to={`/tickets/${ticket.id}`} className="hover:underline">
                        {ticket.externalId}
                      </Link>
                    </td>

                    {/* Subject (Escaped safe rendering to prevent XSS) */}
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs sm:max-w-md truncate">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="hover:text-blue-600 transition-colors block truncate"
                        title={ticket.subject}
                      >
                        {ticket.subject}
                      </Link>
                    </td>

                    {/* Category with Human Override Indicator */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CategoryBadge category={ticket.category} />
                        {ticket.isHumanOverride && (
                          <span
                            title="Human override active — protected against auto-overwrite"
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                          >
                            Manual
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={ticket.status} />
                    </td>

                    {/* Assigned Agent */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                      {ticket.assignedUser ? (
                        <span className="font-medium text-slate-800">
                          {ticket.assignedUser.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Reviewed Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {ticket.isReviewed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Created Date in Local Timezone */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                      {format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {ticketsData && ticketsData.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(ticketsData.page - 1) * ticketsData.pageSize + 1} to{' '}
              {Math.min(ticketsData.page * ticketsData.pageSize, ticketsData.total)} of{' '}
              {ticketsData.total} tickets
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={ticketsData.page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-800">
                Page {ticketsData.page} of {ticketsData.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(ticketsData.totalPages, p + 1))}
                disabled={ticketsData.page >= ticketsData.totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feed Import Modal */}
      <TicketImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};
