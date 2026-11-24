import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Inbox,
  Layers,
  LogOut,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockEngine } from '../services/mockApiEngine';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, agentHeader, setAgentHeader } = useAuth();
  const navigate = useNavigate();
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const [customAgent, setCustomAgent] = useState(agentHeader || user?.email || '');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleResetData = () => {
    if (confirm('Reset application data to initial assessment seed state?')) {
      mockEngine.resetToSeed();
      window.location.reload();
    }
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    setAgentHeader(customAgent);
    setIsEditingAgent(false);
  };

  const navigation = [
    { name: 'Triage Queue', href: '/tickets', icon: Inbox, adminOnly: false },
    { name: 'Resources', href: '/resources', icon: Layers, adminOnly: false },
    { name: 'Book Resource', href: '/resources/schedule', icon: Calendar, adminOnly: false },
    { name: 'My Bookings', href: '/bookings/mine', icon: Clock, adminOnly: false },
    { name: 'Admin Bookings', href: '/admin/bookings', icon: CalendarCheck, adminOnly: true },
    { name: 'Admin Analytics', href: '/admin/analytics', icon: BarChart3, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">
                Triage<span className="text-blue-400">Sync</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1 tracking-wider uppercase font-medium">
                Enterprise Platform
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations & Triage
          </div>

          {navigation.map((item) => {
            if (item.adminOnly && user?.role !== 'ADMIN') return null;

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0 transition-colors" />
                <span>{item.name}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    ADMIN
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Audit Actor (X-Agent) Header Config */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 px-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <span>Audit Actor (X-Agent)</span>
              <button
                type="button"
                onClick={() => setIsEditingAgent(!isEditingAgent)}
                className="text-blue-400 hover:text-blue-300 text-[10px] lowercase"
              >
                {isEditingAgent ? 'cancel' : 'edit'}
              </button>
            </div>
            {isEditingAgent ? (
              <form onSubmit={handleSaveAgent} className="mt-1 space-y-1.5">
                <input
                  type="text"
                  value={customAgent}
                  onChange={(e) => setCustomAgent(e.target.value)}
                  placeholder="agent@triagesync.test"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] py-1 font-medium transition-colors"
                >
                  Save Header
                </button>
              </form>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded p-2 text-xs flex items-center justify-between">
                <span className="text-slate-300 truncate" title={agentHeader || user?.email}>
                  {agentHeader || user?.email}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
              </div>
            )}
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800/80 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold text-xs uppercase border border-slate-600 shrink-0">
              {user?.name?.slice(0, 2) || 'AG'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <span
              className={clsx(
                'text-[10px] font-bold px-2 py-0.5 rounded border',
                user?.role === 'ADMIN'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                  : 'bg-blue-950/60 text-blue-300 border-blue-700/60'
              )}
            >
              {user?.role}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetData}
              title="Reset sample data"
              className="flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seed</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors border border-transparent hover:border-rose-900/60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
