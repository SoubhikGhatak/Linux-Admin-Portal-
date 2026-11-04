import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import {
  Users,
  Layers,
  FolderLock,
  Activity,
  Terminal,
  ShieldCheck,
  UserPlus,
  FilePlus,
  RefreshCw,
  HardDrive,
  Cpu,
  Clock,
  ArrowRight,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { CreateUserModal } from '../modals/CreateUserModal';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { CreateFileModal } from '../modals/CreateFileModal';

export const DashboardView: React.FC = () => {
  const {
    users,
    groups,
    files,
    logs,
    diagnostics,
    mode,
    health,
    setActiveTab,
    resetDemoData,
    refreshAll,
    loading
  } = useSystem();

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateFile, setShowCreateFile] = useState(false);

  const regularUsersCount = users.filter((u) => !u.isSystem).length;
  const systemUsersCount = users.filter((u) => u.isSystem).length;
  const lockedUsersCount = users.filter((u) => u.isLocked).length;

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome & System Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
                mode === 'demo'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              }`}>
                {mode === 'demo' ? 'DEMO SIMULATION ACTIVE' : 'LOCAL LINUX ATTACHED'}
              </span>
              <span className="text-slate-400 text-xs">&bull;</span>
              <span className="text-xs text-slate-400 font-mono">
                {diagnostics?.kernelVersion || 'Linux 6.x'}
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-100">
              Linux System &amp; Permission Administration
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Academic administrative console for POSIX account management, group privilege allocation, and octal/symbolic permission enforcement within safe sandboxed boundaries.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateUser(true)}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add User
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              New Group
            </button>
            <button
              onClick={() => setShowCreateFile(true)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FilePlus className="w-3.5 h-3.5 text-amber-400" />
              Create Sandbox File
            </button>
            {mode === 'demo' && (
              <button
                onClick={resetDemoData}
                className="px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Reset demo data to default initial state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo
              </button>
            )}
          </div>
        </div>

        {/* System Diagnostics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">UPTIME</div>
              <div className="text-slate-200">{formatUptime(diagnostics?.uptimeSeconds)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">LOAD AVG (1/5/15)</div>
              <div className="text-slate-200">
                {diagnostics?.loadAverage ? diagnostics.loadAverage.map((v) => v.toFixed(2)).join(', ') : '0.15, 0.20, 0.18'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">MEMORY (FREE/TOTAL)</div>
              <div className="text-slate-200">
                {diagnostics?.freeMemoryMB && diagnostics?.totalMemoryMB
                  ? `${Math.round(diagnostics.freeMemoryMB / 1024)}GB / ${Math.round(diagnostics.totalMemoryMB / 1024)}GB`
                  : '8GB / 16GB'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">CURRENT OPERATOR</div>
              <div className="text-slate-200 truncate">
                {diagnostics?.currentUser || 'sysadmin'} (UID {diagnostics?.currentUid ?? 1000})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <div
          onClick={() => setActiveTab('users')}
          className="group p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all shadow-sm hover:shadow-emerald-950/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300">Total Users</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{users.length}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">{regularUsersCount} regular</span>
            <span>&bull;</span>
            <span className="text-slate-400">{systemUsersCount} system</span>
            {lockedUsersCount > 0 && (
              <>
                <span>&bull;</span>
                <span className="text-rose-400">{lockedUsersCount} locked</span>
              </>
            )}
          </div>
        </div>

        {/* Groups Card */}
        <div
          onClick={() => setActiveTab('groups')}
          className="group p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all shadow-sm hover:shadow-cyan-950/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300">Total Groups</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{groups.length}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span className="text-cyan-400 font-semibold">
              {groups.filter((g) => !g.isSystem).length} user-defined
            </span>
            <span>&bull;</span>
            <span>{groups.filter((g) => g.isSystem).length} system</span>
          </div>
        </div>

        {/* Sandbox Files Card */}
        <div
          onClick={() => setActiveTab('permissions')}
          className="group p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all shadow-sm hover:shadow-amber-950/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300">Sandbox Items</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{files.length}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span className="text-amber-400 font-semibold">
              {files.filter((f) => f.isDirectory).length} dirs
            </span>
            <span>&bull;</span>
            <span>{files.filter((f) => !f.isDirectory).length} files</span>
          </div>
        </div>

        {/* Active Sessions Card */}
        <div
          onClick={() => setActiveTab('system')}
          className="group p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all shadow-sm hover:shadow-indigo-950/20"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300">Logged-in Sessions</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {diagnostics?.loggedInUsers?.length || 1}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 truncate">
            <span className="text-indigo-400 font-semibold font-mono">
              {diagnostics?.loggedInUsers?.[0]?.user || 'sysadmin'}
            </span>
            <span className="text-slate-400">active on pts/0</span>
          </div>
        </div>
      </div>

      {/* Main 2-column Section: Recent Operations Stream & Quick Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-Time Audit Log Activity */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-100">Recent Linux Administrative Operations</h2>
            </div>
            <button
              onClick={() => setActiveTab('logs')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              View Full Audit Log <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
            {logs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-900/90 transition-colors">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        log.status === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : log.status === 'failed'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs font-medium text-slate-200 truncate">{log.message}</span>
                  </div>

                  {log.commandSnippet && (
                    <div className="font-mono text-[11px] text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-slate-800/60 inline-flex items-center gap-1.5 max-w-full truncate">
                      <Terminal className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-emerald-400 truncate">{log.commandSnippet}</span>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono block">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {log.durationMs !== undefined && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.durationMs}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Quick Reference & System Health Summary */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Security Architecture
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold font-mono">✓</span>
                <span><strong>No Shell Interpolation:</strong> Operations invoke verified binary paths via <code>execFile(bin, args[])</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold font-mono">✓</span>
                <span><strong>Path Sandboxing:</strong> File operations strictly bound inside <code>{health.sandboxPath}</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold font-mono">✓</span>
                <span><strong>Account Protection:</strong> UIDs &lt; 1000 and system daemons cannot be deleted or tampered with.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold font-mono">✓</span>
                <span><strong>State Verification:</strong> Reads real resulting state via <code>stat</code> and <code>getent</code> post-execution.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Logged-in Sessions (<code>who</code>)
            </h3>
            <div className="space-y-1.5 font-mono text-[11px]">
              {(diagnostics?.loggedInUsers || []).map((session, i) => (
                <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-emerald-300">{session.user}</span>
                    <span className="text-slate-400">({session.terminal})</span>
                  </div>
                  <span className="text-slate-400">{session.loginTime}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCreateUser && <CreateUserModal onClose={() => setShowCreateUser(false)} />}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
      {showCreateFile && <CreateFileModal onClose={() => setShowCreateFile(false)} />}
    </div>
  );
};
