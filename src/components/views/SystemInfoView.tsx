import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Clock,
  Terminal,
  Shield,
  BookOpen,
  KeyRound,
  FileCode,
  Users,
  CheckCircle2
} from 'lucide-react';
import { octalToPermissions, permissionsToSymbolic, explainPermissions } from '../../utils/permissionCalculators';

export const SystemInfoView: React.FC = () => {
  const { diagnostics, health, mode } = useSystem();

  // Interactive academic calculator widget
  const [testOctal, setTestOctal] = useState('0750');
  const [isTestDir, setIsTestDir] = useState(false);

  const testPerms = octalToPermissions(testOctal);
  const testSymbolic = permissionsToSymbolic(testPerms, isTestDir);
  const testExplanation = explainPermissions(testOctal, isTestDir);

  const formatUptimeDetailed = (sec?: number) => {
    if (!sec) return 'N/A';
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${days} days, ${hours} hours, ${minutes} minutes, ${s} seconds`;
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          System Information &amp; Academic Linux Architecture
        </h2>
        <p className="text-xs text-slate-400">
          Real-time host diagnostics, kernel configuration, and reference diagrams for POSIX administration.
        </p>
      </div>

      {/* Diagnostics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Host & OS */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Host Identity</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-mono text-base font-bold text-slate-100 truncate">
            {diagnostics?.hostname || 'localhost'}
          </div>
          <div className="text-[11px] text-slate-400">
            {diagnostics?.osRelease || 'Linux OS'} &bull; <span className="font-mono">{diagnostics?.arch || 'x86_64'}</span>
          </div>
        </div>

        {/* Kernel */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Kernel Version</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-xs font-bold text-emerald-300 truncate" title={diagnostics?.kernelVersion}>
            {diagnostics?.kernelVersion || 'Linux Generic'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Mode: {mode.toUpperCase()} &bull; Ping: {health.latencyMs}ms
          </div>
        </div>

        {/* System Load */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">CPU Load (1/5/15m)</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-base font-bold text-slate-100">
            {diagnostics?.loadAverage ? diagnostics.loadAverage.map((v) => v.toFixed(2)).join('  ') : '0.12  0.18  0.20'}
          </div>
          <div className="text-[11px] text-slate-400">
            Load averages across run queue
          </div>
        </div>

        {/* Memory */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">Memory Allocation</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="font-mono text-base font-bold text-slate-100">
            {diagnostics?.freeMemoryMB && diagnostics?.totalMemoryMB
              ? `${Math.round((diagnostics.totalMemoryMB - diagnostics.freeMemoryMB) / 1024)}GB / ${Math.round(diagnostics.totalMemoryMB / 1024)}GB`
              : '4GB / 16GB'}
          </div>
          <div className="text-[11px] text-slate-400">
            Free RAM: {diagnostics?.freeMemoryMB ? `${Math.round(diagnostics.freeMemoryMB / 1024)}GB` : '12GB'}
          </div>
        </div>
      </div>

      {/* Detailed Diagnostics Table */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70 space-y-3 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Operating Environment Properties
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">SYSTEM UPTIME</span>
            <span className="text-slate-200">{formatUptimeDetailed(diagnostics?.uptimeSeconds)}</span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">CURRENT OPERATOR</span>
            <span className="text-emerald-400 font-bold">{diagnostics?.currentUser}</span> (UID: {diagnostics?.currentUid})
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">IS ROOT PRIVILEGED</span>
            <span className={diagnostics?.isRoot ? 'text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>
              {diagnostics?.isRoot ? 'YES (Effective UID 0)' : 'NO (Standard Unprivileged User)'}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 sm:col-span-2 lg:col-span-3 truncate">
            <span className="text-slate-400 text-[10px] block">RESTRICTED SANDBOX ROOT</span>
            <span className="text-cyan-400">{diagnostics?.sandboxPath}</span>
          </div>
        </div>
      </div>

      {/* Academic Architecture Section: Passwd, Group, Permissions Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* /etc/passwd Anatomy */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs uppercase tracking-wider">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            Anatomy of /etc/passwd
          </div>
          <div className="p-2.5 rounded bg-black/70 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
            student:x:1004:1004:CS301 Lab Guest:/home/student:/bin/bash
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">1. username:</span>
              <span>Unique login identifier (max 32 lowercase chars).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">2. password:</span>
              <span><code>x</code> indicates password hash is stored securely in <code>/etc/shadow</code>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">3. UID:</span>
              <span>User ID (0 is root, 1-999 are system services, 1000+ are regular accounts).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">4. GID:</span>
              <span>Primary Group ID corresponding to entry in <code>/etc/group</code>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">5. GECOS:</span>
              <span>User comment (full name, phone, department info).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">6. Home Directory:</span>
              <span>Initial working directory upon interactive login.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-emerald-400 font-bold">7. Login Shell:</span>
              <span>Interpreter executed upon login (e.g. <code>/bin/bash</code>, or <code>/usr/sbin/nologin</code> to disable login).</span>
            </div>
          </div>
        </div>

        {/* /etc/group Anatomy */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4 text-cyan-400" />
            Anatomy of /etc/group
          </div>
          <div className="p-2.5 rounded bg-black/70 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
            developers:x:1001:alice_dev,intern_jane
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold">1. groupname:</span>
              <span>Unique group identifier.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold">2. password:</span>
              <span><code>x</code> indicates optional group password stored in <code>/etc/gshadow</code>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold">3. GID:</span>
              <span>Numeric Group ID (0 is root, 1-999 are system daemons, 1000+ are user groups).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold">4. member list:</span>
              <span>Comma-separated list of users for whom this is a supplementary group.</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Standard umask Explained
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <code>umask 022</code>: Files created with <code>644 (rw-r--r--)</code>, directories with <code>755 (rwxr-xr-x)</code>.<br />
              <code>umask 027</code>: Files created with <code>640 (rw-r-----)</code>, directories with <code>750 (rwxr-x---)</code>.<br />
              <code>umask 077</code>: Private creation; files created with <code>600 (rw-------)</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Academic Permission Calculator Widget */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              Academic Octal-to-Symbolic Conversion Sandbox
            </h3>
            <p className="text-xs text-slate-400">
              Type any octal permission to inspect symbolic bits and plain-English DAC security rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isTestDir}
                onChange={(e) => setIsTestDir(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-500 w-3.5 h-3.5"
              />
              <span>Evaluate as Directory</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
              Octal Mode Input
            </label>
            <input
              type="text"
              value={testOctal}
              onChange={(e) => setTestOctal(e.target.value)}
              placeholder="e.g. 755, 644, 4755"
              className="w-full px-3 py-1.5 bg-black border border-slate-700 rounded text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
              Symbolic Notation
            </label>
            <div className="font-mono font-bold text-cyan-400 text-sm tracking-wider py-1">
              {testSymbolic}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
              Command Snippet
            </label>
            <div className="font-mono text-slate-300 text-xs py-1 truncate">
              chmod {testOctal} filename
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-emerald-400">{testExplanation.summary}</div>
          <div className="text-slate-400 text-[11px]">
            Owner: {testExplanation.ownerText} | Group: {testExplanation.groupText} | Others: {testExplanation.othersText}
          </div>
        </div>
      </div>
    </div>
  );
};
