import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  XCircle,
} from 'lucide-react';
import { api, extractErrorMessage } from '../services/api';
import { BookingStatusBadge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { format } from 'date-fns';

export const MyBookingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myBookings', { page, status }],
    queryFn: () =>
      api.bookings.getMyBookings({
        page,
        limit: 10,
        status: status !== 'ALL' ? status : undefined,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.bookings.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setActionSuccess('Booking cancelled successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  const handleCancel = (id: string) => {
    setActionError(null);
    setActionSuccess(null);
    if (confirm('Are you sure you want to cancel this booking reservation?')) {
      cancelMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            My Resource Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track your reserved room, laboratory, and test equipment slots
          </p>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
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

      {/* Bookings Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Start Time (UTC)</th>
                <th className="py-3 px-4">End Time (UTC)</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Decision Note</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800">No bookings found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      You currently have no scheduled slots matching this filter.
                    </p>
                  </td>
                </tr>
              ) : (
                data?.data.map((booking) => {
                  const canCancel =
                    booking.status === 'PENDING' || booking.status === 'APPROVED';

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 text-xs">
                        {booking.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {booking.resource?.name || 'Resource #' + booking.resourceId}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Type: {booking.resource?.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                        {format(new Date(booking.startTime), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                        {format(new Date(booking.endTime), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-800" title={booking.purpose}>
                        {booking.purpose}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <BookingStatusBadge status={booking.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {booking.decisionNote || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={cancelMutation.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
    </div>
  );
};
