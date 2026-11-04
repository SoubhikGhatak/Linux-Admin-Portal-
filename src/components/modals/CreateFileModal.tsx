import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { sanitizeSandboxPath, validateOctal } from '../../utils/permissionCalculators';
import { X, FilePlus, FolderPlus, Terminal, AlertTriangle } from 'lucide-react';

export const CreateFileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { refreshAll, showToast, health } = useSystem();
  const [name, setName] = useState('');
  const [isDirectory, setIsDirectory] = useState(false);
  const [mode, setMode] = useState('0644');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErr, setValidationErr] = useState<string | null>(null);

  const handleTypeChange = (isDir: boolean) => {
    setIsDirectory(isDir);
    setMode(isDir ? '0755' : '0644');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!val) {
      setValidationErr(null);
      return;
    }
    const check = sanitizeSandboxPath('/sandbox', val);
    if (!check.valid) {
      setValidationErr(check.error || 'Invalid filename or path.');
    } else {
      setValidationErr(null);
    }
  };

  const previewCommand = isDirectory
    ? `mkdir -p -m ${mode} "${name || '<dirname>'}"`
    : `install -m ${mode} /dev/null "${name || '<filename>'}"`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = sanitizeSandboxPath('/sandbox', name);
    if (!check.valid) {
      setValidationErr(check.error || 'Invalid filename.');
      return;
    }

    const octVal = validateOctal(mode);
    if (!octVal.valid) {
      setValidationErr(octVal.error || 'Invalid octal mode.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createSandboxFile({
        relativePath: check.safeRelativePath,
        isDirectory,
        content: isDirectory ? undefined : content,
        mode: octVal.formatted,
      });

      showToast({
        type: 'success',
        title: isDirectory ? 'Directory Created' : 'File Created',
        message: `Created '${check.safeRelativePath}' in sandbox with permissions ${octVal.formatted}.`,
        command: previewCommand,
      });

      await refreshAll();
      onClose();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Failed to create sandbox item.',
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
              {isDirectory ? <FolderPlus className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Create Sandbox Test Item</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{health.sandboxPath}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Type Toggle */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange(false)}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                !isDirectory ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
              Regular File
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange(true)}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
                isDirectory ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
              Directory
            </button>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-200">
              {isDirectory ? 'Directory Name / Subpath' : 'File Name / Subpath'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={isDirectory ? 'e.g. test_scripts, public_html' : 'e.g. run.sh, config.json'}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            {validationErr && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {validationErr}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Path must resolve strictly inside the test sandbox directory.
            </p>
          </div>

          {/* Octal Mode */}
          <div className="space-y-1">
            <label className="block font-medium text-slate-200">Initial Octal Mode</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                placeholder="0644 or 0755"
                className="w-28 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-1.5 flex-1 overflow-x-auto py-0.5">
                {['0644', '0755', '0600', '0700', '0777'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-2 py-1 rounded font-mono text-[11px] border transition-colors ${
                      mode === m
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* File Content (if file) */}
          {!isDirectory && (
            <div className="space-y-1">
              <label className="block font-medium text-slate-200">Initial Content (Optional)</label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="#!/bin/bash&#10;echo 'Testing permissions...'"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Command Preview */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Command Snippet Preview
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
              disabled={submitting || !name || !!validationErr}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/30"
            >
              <FilePlus className="w-3.5 h-3.5" />
              {submitting ? 'Creating...' : isDirectory ? 'Create Directory' : 'Create File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
