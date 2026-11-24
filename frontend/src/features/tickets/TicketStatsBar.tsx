import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { TicketStatsResponse } from '../../types';

interface TicketStatsBarProps {
  stats: TicketStatsResponse | null;
  isLoading: boolean;
}

export const TicketStatsBar: React.FC<TicketStatsBarProps> = ({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-pulse">
            <div className="h-3.5 bg-slate-200 rounded w-16 mb-2" />
            <div className="h-7 bg-slate-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: Inbox,
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
    },
    {
      title: 'Open Queue',
      value: stats.byStatus.OPEN,
      icon: Clock,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
    },
    {
      title: 'In Progress',
      value: stats.byStatus.IN_PROGRESS,
      icon: AlertTriangle,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Resolved',
      value: stats.byStatus.RESOLVED,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Reviewed by Agent',
      value: stats.reviewedCount,
      icon: CheckCircle2,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Model Agreement',
      value: `${stats.modelAgreementRate}%`,
      icon: Sparkles,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.title}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {c.title}
            </span>
            <div className={`p-1.5 rounded-lg ${c.bgColor} ${c.color}`}>
              <c.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 tracking-tight">{c.value}</p>
        </div>
      ))}
    </div>
  );
};
