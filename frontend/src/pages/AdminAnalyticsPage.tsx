import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Activity,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';

export const AdminAnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.admin.getStats(),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white rounded-xl border border-slate-200" />
          <div className="h-72 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  // Data formatting for Recharts
  const bookingsStatusData = [
    { name: 'Pending', count: data.bookingsByStatus.pending, color: '#f59e0b' },
    { name: 'Approved', count: data.bookingsByStatus.approved, color: '#10b981' },
    { name: 'Rejected', count: data.bookingsByStatus.rejected, color: '#f43f5e' },
    { name: 'Cancelled', count: data.bookingsByStatus.cancelled, color: '#94a3b8' },
  ];

  const categoryData = Object.entries(data.ticketStats.byCategory).map(([cat, count]) => ({
    category: cat.replace('_', ' '),
    count,
  }));

  const priorityData = [
    { name: 'Urgent', count: data.ticketStats.byPriority.URGENT, color: '#f43f5e' },
    { name: 'High', count: data.ticketStats.byPriority.HIGH, color: '#f59e0b' },
    { name: 'Medium', count: data.ticketStats.byPriority.MEDIUM, color: '#3b82f6' },
    { name: 'Low', count: data.ticketStats.byPriority.LOW, color: '#64748b' },
  ];

  const topResourcesData = data.topResources.map((r) => ({
    name: r.name.length > 20 ? r.name.substring(0, 18) + '...' : r.name,
    bookings: r.bookingCount,
  }));

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Admin Analytics & Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Real-time system telemetry, booking allocation, and triage agreement metrics
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <span>Active Assets</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data.activeResources}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <span>Total Bookings</span>
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data.bookingsByStatus.total}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{data.bookingsByStatus.pending}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <span>Total Tickets</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{data.ticketStats.total}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">
            <span>Agreement Rate</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600">
            {data.ticketStats.modelAgreementRate}%
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Distribution by Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Booking Allocations by Status
            </h3>
            <span className="text-[11px] text-slate-400">All Time</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingsStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  label={(entry: any) => `${entry.name}: ${entry.value ?? entry.count}`}
                >
                  {bookingsStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 3 Utilized Resources */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Top Scheduled Resources
            </h3>
            <span className="text-[11px] text-slate-400">Total Reservations</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topResourcesData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tickets Breakdown by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Tickets Ingestion by Category
            </h3>
            <span className="text-[11px] text-slate-400">Rule-based Auto Triage</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="category" type="category" width={95} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Severity Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Severity & Priority Distribution
            </h3>
            <span className="text-[11px] text-slate-400">Queue Triage</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={(entry: any) => `${entry.name} (${entry.value ?? entry.count})`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
