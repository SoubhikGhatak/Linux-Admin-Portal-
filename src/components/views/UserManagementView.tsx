import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { LinuxUser } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  Eye,
  Shield,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { CreateUserModal } from '../modals/CreateUserModal';
import { EditUserModal } from '../modals/EditUserModal';
import { InspectUserModal } from '../modals/InspectUserModal';

export const UserManagementView: React.FC = () => {
  const { users, refreshAll, showToast } = useSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'system' | 'locked'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<LinuxUser | null>(null);
  const [inspectingUser, setInspectingUser] = useState<LinuxUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<LinuxUser | null>(null);
  const [removeHomeOnDelete, setRemoveHomeOnDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.gecos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.uid).includes(searchTerm);

    if (!matchesSearch) return false;
    if (filterType === 'regular') return !u.isSystem;
    if (filterType === 'system') return u.isSystem;
    if (filterType === 'locked') return u.isLocked;
    return true;
  });

  const handleToggleLock = async (user: LinuxUser) => {
    if (user.isProtected) {
      showToast({
        type: 'error',
        title: 'Protected Account',
        message: `Cannot toggle lock state for protected system account '${user.username}'.`,
      });
      return;
    }

    const nextLockState = !user.isLocked;
    const cmd = `usermod ${nextLockState ? '-L' : '-U'} ${user.username}`;
    setActionLoading(`lock-${user.username}`);

    try {
      await api.modifyUser(user.username, { lockAccount: nextLockState });
      showToast({
        type: 'success',
        title: nextLockState ? 'Account Locked' : 'Account Unlocked',
        message: `Account '${user.username}' is now ${nextLockState ? 'locked' : 'active'}.`,
        command: cmd,
      });
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lock Toggle Failed',
        message: err.message || 'Failed to update user lock state.',
        command: cmd,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    const cmd = `userdel ${removeHomeOnDelete ? '-r ' : ''}${deletingUser.username}`;
    setActionLoading(`delete-${deletingUser.username}`);

    try {
      await api.deleteUser(deletingUser.username, removeHomeOnDelete);
      showToast({
        type: 'success',
        title: 'User Deleted',
        message: `Linux user account '${deletingUser.username}' was removed from the system.`,
        command: cmd,
      });
      setDeletingUser(null);
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete user.',
        command: cmd,
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Linux User Account Management
          </h2>
          <p className="text-xs text-slate-400">
            Provision, modify, and audit POSIX users in accordance with <code>/etc/passwd</code> and shadow specifications.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Create New User
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username, UID, or name..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {[
            { id: 'all', label: `All (${users.length})` },
            { id: 'regular', label: `Regular (${users.filter((u) => !u.isSystem).length})` },
            { id: 'system', label: `System (${users.filter((u) => u.isSystem).length})` },
            { id: 'locked', label: `Locked (${users.filter((u) => u.isLocked).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                filterType === tab.id
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Account / UID</th>
                <th className="px-4 py-3">Full Name (GECOS)</th>
                <th className="px-4 py-3">Primary / Supplementary Groups</th>
                <th className="px-4 py-3">Home / Shell</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.username} className="hover:bg-slate-900/90 transition-colors">
                    {/* Username & UID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700/80 flex items-center justify-center font-mono font-bold text-xs text-emerald-400 shrink-0">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-slate-100 flex items-center gap-1.5">
                            {user.username}
                            {user.isProtected && (
                              <span title="Protected System Account">
                                <Shield className="w-3 h-3 text-amber-400" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            UID: {user.uid}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* GECOS */}
                    <td className="px-4 py-3 max-w-[180px] truncate text-slate-300">
                      {user.gecos || <span className="text-slate-600 italic">None</span>}
                    </td>

                    {/* Groups */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1 max-w-xs">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          {user.primaryGroup} (GID: {user.gid})
                        </span>
                        {user.supplementaryGroups.map((g) => (
                          <span
                            key={g}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Home & Shell */}
                    <td className="px-4 py-3 font-mono text-[11px]">
                      <div className="truncate max-w-[160px] text-slate-300">{user.homeDir}</div>
                      <div className="text-slate-400 truncate max-w-[160px]">{user.shell}</div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {user.isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Inspect */}
                        <button
                          onClick={() => setInspectingUser(user)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Inspect account and id output"
                          aria-label={`Inspect account ${user.username}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Properties */}
                        <button
                          onClick={() => setEditingUser(user)}
                          disabled={user.isProtected}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition-colors"
                          title={user.isProtected ? 'Protected system account' : 'Edit properties (usermod)'}
                          aria-label={`Edit ${user.username}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Lock / Unlock */}
                        <button
                          onClick={() => handleToggleLock(user)}
                          disabled={user.isProtected || actionLoading === `lock-${user.username}`}
                          className={`p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors ${
                            user.isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-rose-400'
                          }`}
                          title={user.isLocked ? 'Unlock account (usermod -U)' : 'Lock account (usermod -L)'}
                          aria-label={`Toggle lock for ${user.username}`}
                        >
                          {user.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            setRemoveHomeOnDelete(false);
                            setDeletingUser(user);
                          }}
                          disabled={user.isProtected || actionLoading === `delete-${user.username}`}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-colors"
                          title={user.isProtected ? 'Protected account cannot be deleted' : 'Delete account (userdel)'}
                          aria-label={`Delete ${user.username}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-100">Confirm Linux User Account Deletion</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete user account <strong className="font-mono text-emerald-400">{deletingUser.username}</strong> (UID: {deletingUser.uid})?
            </p>

            <label className="flex items-center gap-2 text-xs text-slate-300 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={removeHomeOnDelete}
                onChange={(e) => setRemoveHomeOnDelete(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 w-4 h-4"
              />
              <span>Also delete user home directory (<code>userdel -r</code>)</span>
            </label>

            <div className="p-2.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-rose-400">
              userdel {removeHomeOnDelete ? '-r ' : ''}{deletingUser.username}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {actionLoading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}
      {inspectingUser && <InspectUserModal user={inspectingUser} onClose={() => setInspectingUser(null)} />}
    </div>
  );
};
