import React from 'react';
import { clsx } from 'clsx';
import { BookingStatus, TicketCategory, TicketPriority, TicketStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, className }) => (
  <span
    className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border',
      className
    )}
  >
    {children}
  </span>
);

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  const styles: Record<TicketPriority, string> = {
    URGENT: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return <Badge className={styles[priority]}>{priority}</Badge>;
};

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const styles: Record<TicketStatus, string> = {
    OPEN: 'bg-sky-50 text-sky-700 border-sky-200',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const labels: Record<TicketStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };
  return <Badge className={styles[status]}>{labels[status]}</Badge>;
};

export const CategoryBadge: React.FC<{ category: TicketCategory }> = ({ category }) => {
  const styles: Record<TicketCategory, string> = {
    BILLING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    BUG: 'bg-rose-50 text-rose-700 border-rose-200',
    FEATURE_REQUEST: 'bg-purple-50 text-purple-700 border-purple-200',
    LOGIN: 'bg-amber-50 text-amber-700 border-amber-200',
    DELIVERY: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  const labels: Record<TicketCategory, string> = {
    BILLING: 'Billing',
    BUG: 'Bug',
    FEATURE_REQUEST: 'Feature Req',
    LOGIN: 'Login/2FA',
    DELIVERY: 'Delivery',
  };
  return <Badge className={styles[category]}>{labels[category]}</Badge>;
};

export const BookingStatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
  const styles: Record<BookingStatus, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return <Badge className={styles[status]}>{status}</Badge>;
};
