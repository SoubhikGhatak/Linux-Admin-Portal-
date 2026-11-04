import React, { useState, useEffect } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { SandboxFile } from '../../types';
import {
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic,
  explainPermissions,
  validateOctal,
  FilePermissions
} from '../../utils/permissionCalculators';
import {
  FolderLock,
  FileCode,
  Folder,
  FileText,
  Plus,
  Trash2,
  Terminal,
  Shield,
  ShieldAlert,
  Info,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { CreateFileModal } from '../modals/CreateFileModal';

export const FilePermissionView: React.FC = () => {
  const { files, users, groups, refreshAll, showToast, health } = useSystem();

  const [selectedFile, setSelectedFile] = useState<SandboxFile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  // Active editor states
  const [currentPerms, setCurrentPerms] = useState<FilePermissions>(octalToPermissions('0755'));
  const [octalInput, setOctalInput] = useState('0755');
  const [selectedOwner, setSelectedOwner] = useState('sysadmin');
  const [selectedGroup, setSelectedGroup] = useState('sysadmin');

  // Sync editor when selected file changes
  useEffect(() => {
    if (files.length > 0) {
      const active = selectedFile ? files.find((f) => f.relativePath === selectedFile.relativePath) || files[0] : files[0];
      setSelectedFile(active);
      const perms = octalToPermissions(active.octalMode);
      setCurrentPerms(perms);
      setOctalInput(active.octalMode);
      setSelectedOwner(active.owner);
      setSelectedGroup(active.group);
    } else {
      setSelectedFile(null);
    }
  }, [files]);

  const handleSelectFile = (file: SandboxFile) => {
    setSelectedFile(file);
    const perms = octalToPermissions(file.octalMode);
    setCurrentPerms(perms);
    setOctalInput(file.octalMode);
    setSelectedOwner(file.owner);
    setSelectedGroup(file.group);
  };

  const handleToggleBit = (
    target: 'owner' | 'group' | 'others',
    bit: 'read' | 'write' | 'execute'
  ) => {
    const updated: FilePermissions = {
      ...currentPerms,
      [target]: {
        ...currentPerms[target],
        [bit]: !currentPerms[target][bit],
      },
    };
    setCurrentPerms(updated);
    const newOctal = permissionsToOctal(updated);
    setOctalInput(newOctal);
  };

  const handleToggleSpecial = (bit: 'suid' | 'sgid' | 'sticky') => {
    const updated: FilePermissions = {
      ...currentPerms,
      special: {
        ...currentPerms.special,
        [bit]: !currentPerms.special[bit],
      },
    };
    setCurrentPerms(updated);
    const newOctal = permissionsToOctal(updated);
    setOctalInput(newOctal);
  };

  const handleOctalInputChange = (val: string) => {
    setOctalInput(val);
    const check = validateOctal(val);
    if (check.valid) {
      setCurrentPerms(octalToPermissions(check.formatted));
    }
  };

  const handleApplyPreset = (octal: string) => {
    setOctalInput(octal);
    setCurrentPerms(octalToPermissions(octal));
  };

  // Submit chmod
  const handleApplyChmod = async () => {
    if (!selectedFile) return;
    const check = validateOctal(octalInput);
    if (!check.valid) {
      showToast({
        type: 'error',
        title: 'Invalid Octal Mode',
        message: check.error || 'Enter a valid 3 or 4-digit octal number (0-7).',
      });
      return;
    }

    setSubmittingAction('chmod');
    const cmd = `chmod ${check.formatted} /sandbox/${selectedFile.relativePath}`;

    try {
      const updated = await api.changePermissions(selectedFile.relativePath, check.formatted);
      showToast({
        type: 'success',
        title: 'Permissions Verified (chmod)',
        message: `Successfully set permissions to ${updated.octalMode} (${updated.symbolicMode}). Verified via stat readback.`,
        command: cmd,
      });
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'chmod Failed',
        message: err.message || 'Failed to modify file permissions.',
        command: cmd,
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  // Submit chown
  const handleApplyChown = async () => {
    if (!selectedFile) return;
    setSubmittingAction('chown');
    const cmd = `chown ${selectedOwner}:${selectedGroup} /sandbox/${selectedFile.relativePath}`;

    try {
      const updated = await api.changeOwnership(selectedFile.relativePath, selectedOwner, selectedGroup);
      showToast({
        type: 'success',
        title: 'Ownership Verified (chown)',
        message: `Ownership changed to ${updated.owner}:${updated.group}. Verified via stat readback.`,
        command: cmd,
      });
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'chown Failed',
        message: err.message || 'Failed to change file ownership.',
        command: cmd,
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  // Delete file
  const handleDeleteFile = async (file: SandboxFile) => {
    if (!confirm(`Delete test ${file.isDirectory ? 'directory' : 'file'} '${file.relativePath}'?`)) return;
    setSubmittingAction(`delete-${file.relativePath}`);
    const cmd = `rm ${file.isDirectory ? '-rf ' : ''}/sandbox/${file.relativePath}`;

    try {
      await api.deleteFile(file.relativePath);
      showToast({
        type: 'success',
        title: 'Item Deleted',
        message: `Removed '${file.relativePath}' from sandbox.`,
        command: cmd,
      });
      if (selectedFile?.relativePath === file.relativePath) {
        setSelectedFile(null);
      }
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete sandbox item.',
        command: cmd,
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  const explanation = explainPermissions(octalInput, selectedFile?.isDirectory ?? false);
  const symbolicDisplay = permissionsToSymbolic(currentPerms, selectedFile?.isDirectory ?? false);

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-amber-400" />
            File Permissions &amp; Access Control
          </h2>
          <p className="text-xs text-slate-400">
            Interactive visual matrix for POSIX file mode bits (chmod) and ownership delegation (chown).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Sandbox Item
        </button>
      </div>

      {/* Main 2-Column Split: File Browser vs Visual Permission Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sandbox Explorer (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">Sandbox Items ({files.length})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]" title={health.sandboxPath}>
              {health.sandboxPath}
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[640px] overflow-y-auto">
            {files.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Sandbox is currently empty. Click &apos;Create Sandbox Item&apos; to generate test files.
              </div>
            ) : (
              files.map((file) => {
                const isSelected = selectedFile?.relativePath === file.relativePath;
                return (
                  <div
                    key={file.relativePath}
                    onClick={() => handleSelectFile(file)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-2 border-l-amber-400'
                        : 'hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.isDirectory ? (
                        <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className={`font-mono text-xs font-semibold truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {file.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="text-emerald-400">{file.symbolicMode}</span>
                          <span>&bull;</span>
                          <span>{file.octalMode}</span>
                          <span>&bull;</span>
                          <span>{file.owner}:{file.group}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file);
                      }}
                      disabled={submittingAction === `delete-${file.relativePath}`}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Delete test file"
                      aria-label={`Delete ${file.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Visual Permission Matrix & Chown (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedFile ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-5 shadow-sm">
              {/* Active Target Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    TARGET ITEM: {selectedFile.isDirectory ? 'DIRECTORY' : 'FILE'}
                  </div>
                  <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                    {selectedFile.relativePath}
                  </h3>
                </div>

                {/* Quick Presets Dropdown */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[11px] text-slate-400 font-medium">Preset:</span>
                  <select
                    onChange={(e) => handleApplyPreset(e.target.value)}
                    value={octalInput}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="0755">0755 - Executable / Dir (rwxr-xr-x)</option>
                    <option value="0644">0644 - Read-Only File (rw-r--r--)</option>
                    <option value="0600">0600 - Private Secret (rw-------)</option>
                    <option value="0700">0700 - Private Dir / Script (rwx------)</option>
                    <option value="0775">0775 - Team Collaborative (rwxrwxr-x)</option>
                    <option value="1777">1777 - Sticky Dropzone (rwxrwxrwt)</option>
                    <option value="0777">0777 - World-Writable (⚠️ Unsafe)</option>
                  </select>
                </div>
              </div>

              {/* Dual Representation Readout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Octal Permission Mode (chmod)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={octalInput}
                      onChange={(e) => handleOctalInputChange(e.target.value)}
                      className="w-24 px-3 py-1.5 bg-black border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[11px] text-slate-400 font-mono">
                      (Base-8 bitmask)
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Symbolic Linux Representation
                  </span>
                  <div className="px-3 py-1.5 bg-black border border-slate-700 rounded-lg text-cyan-400 font-mono font-bold text-base tracking-widest overflow-x-auto">
                    {symbolicDisplay}
                  </div>
                </div>
              </div>

              {/* The 9-Cell Interactive Permission Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Interactive Permission Matrix (Owner / Group / Others)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">r=4, w=2, x=1</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  {/* Table Header */}
                  <div className="p-2 text-slate-400 font-semibold bg-slate-950/60 rounded">Entity</div>
                  <div className="p-2 text-slate-400 font-semibold bg-slate-950/60 rounded">Read (4)</div>
                  <div className="p-2 text-slate-400 font-semibold bg-slate-950/60 rounded">Write (2)</div>
                  <div className="p-2 text-slate-400 font-semibold bg-slate-950/60 rounded">Execute (1)</div>

                  {/* Row 1: Owner (User) */}
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-left font-semibold text-slate-200">
                    Owner (u)
                  </div>
                  {(['read', 'write', 'execute'] as const).map((bit) => (
                    <button
                      type="button"
                      key={`owner-${bit}`}
                      onClick={() => handleToggleBit('owner', bit)}
                      className={`p-2.5 rounded border font-bold transition-all ${
                        currentPerms.owner[bit]
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {currentPerms.owner[bit] ? (bit === 'read' ? 'r' : bit === 'write' ? 'w' : 'x') : '-'}
                    </button>
                  ))}

                  {/* Row 2: Group */}
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-left font-semibold text-slate-200">
                    Group (g)
                  </div>
                  {(['read', 'write', 'execute'] as const).map((bit) => (
                    <button
                      type="button"
                      key={`group-${bit}`}
                      onClick={() => handleToggleBit('group', bit)}
                      className={`p-2.5 rounded border font-bold transition-all ${
                        currentPerms.group[bit]
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {currentPerms.group[bit] ? (bit === 'read' ? 'r' : bit === 'write' ? 'w' : 'x') : '-'}
                    </button>
                  ))}

                  {/* Row 3: Others (World) */}
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-left font-semibold text-slate-200">
                    Others (o)
                  </div>
                  {(['read', 'write', 'execute'] as const).map((bit) => (
                    <button
                      type="button"
                      key={`others-${bit}`}
                      onClick={() => handleToggleBit('others', bit)}
                      className={`p-2.5 rounded border font-bold transition-all ${
                        currentPerms.others[bit]
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {currentPerms.others[bit] ? (bit === 'read' ? 'r' : bit === 'write' ? 'w' : 'x') : '-'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Linux Bits: SUID, SGID, Sticky */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Special Permission Bits (Academic Linux Features)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => handleToggleSpecial('suid')}
                    className={`p-2 rounded border text-left transition-colors ${
                      currentPerms.special.suid
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">SUID (4000)</div>
                    <div className="text-[10px] text-slate-400">Run as file owner</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSpecial('sgid')}
                    className={`p-2 rounded border text-left transition-colors ${
                      currentPerms.special.sgid
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">SGID (2000)</div>
                    <div className="text-[10px] text-slate-400">Inherit dir group</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSpecial('sticky')}
                    className={`p-2 rounded border text-left transition-colors ${
                      currentPerms.special.sticky
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Sticky Bit (1000)</div>
                    <div className="text-[10px] text-slate-400">Prevent other deletion</div>
                  </button>
                </div>
              </div>

              {/* Academic Plain-English Explanation Card */}
              <div className="p-3.5 rounded-lg bg-black/60 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  Access Control Analysis:
                </div>
                <p className="text-slate-300 font-medium">
                  {explanation.summary}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>&bull; <strong className="text-slate-300">Owner:</strong> {explanation.ownerText}</div>
                  <div>&bull; <strong className="text-slate-300">Group:</strong> {explanation.groupText}</div>
                  <div>&bull; <strong className="text-slate-300">Others:</strong> {explanation.othersText}</div>
                </div>
                {explanation.securityNote && (
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5 mt-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{explanation.securityNote}</span>
                  </div>
                )}
              </div>

              {/* Apply Chmod Button */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleApplyChmod}
                  disabled={submittingAction !== null}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  {submittingAction === 'chmod' ? 'Executing chmod...' : `Apply chmod ${octalInput}`}
                </button>
              </div>

              {/* Change Ownership (chown) Section */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Change Ownership (chown owner:group)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      New Owner User
                    </label>
                    <select
                      value={selectedOwner}
                      onChange={(e) => setSelectedOwner(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    >
                      {users.map((u) => (
                        <option key={u.username} value={u.username}>
                          {u.username} (UID: {u.uid})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-300">
                      New Owner Group
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                    >
                      {groups.map((g) => (
                        <option key={g.groupname} value={g.groupname}>
                          {g.groupname} (GID: {g.gid})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    chown {selectedOwner}:{selectedGroup} /sandbox/{selectedFile.relativePath}
                  </span>
                  <button
                    onClick={handleApplyChown}
                    disabled={submittingAction !== null}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {submittingAction === 'chown' ? 'Executing chown...' : 'Apply chown'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-xl border border-slate-800 bg-slate-900/60 text-center text-slate-400 text-xs">
              Select a file or directory from the sandbox list to inspect or modify its permissions.
            </div>
          )}
        </div>
      </div>

      {showCreateModal && <CreateFileModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
};
