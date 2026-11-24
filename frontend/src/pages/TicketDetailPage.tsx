import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { api, extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CategoryBadge,
  PriorityBadge,
  StatusBadge,
} from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { format } from 'date-fns';
import { TicketCategory, TicketPriority, TicketStatus } from '../types';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, agentHeader } = useAuth();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch ticket details and audit events
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.tickets.getTicketById(id!),
    enabled: !!id,
  });

  const ticket = data?.ticket;
  const events = data?.events || [];

  // Optimistic Mutation
  const updateMutation = useMutation({
    mutationFn: (updates: {
      category?: TicketCategory;
      priority?: TicketPriority;
      status?: TicketStatus;
      assignedId?: string | null;
    }) => api.tickets.updateTicket(id!, updates, agentHeader || user?.email),

    onMutate: async (newUpdates) => {
      setErrorMessage(null);
      setSuccessMessage(null);

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['ticket', id] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<{ ticket: any; events: any[] }>(['ticket', id]);

      // Optimistically update to the new value
      if (previousData) {
        const isCatChange = newUpdates.category && newUpdates.category !== previousData.ticket.category;
        queryClient.setQueryData(['ticket', id], {
          ...previousData,
          ticket: {
            ...previousData.ticket,
            ...newUpdates,
            isReviewed: true,
            isHumanOverride: isCatChange ? true : previousData.ticket.isHumanOverride,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      return { previousData };
    },

    onError: (err, _newUpdates, context) => {
      // Roll back to previous snapshot on error
      if (context?.previousData) {
        queryClient.setQueryData(['ticket', id], context.previousData);
      }
      setErrorMessage(extractErrorMessage(err));
    },

    onSuccess: (updatedResult) => {
      // Synchronize with server response
      queryClient.setQueryData(['ticket', id], updatedResult);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketStats'] });
      setSuccessMessage('Ticket updated and audit record logged.');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="h-8 bg-slate-200 rounded w-48 mb-6 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-xl border border-slate-200 p-6 animate-pulse" />
          <div className="h-96 bg-white rounded-xl border border-slate-200 p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Alert type="error" className="mb-4">
          {extractErrorMessage(error) || 'Ticket not found'}
        </Alert>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Triage Queue</span>
        </Link>
      </div>
    );
  }

  const handleFieldChange = (field: 'category' | 'priority' | 'status' | 'assignedId', value: any) => {
    updateMutation.mutate({ [field]: value });
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Navigation and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tickets')}
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Return to queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {ticket.externalId}
              </span>
              {ticket.isHumanOverride && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Human Override Active
                </span>
              )}
              {ticket.isReviewed && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Agent Reviewed
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Ticket Details & Triage Review
            </h1>
          </div>
        </div>

        {/* Action: Book Shared Resource for this Ticket */}
        <Link
          to={`/resources/schedule?ticketId=${ticket.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Schedule Resource Slot</span>
        </Link>
      </div>

      {errorMessage && (
        <Alert type="error" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert type="success" className="mb-4">
          {successMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ticket Content & Triage Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Content Card (Safe XSS Rendering) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3 break-words">
              {ticket.subject}
            </h2>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 text-xs sm:text-sm text-slate-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {/* Rendered as plain text nodes to ensure XSS payloads are safely escaped */}
              {ticket.body}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <span>Ingested: {format(new Date(ticket.createdAt), 'PPP p')}</span>
              <span>Last Modified: {format(new Date(ticket.updatedAt), 'PPP p')}</span>
            </div>
          </div>

          {/* Agent Triage Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Agent Triage & Classification
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Optimistic UI Sync with X-Agent Header
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={ticket.category}
                  disabled={updateMutation.isPending}
                  onChange={(e) => handleFieldChange('category', e.target.value as TicketCategory)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="BILLING">BILLING</option>
                  <option value="BUG">BUG</option>
                  <option value="FEATURE_REQUEST">FEATURE_REQUEST</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="DELIVERY">DELIVERY</option>
                </select>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Auto-predicted: <strong className="text-slate-700">{ticket.autoCategory}</strong>
                  </span>
                  {ticket.isHumanOverride && (
                    <span className="text-amber-600 font-semibold">Overridden by Agent</span>
                  )}
                </div>
              </div>

              {/* Priority Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={ticket.priority}
                  disabled={updateMutation.isPending}
                  onChange={(e) => handleFieldChange('priority', e.target.value as TicketPriority)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Changing priority flags ticket as reviewed
                </p>
              </div>

              {/* Status Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workflow Status
                </label>
                <select
                  value={ticket.status}
                  disabled={updateMutation.isPending}
                  onChange={(e) => handleFieldChange('status', e.target.value as TicketStatus)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              {/* Assigned Agent Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Agent
                </label>
                <select
                  value={ticket.assignedId || ''}
                  disabled={updateMutation.isPending}
                  onChange={(e) => handleFieldChange('assignedId', e.target.value || null)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="">Unassigned</option>
                  <option value="user_agent_002">Agent Demo (user@triagesync.test)</option>
                  <option value="user_admin_001">Admin Lead (admin@triagesync.test)</option>
                  {user && user.id !== 'user_agent_002' && user.id !== 'user_admin_001' && (
                    <option value={user.id}>{user.name} ({user.email})</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Immutable Audit Trail Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Immutable Audit Trail
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {events.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No audit events recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Updates to category, priority, status, or assignee will be logged immutably.
                </p>
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  className="relative pl-5 pb-4 border-l-2 border-slate-200 last:border-l-0 last:pb-0"
                >
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span className="capitalize">{evt.field} Updated</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {format(new Date(evt.createdAt), 'HH:mm:ss')}
                      </span>
                    </div>

                    <div className="mt-1 p-2 rounded bg-slate-50 border border-slate-100 text-[11px] font-mono">
                      <span className="text-rose-600 line-through mr-1">
                        {evt.oldValue ?? 'null'}
                      </span>
                      <span className="text-slate-400 font-sans">➔</span>
                      <span className="text-emerald-700 font-bold ml-1">
                        {evt.newValue ?? 'null'}
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
                      <span className="truncate max-w-[140px]" title={evt.actor}>
                        By: <strong className="text-slate-700">{evt.actor}</strong>
                      </span>
                      <span>{format(new Date(evt.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
