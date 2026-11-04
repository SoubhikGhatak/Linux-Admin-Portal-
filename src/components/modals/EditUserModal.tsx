import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { LinuxUser } from '../../types';
import { X, Edit3, Terminal, Lock, Unlock, ShieldAlert } from 'lucide-react';

export const EditUserModal: React.FC<{ user: LinuxUser; onClose: () => void }> = ({ user, onClose }) => {
  const { groups, refreshAll, showToast } = useSystem();

  const [gecos, setGecos] = useState(user.gecos || '');
  const [shell, setShell] = useState(user.shell || '/bin/bash');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(user.supplementaryGroups || []);
  const [isLocked, setIsLocked] = useState(user.isLocked);
  const [submitting, setSubmitting] = useState(false);

  const availableShells = ['/bin/bash', '/bin/zsh', '/bin/sh', '/usr/sbin/nologin'];

  const toggleGroup = (grp: string) => {
    setSelectedGroups((prev) =>
      prev.includes(grp) ? prev.filter((g) => g !== grp) : [...prev, grp]
    );
  };

  const previewCommand = `usermod -s ${shell} -c "${gecos}" -G ${selectedGroups.join(',') || '""'} ${
    isLocked !== user.isLocked ? (isLocked ? '-L ' : '-U ') : ''
  }${user.username}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user.isProtected) {
      showToast({
        type: 'error',
        title: 'Operation Blocked',
        message: `Account '${user.username}' is a protected Linux system account.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.modifyUser(user.username, {
        shell,
        gecos,
        supplementaryGroups: selectedGroups,
        lockAccount: isLocked !== user.isLocked ? isLocked : undefined,
      });

      showToast({
        type: 'success',
        title: 'Account Updated',
        message: `Successfully updated account properties for '${user.username}'.`,
        command: previewCommand,
      });

      await refreshAll();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update user account.',
        command: previewCommand,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Modify Account: {user.username}</h3>
              <p className="text-xs text-slate-400 font-mono">UID: {user.uid} | Primary Group: {user.primaryGroup}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {user.isProtected && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>System Protection Active:</strong> This is a protected system account (UID &lt; 1000). Modifying system parameters is strictly restricted to preserve system stability.
              </div>
            </div>
          )}

          {/* GECOS */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-200">Full Name / GECOS</label>
            <input
              type="text"
              value={gecos}
              onChange={(e) => setGecos(e.target.value)}
              disabled={user.isProtected}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          {/* Shell */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-200">Login Shell (-s)</label>
            <select
              value={shell}
              onChange={(e) => setShell(e.target.value)}
              disabled={user.isProtected}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500 disabled:opacity-50"
            >
              {availableShells.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </select>
          </div>

          {/* Supplementary Groups */}
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-200">
              Supplementary Groups (-G)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 rounded-lg bg-slate-950 border border-slate-800">
              {groups
                .filter((g) => g.groupname !== user.primaryGroup)
                .map((grp) => {
                  const isChecked = selectedGroups.includes(grp.groupname);
                  return (
                    <button
                      type="button"
                      key={grp.groupname}
                      disabled={user.isProtected}
                      onClick={() => toggleGroup(grp.groupname)}
                      className={`px-2 py-1.5 rounded text-left text-xs font-mono transition-colors border flex items-center justify-between ${
                        isChecked
                          ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{grp.groupname}</span>
                      {isChecked && <span className="text-[10px] text-sky-400 font-bold">✓</span>}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Lock Account */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                {isLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                Account Lock Status
              </div>
              <p className="text-[11px] text-slate-400">
                {isLocked
                  ? 'Account is LOCKED (prefixed with ! in /etc/shadow)'
                  : 'Account is ACTIVE and permitted to log in'}
              </p>
            </div>
            <button
              type="button"
              disabled={user.isProtected}
              onClick={() => setIsLocked(!isLocked)}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors border ${
                isLocked
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isLocked ? 'Unlock Account' : 'Lock Account'}
            </button>
          </div>

          {/* Command Snippet Preview */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              usermod Command Preview
            </span>
            <div className="p-2.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-sky-400 overflow-x-auto">
              {previewCommand}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || user.isProtected}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-sky-950/30"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {submitting ? 'Applying changes...' : 'Save Modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
