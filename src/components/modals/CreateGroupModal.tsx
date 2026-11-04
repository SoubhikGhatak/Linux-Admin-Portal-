import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { validateGroupname, isProtectedAccount } from '../../utils/permissionCalculators';
import { X, Layers, Terminal, AlertTriangle } from 'lucide-react';

export const CreateGroupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { refreshAll, showToast } = useSystem();
  const [groupname, setGroupname] = useState('');
  const [isSystem, setIsSystem] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErr, setValidationErr] = useState<string | null>(null);

  const handleGroupnameChange = (val: string) => {
    setGroupname(val);
    if (!val) {
      setValidationErr(null);
      return;
    }
    const check = validateGroupname(val);
    if (!check.valid) {
      setValidationErr(check.error || 'Invalid group name.');
    } else if (isProtectedAccount(val)) {
      setValidationErr(`'${val}' is a reserved Linux system group name.`);
    } else {
      setValidationErr(null);
    }
  };

  const previewCommand = `groupadd ${isSystem ? '-r ' : ''}${groupname || '<groupname>'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateGroupname(groupname);
    if (!val.valid) {
      setValidationErr(val.error || 'Invalid group name.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createGroup(groupname, isSystem);
      showToast({
        type: 'success',
        title: 'Group Created',
        message: `Group '${groupname}' successfully created.`,
        command: previewCommand,
      });
      await refreshAll();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Group Creation Failed',
        message: err.message || 'Failed to create group.',
        command: previewCommand,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Create Linux Group</h3>
              <p className="text-xs text-slate-400">Provision a new group identity via safe groupadd</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block font-medium text-slate-200">
              Group Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={groupname}
              onChange={(e) => handleGroupnameChange(e.target.value.toLowerCase())}
              placeholder="e.g. qa_engineers, devops"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            {validationErr && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {validationErr}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Linux pattern: <code>[a-z_][a-z0-9_-]*</code> (standard groupadd compliant).
            </p>
          </div>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isSystem}
              onChange={(e) => setIsSystem(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 w-4 h-4"
            />
            <span>Create as System Group (<code>-r</code> flag, GID &lt; 1000)</span>
          </label>

          {/* Command Snippet Preview */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              groupadd Command Preview
            </span>
            <div className="p-2.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
              {previewCommand}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!validationErr || !groupname}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/30"
            >
              <Layers className="w-3.5 h-3.5" />
              {submitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
