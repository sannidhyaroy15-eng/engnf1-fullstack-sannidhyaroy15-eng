import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  XCircle,
} from 'lucide-react';
import { api, extractErrorMessage } from '../services/api';
import { Booking, BookingStatus } from '../types';
import { BookingStatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { format } from 'date-fns';

export const AdminBookingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [resourceId, setResourceId] = useState('ALL');

  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Query resources for filter
  const { data: resourcesData } = useQuery({
    queryKey: ['adminResourcesList'],
    queryFn: () => api.resources.getResources({ limit: 100 }),
  });

  // Query all bookings
  const { data, isLoading } = useQuery({
    queryKey: ['adminBookings', { page, status, resourceId }],
    queryFn: () =>
      api.bookings.getAllBookings({
        page,
        limit: 10,
        status: status !== 'ALL' ? status : undefined,
        resourceId: resourceId !== 'ALL' ? resourceId : undefined,
      }),
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => api.bookings.approveBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setActionSuccess('Booking approved successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  // Reject Mutation (Mandatory note 5-200 characters)
  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.bookings.rejectBooking(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setRejectingBooking(null);
      setRejectionNote('');
      setActionSuccess('Booking rejected with audit decision note.');
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  const handleApprove = (id: string) => {
    setActionError(null);
    if (confirm('Approve this resource reservation?')) {
      approveMutation.mutate(id);
    }
  };

  const handleOpenReject = (booking: Booking) => {
    setActionError(null);
    setRejectingBooking(booking);
    setRejectionNote('');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;
    if (rejectionNote.trim().length < 5) {
      setActionError('Rejection note is mandatory (5–200 characters).');
      return;
    }
    rejectMutation.mutate({ id: rejectingBooking.id, note: rejectionNote.trim() });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Admin Booking Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review, approve, or reject reservation slots across all shared assets
          </p>
        </div>
      </div>

      {actionError && (
        <Alert type="error" className="mb-4">
          {actionError}
        </Alert>
      )}

      {actionSuccess && (
        <Alert type="success" className="mb-4">
          {actionSuccess}
        </Alert>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Filter by Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING (Action Required)</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Filter by Resource
            </label>
            <select
              value={resourceId}
              onChange={(e) => {
                setResourceId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Resources</option>
              {resourcesData?.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Time Window (UTC)</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Decision Note</th>
                <th className="py-3 px-4 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800">No bookings found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No reservation slots match the selected status or resource filter.
                    </p>
                  </td>
                </tr>
              ) : (
                data?.data.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs">
                      {b.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{b.user?.name || b.userId}</div>
                      <span className="text-[10px] text-slate-400 block">{b.user?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{b.resource?.name}</span>
                      <span className="block text-[10px] text-slate-400 uppercase">{b.resource?.type}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {format(new Date(b.startTime), 'MMM d, HH:mm')} – {format(new Date(b.endTime), 'HH:mm')}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-800" title={b.purpose}>
                      {b.purpose}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <BookingStatusBadge status={b.status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {b.decisionNote || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {b.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(b.id)}
                            disabled={approveMutation.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleOpenReject(b)}
                            disabled={rejectMutation.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Finalized</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} total bookings)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal with Mandatory Note */}
      <Modal
        isOpen={!!rejectingBooking}
        onClose={() => setRejectingBooking(null)}
        title="Reject Resource Booking"
        description="Provide a mandatory decision note explaining why this booking cannot be approved."
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rejection Decision Note (5–200 characters) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Room reserved for scheduled infrastructure calibration..."
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-rose-600"
            />
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Characters: {rejectionNote.trim().length} / 200
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRejectingBooking(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectMutation.isPending || rejectionNote.trim().length < 5}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
