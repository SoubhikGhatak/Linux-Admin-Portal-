import React from 'react';
import { LinuxUser } from '../../types';
import { X, UserCheck, Shield, KeyRound, Home, Terminal, FolderTree } from 'lucide-react';

export const InspectUserModal: React.FC<{ user: LinuxUser; onClose: () => void }> = ({ user, onClose }) => {
  const passwdLine = `${user.username}:x:${user.uid}:${user.gid}:${user.gecos}:${user.homeDir}:${user.shell}`;
  const allGroups = [user.primaryGroup, ...user.supplementaryGroups];
  const idOutput = `uid=${user.uid}(${user.username}) gid=${user.gid}(${user.primaryGroup}) groups=${user.gid}(${user.primaryGroup})${
    user.supplementaryGroups.map((g) => `,${g}`).join('')
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">User Account Inspection: {user.username}</h3>
              <p className="text-xs text-slate-400 font-mono">POSIX identity &amp; PAM configuration inspection</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Quick Identity Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">User ID (UID)</span>
              <div className="text-lg font-mono font-bold text-emerald-400">{user.uid}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Primary GID</span>
              <div className="text-lg font-mono font-bold text-cyan-400">{user.gid}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Class</span>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {user.uid === 0 ? 'Superuser (Root)' : user.isSystem ? 'System Daemon' : 'Standard User'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Login Status</span>
              <div className={`text-xs font-semibold mt-1 ${user.isLocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                {user.isLocked ? 'Locked (!)' : 'Active'}
              </div>
            </div>
          </div>

          {/* Linux `id` Command Output */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Linux id Command Output (id {user.username})
            </span>
            <div className="p-3 bg-black/70 rounded-lg border border-slate-800 font-mono text-emerald-400 text-xs overflow-x-auto">
              {idOutput}
            </div>
          </div>

          {/* /etc/passwd Line Breakdown */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Academic /etc/passwd Format Breakdown
            </span>
            <div className="p-3 bg-black/70 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto text-slate-200">
              {passwdLine}
            </div>

            {/* Field breakdown grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 font-mono font-semibold">1. Username:</span>{' '}
                <span className="text-emerald-300 font-mono">{user.username}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 font-mono font-semibold">2. Password:</span>{' '}
                <span className="text-slate-300 font-mono">x (delegated to /etc/shadow)</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 font-mono font-semibold">3. UID:</span>{' '}
                <span className="text-emerald-300 font-mono">{user.uid}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 font-mono font-semibold">4. GID:</span>{' '}
                <span className="text-cyan-300 font-mono">{user.gid} ({user.primaryGroup})</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 font-mono font-semibold">5. GECOS (Info):</span>{' '}
                <span className="text-slate-300">{user.gecos || 'None'}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center gap-1">
                <Home className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-mono font-semibold">6. Home Dir:</span>{' '}
                <span className="text-slate-300 font-mono truncate">{user.homeDir}</span>
              </div>
              <div className="sm:col-span-2 p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-mono font-semibold">7. Login Shell:</span>{' '}
                <span className="text-slate-300 font-mono">{user.shell}</span>
              </div>
            </div>
          </div>

          {/* Group Memberships */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              Effective Group Memberships ({allGroups.length})
            </span>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
              {allGroups.map((grp, i) => (
                <span
                  key={grp}
                  className={`px-2 py-0.5 rounded text-xs font-mono border ${
                    i === 0
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {grp} {i === 0 && '(Primary)'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
