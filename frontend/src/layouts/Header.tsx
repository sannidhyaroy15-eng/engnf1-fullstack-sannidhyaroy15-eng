import React from 'react';
import { Menu, ShieldAlert, Sparkles, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenSidebar: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar, title }) => {
  const { user, agentHeader } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title || 'Support Triage & Resource Scheduling'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Actor Header Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <span className="font-semibold text-slate-500">Actor:</span>
          <span className="font-mono text-slate-800 text-[11px] truncate max-w-[140px]">
            {agentHeader || user?.email}
          </span>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
              user?.role === 'ADMIN'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {user?.role === 'ADMIN' ? (
              <>
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Admin Lead</span>
              </>
            ) : (
              <>
                <UserIcon className="w-3 h-3 text-blue-600" />
                <span>Support Agent</span>
              </>
            )}
          </span>
        </div>
      </div>
    </header>
  );
};
