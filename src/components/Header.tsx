import React, { useState } from 'react';
import { useSystem } from '../context/SystemContext';
import {
  Terminal,
  Server,
  RefreshCw,
  BookOpen,
  Wifi,
  WifiOff,
  Cpu,
  Settings2,
  ShieldCheck
} from 'lucide-react';
import { LocalConnectionModal } from './modals/LocalConnectionModal';

export const Header: React.FC = () => {
  const {
    mode,
    setMode,
    health,
    diagnostics,
    loading,
    refreshAll,
    setActiveTab,
  } = useSystem();

  const [showConnModal, setShowConnModal] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-100 tracking-tight">
                Linux Admin Portal
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ACADEMIC v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md">
              User, Group &amp; File Permission Subsystem
            </p>
          </div>
        </div>

        {/* Center: System Status & Diagnostic Chip */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-md">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-semibold">{diagnostics?.hostname || 'linux-node'}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[140px]">{diagnostics?.osRelease?.split(' ')[0] || 'Linux'}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="text-[11px] text-slate-400">
            UID: <span className="text-emerald-400">{diagnostics?.currentUid ?? 1000}</span>
          </div>
        </div>

        {/* Right: Mode Switcher & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setMode('demo')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                mode === 'demo'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Run in simulated mode with realistic mock Linux data"
            >
              <span className={`w-2 h-2 rounded-full ${mode === 'demo' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              DEMO MODE
            </button>
            <button
              onClick={() => setMode('local')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                mode === 'local'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Connect to local Linux machine backend via strict allowlist"
            >
              <span className={`w-2 h-2 rounded-full ${mode === 'local' ? (health.isLocalBackendAvailable ? 'bg-cyan-400 animate-pulse' : 'bg-rose-400') : 'bg-slate-600'}`} />
              LOCAL LINUX
            </button>
          </div>

          {/* Connection Settings / Status */}
          <button
            onClick={() => setShowConnModal(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-slate-100 transition-colors flex items-center gap-1.5"
            title="Configure Linux daemon connection"
            aria-label="Linux Connection Settings"
          >
            {health.isLocalBackendAvailable ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="hidden sm:inline font-mono text-[11px]">
              {health.latencyMs ? `${health.latencyMs}ms` : 'Config'}
            </span>
            <Settings2 className="w-3 h-3 text-slate-400" />
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => refreshAll()}
            disabled={loading}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
            title="Refresh Linux state"
            aria-label="Refresh Linux state"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Docs Tab Shortcut */}
          <button
            onClick={() => setActiveTab('docs')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
            title="Open Documentation & Setup Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guide</span>
          </button>
        </div>
      </header>

      {showConnModal && (
        <LocalConnectionModal onClose={() => setShowConnModal(false)} />
      )}
    </>
  );
};
