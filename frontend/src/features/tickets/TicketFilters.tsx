import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { TicketCategory, TicketPriority, TicketStatus } from '../../types';

interface TicketFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  status: string;
  onStatusChange: (s: string) => void;
  category: string;
  onCategoryChange: (c: string) => void;
  priority: string;
  onPriorityChange: (p: string) => void;
  onReset: () => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  priority,
  onPriorityChange,
  onReset,
}) => {
  const isFiltered =
    searchQuery !== '' || status !== 'ALL' || category !== 'ALL' || priority !== 'ALL';

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        {/* Search input (searches both subject and body) */}
        <div className="lg:col-span-2 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tickets by subject, body, or ID..."
            className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm text-slate-800 bg-white focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm text-slate-800 bg-white focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="BILLING">Billing</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="LOGIN">Login / 2FA</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        {/* Priority Dropdown & Reset */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm text-slate-800 bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {isFiltered && (
            <button
              onClick={onReset}
              title="Reset all filters"
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
