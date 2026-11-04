import React from 'react';
import { useSystem, ActiveTab } from '../context/SystemContext';
import {
  LayoutDashboard,
  Users,
  FolderLock,
  ScrollText,
  Activity,
  BookOpen,
  FolderCode,
  Shield,
  Layers
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    users,
    groups,
    files,
    logs,
    mode,
    health,
  } = useSystem();

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'dashboard', label: 'System Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Accounts', icon: Users, count: users.length },
    { id: 'groups', label: 'Group Management', icon: Layers, count: groups.length },
    { id: 'permissions', label: 'File Permissions', icon: FolderLock, count: files.length },
    { id: 'logs', label: 'Activity Logs', icon: ScrollText, count: logs.length },
    { id: 'system', label: 'System Diagnostics', icon: Activity },
    { id: 'docs', label: 'Academic & Setup Guide', icon: BookOpen },
  ];

  return (
    <aside aria-label="System navigation" className="w-64 border-r border-slate-800 bg-slate-950/60 backdrop-blur-md flex flex-col shrink-0">
      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Administration
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sandbox & Security Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Security Isolation
          </span>
          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
            STRICT
          </span>
        </div>

        <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80 font-mono text-[10px] text-slate-400">
          <div className="text-slate-400 font-semibold flex items-center gap-1 mb-0.5">
            <FolderCode className="w-3 h-3 text-cyan-400" />
            Active Sandbox:
          </div>
          <div className="truncate text-slate-300" title={health.sandboxPath}>
            {health.sandboxPath}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
          <span>Mode:</span>
          <span className={`font-semibold uppercase ${mode === 'demo' ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {mode === 'demo' ? 'Demo Sandbox' : 'Local Linux'}
          </span>
        </div>
      </div>
    </aside>
  );
};
