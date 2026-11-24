import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api, extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/ui/Alert';
import { format, addDays } from 'date-fns';

export const ResourceSchedulePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const preselectedResourceId = searchParams.get('resourceId') || '';
  const preselectedTicketId = searchParams.get('ticketId') || '';

  const [selectedResourceId, setSelectedResourceId] = useState(preselectedResourceId);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<{ startHour: number; startMinute: number; duration: number } | null>(null);
  const [purpose, setPurpose] = useState('');
  const [linkedTicketId, setLinkedTicketId] = useState(preselectedTicketId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch active resources for selection
  const { data: resourcesData } = useQuery({
    queryKey: ['activeResources'],
    queryFn: () => api.resources.getResources({ limit: 100 }),
  });

  const resources = resourcesData?.data.filter((r) => r.isActive) || [];

  useEffect(() => {
    if (!selectedResourceId && resources.length > 0) {
      setSelectedResourceId(resources[0].id);
    }
  }, [resources, selectedResourceId]);

  // Generate day window for availability query (00:00 to 23:59 UTC)
  const fromIso = `${selectedDate}T00:00:00.000Z`;
  const toIso = `${selectedDate}T23:59:59.000Z`;

  // Fetch availability slots for selected resource on selected date
  const {
    data: availabilityData,
    isLoading: isAvailabilityLoading,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ['availability', selectedResourceId, selectedDate],
    queryFn: () => api.resources.getAvailability(selectedResourceId, fromIso, toIso),
    enabled: !!selectedResourceId,
  });

  // Booking Mutation
  const bookingMutation = useMutation({
    mutationFn: (data: {
      resourceId: string;
      startTime: string;
      endTime: string;
      purpose: string;
      ticketId?: string | null;
    }) => api.bookings.createBooking(data),
    onSuccess: (newBooking) => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      setActionSuccess(`Booking request submitted successfully! Status: ${newBooking.status}. Waiting for administrative approval.`);
      setSelectedSlot(null);
      setPurpose('');
      setTimeout(() => navigate('/bookings/mine'), 2000);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  // Helper to determine if a 30-min slot is occupied
  // Hours 08:00 to 20:00 (every 30 mins)
  const timeSlots = [];
  for (let hour = 8; hour < 20; hour++) {
    timeSlots.push({ hour, minute: 0 });
    timeSlots.push({ hour, minute: 30 });
  }

  const isSlotOccupied = (slotHour: number, slotMinute: number) => {
    if (!availabilityData?.bookings) return false;

    // Build UTC slot interval
    const slotStart = new Date(`${selectedDate}T${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}:00.000Z`).getTime();
    const slotEnd = slotStart + 30 * 60 * 1000;

    return availabilityData.bookings.some((b) => {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      // Overlap: slotStart < bEnd AND slotEnd > bStart
      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  const isSlotPast = (slotHour: number, slotMinute: number) => {
    const slotTime = new Date(`${selectedDate}T${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}:00.000Z`).getTime();
    return slotTime <= Date.now();
  };

  const handleSelectSlot = (slotHour: number, slotMinute: number) => {
    setActionError(null);
    setActionSuccess(null);
    if (isSlotOccupied(slotHour, slotMinute) || isSlotPast(slotHour, slotMinute)) return;
    setSelectedSlot({ startHour: slotHour, startMinute: slotMinute, duration: 60 });
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!selectedSlot) {
      setActionError('Please select an available starting slot from the time grid.');
      return;
    }

    if (purpose.trim().length < 5) {
      setActionError('Purpose must be at least 5 characters.');
      return;
    }

    const start = new Date(`${selectedDate}T${String(selectedSlot.startHour).padStart(2, '0')}:${String(selectedSlot.startMinute).padStart(2, '0')}:00.000Z`);
    const end = new Date(start.getTime() + selectedSlot.duration * 60 * 1000);

    bookingMutation.mutate({
      resourceId: selectedResourceId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      purpose: purpose.trim(),
      ticketId: linkedTicketId.trim() || null,
    });
  };

  const selectedResource = resources.find((r) => r.id === selectedResourceId);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Resource Slot Scheduling
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Atomic 30-minute interval grid, conflict validation, and slot reservation
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Resource & Date Selector + 30min Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Resource Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Resource
                </label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => {
                    setSelectedResourceId(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600 font-medium"
                >
                  {resources.map((res) => (
                    <option key={res.id} value={res.id}>
                      [{res.type}] {res.name} (Cap: {res.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selector (Max 30 days ahead) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reservation Date (UTC)
                </label>
                <input
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            {/* Selected Resource Overview */}
            {selectedResource && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
                <div>
                  <span className="font-bold text-slate-900">{selectedResource.name}</span>
                  <span className="text-slate-500 ml-2">Type: {selectedResource.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Capacity: <strong>{selectedResource.capacity}</strong></span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
              </div>
            )}

            {/* 30-Minute Interval Time Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daily 30-Minute Time Grid
                </span>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-300" />
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
                    <span>Past</span>
                  </div>
                </div>
              </div>

              {isAvailabilityLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 animate-pulse py-8">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="h-11 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {timeSlots.map((slot) => {
                    const occupied = isSlotOccupied(slot.hour, slot.minute);
                    const past = isSlotPast(slot.hour, slot.minute);
                    const isSelected =
                      selectedSlot?.startHour === slot.hour &&
                      selectedSlot?.startMinute === slot.minute;

                    const timeLabel = `${String(slot.hour).padStart(2, '0')}:${String(
                      slot.minute
                    ).padStart(2, '0')}`;

                    return (
                      <button
                        key={timeLabel}
                        type="button"
                        disabled={occupied || past}
                        onClick={() => handleSelectSlot(slot.hour, slot.minute)}
                        className={`p-2.5 rounded-lg border text-xs font-mono font-semibold transition-all text-center ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400'
                            : occupied
                            ? 'bg-rose-50 border-rose-200 text-rose-400 cursor-not-allowed opacity-75'
                            : past
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-blue-500 hover:bg-blue-50/50'
                        }`}
                      >
                        {timeLabel}
                        <span className="block text-[9px] font-sans font-normal mt-0.5">
                          {occupied ? 'Booked' : past ? 'Passed' : isSelected ? 'Selected' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Booking Confirmation Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 mb-4">
              Booking Reservation
            </h2>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Selected Slot Summary */}
              {selectedSlot ? (
                <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Selected Window (UTC)</span>
                  </div>
                  <p className="font-mono">
                    {selectedDate} @ {String(selectedSlot.startHour).padStart(2, '0')}:
                    {String(selectedSlot.startMinute).padStart(2, '0')} UTC
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Click an open slot in the time grid on the left to begin.</span>
                </div>
              )}

              {/* Duration Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (30–240 minutes)
                </label>
                <select
                  disabled={!selectedSlot}
                  value={selectedSlot?.duration || 60}
                  onChange={(e) =>
                    setSelectedSlot((prev) => (prev ? { ...prev, duration: Number(e.target.value) } : null))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600 disabled:opacity-50"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={90}>90 Minutes (1.5 Hours)</option>
                  <option value={120}>120 Minutes (2 Hours)</option>
                  <option value={180}>180 Minutes (3 Hours)</option>
                  <option value={240}>240 Minutes (4 Hours)</option>
                </select>
              </div>

              {/* Purpose Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Booking Purpose <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Incident postmortem review or component diagnostics testing..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 placeholder:text-slate-400"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  5–200 characters required
                </span>
              </div>

              {/* Optional Linked Ticket ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Linked Support Ticket ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. tick_002"
                  value={linkedTicketId}
                  onChange={(e) => setLinkedTicketId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              {/* User Policy Notice */}
              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold block text-slate-700 mb-0.5">Booking Policy (B7–B12):</span>
                • Max 3 future active bookings per agent.<br />
                • Initial status is always PENDING until Admin review.<br />
                • Back-to-back bookings allowed.
              </div>

              <button
                type="submit"
                disabled={!selectedSlot || bookingMutation.isPending}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {bookingMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Slot Reservation</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
