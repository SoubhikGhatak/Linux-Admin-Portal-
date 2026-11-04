import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { validateUsername, isProtectedAccount } from '../../utils/permissionCalculators';
import { X, UserPlus, Terminal, AlertTriangle, ShieldCheck } from 'lucide-react';

export const CreateUserModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { groups, refreshAll, showToast } = useSystem();

  const [username, setUsername] = useState('');
  const [gecos, setGecos] = useState('');
  const [shell, setShell] = useState('/bin/bash');
  const [createHome, setCreateHome] = useState(true);
  const [primaryGroup, setPrimaryGroup] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [validationErr, setValidationErr] = useState<string | null>(null);

  const availableShells = [
    { path: '/bin/bash', desc: 'Bourne-Again SHell (Standard default)' },
    { path: '/bin/zsh', desc: 'Z Shell (Advanced features & completion)' },
    { path: '/bin/sh', desc: 'POSIX Standard Bourne Shell' },
    { path: '/usr/sbin/nologin', desc: 'No Login (Service daemon / Restricted)' },
  ];

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    if (!val) {
      setValidationErr(null);
      return;
    }
    const check = validateUsername(val);
    if (!check.valid) {
      setValidationErr(check.error || 'Invalid username format.');
    } else if (isProtectedAccount(val)) {
      setValidationErr(`'${val}' is a reserved Linux system account.`);
    } else {
      setValidationErr(null);
    }
  };

  const toggleGroup = (grp: string) => {
    setSelectedGroups((prev) =>
      prev.includes(grp) ? prev.filter((g) => g !== grp) : [...prev, grp]
    );
  };

  const previewCommand = `useradd ${createHome ? '-m ' : ''}-s ${shell} -c "${gecos || username}"${primaryGroup ? ` -g ${primaryGroup}` : ''}${
    selectedGroups.length > 0 ? ` -G ${selectedGroups.join(',')}` : ''
  } ${username || '<username>'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateUsername(username);
    if (!val.valid) {
      setValidationErr(val.error || 'Invalid username.');
      return;
    }
    if (isProtectedAccount(username)) {
      setValidationErr(`'${username}' is a reserved system name.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.createUser({
        username,
        gecos: gecos || username,
        shell,
        createHome,
        primaryGroup,
        groups: selectedGroups,
      });

      showToast({
        type: 'success',
        title: 'User Created',
        message: `Linux user '${username}' successfully provisioned.`,
        command: previewCommand,
      });

      await refreshAll();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'User Creation Failed',
        message: err.message || 'Failed to create user.',
        command: previewCommand,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Create Linux User Account</h3>
              <p className="text-xs text-slate-400">Execute safe useradd with validated attributes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Username */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-200">
              Linux Username <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value.toLowerCase())}
              placeholder="e.g. dev_sarah, student01"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            {validationErr && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {validationErr}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Pattern: <code>[a-z_][a-z0-9_-]*</code> (POSIX useradd compliant, max 32 chars).
            </p>
          </div>

          {/* GECOS / Full Name */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-200">Full Name / Description (GECOS)</label>
            <input
              type="text"
              value={gecos}
              onChange={(e) => setGecos(e.target.value)}
              placeholder="e.g. Sarah Connor (DevOps Lead)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Shell & Primary Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-medium text-slate-200">Login Shell (-s)</label>
              <select
                value={shell}
                onChange={(e) => setShell(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              >
                {availableShells.map((sh) => (
                  <option key={sh.path} value={sh.path}>
                    {sh.path}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-slate-200">Primary Group (-g)</label>
              <select
                value={primaryGroup}
                onChange={(e) => setPrimaryGroup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">(Auto) Default User Private Group</option>
                {groups.map((grp) => (
                  <option key={grp.groupname} value={grp.groupname}>
                    {grp.groupname} (GID: {grp.gid})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplementary Groups */}
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-200">
              Supplementary Groups (-G)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 rounded-lg bg-slate-950 border border-slate-800">
              {groups
                .filter((g) => g.groupname !== primaryGroup)
                .map((grp) => {
                  const isChecked = selectedGroups.includes(grp.groupname);
                  return (
                    <button
                      type="button"
                      key={grp.groupname}
                      onClick={() => toggleGroup(grp.groupname)}
                      className={`px-2 py-1.5 rounded text-left text-xs font-mono transition-colors border flex items-center justify-between ${
                        isChecked
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{grp.groupname}</span>
                      {isChecked && <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Create Home Directory Flag */}
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={createHome}
              onChange={(e) => setCreateHome(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 w-4 h-4"
            />
            <span>Create user home directory (<code>/home/{username || 'username'}</code>) with <code>-m</code></span>
          </label>

          {/* Command Preview */}
          <div className="space-y-1 pt-2">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Generated Safe Execution Call
            </span>
            <div className="p-2.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
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
              disabled={submitting || !!validationErr || !username}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/30"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {submitting ? 'Executing useradd...' : 'Provision User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
