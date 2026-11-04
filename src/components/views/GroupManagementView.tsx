import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { LinuxGroup } from '../../types';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Trash2,
  UserPlus,
  Shield,
  Users,
  AlertTriangle,
  Terminal,
  BookOpen
} from 'lucide-react';
import { CreateGroupModal } from '../modals/CreateGroupModal';
import { ManageMembersModal } from '../modals/ManageMembersModal';

export const GroupManagementView: React.FC = () => {
  const { groups, users, refreshAll, showToast } = useSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'system'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingGroup, setManagingGroup] = useState<LinuxGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<LinuxGroup | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.groupname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(g.gid).includes(searchTerm) ||
      g.members.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'user') return !g.isSystem;
    if (filterType === 'system') return g.isSystem;
    return true;
  });

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;

    // Check if group is primary group of any user
    const hasPrimaryUsers = users.some((u) => u.primaryGroup === deletingGroup.groupname);
    if (hasPrimaryUsers) {
      showToast({
        type: 'error',
        title: 'Deletion Blocked',
        message: `Group '${deletingGroup.groupname}' cannot be deleted because it is the primary group for one or more users.`,
      });
      setDeletingGroup(null);
      return;
    }

    const cmd = `groupdel ${deletingGroup.groupname}`;
    setActionLoading(`delete-${deletingGroup.groupname}`);

    try {
      await api.deleteGroup(deletingGroup.groupname);
      showToast({
        type: 'success',
        title: 'Group Deleted',
        message: `Linux group '${deletingGroup.groupname}' removed from /etc/group.`,
        command: cmd,
      });
      setDeletingGroup(null);
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete group.',
        command: cmd,
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Linux Group Management
          </h2>
          <p className="text-xs text-slate-400">
            Configure primary and supplementary group memberships for discretionary access control (DAC).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-2 shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Group
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by group name, GID, or member..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {[
            { id: 'all', label: `All (${groups.length})` },
            { id: 'user', label: `User-defined (${groups.filter((g) => !g.isSystem).length})` },
            { id: 'system', label: `System (${groups.filter((g) => g.isSystem).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterType === tab.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Group Name / GID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Assigned Members</th>
                <th className="px-4 py-3">Member Count</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No groups matching search filter.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.groupname} className="hover:bg-slate-900/90 transition-colors">
                    {/* Name & GID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700/80 flex items-center justify-center font-mono font-bold text-xs text-cyan-400 shrink-0">
                          #
                        </div>
                        <div>
                          <div className="font-mono font-semibold text-slate-100 flex items-center gap-1.5">
                            {group.groupname}
                            {group.isProtected && (
                              <span title="Protected System Group">
                                <Shield className="w-3 h-3 text-amber-400" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            GID: {group.gid}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          group.isSystem
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {group.isSystem ? 'System (GID < 1000)' : 'Standard User Group'}
                      </span>
                    </td>

                    {/* Members List */}
                    <td className="px-4 py-3 max-w-md">
                      {group.members.length === 0 ? (
                        <span className="text-slate-600 italic">No supplementary members</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {group.members.map((m) => (
                            <span
                              key={m}
                              className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800/90 text-slate-200 border border-slate-700"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Count */}
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Manage Members */}
                        <button
                          onClick={() => setManagingGroup(group)}
                          className="px-2.5 py-1 rounded text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1"
                          title="Add or remove members (gpasswd)"
                        >
                          <UserPlus className="w-3 h-3 text-emerald-400" />
                          <span>Members</span>
                        </button>

                        {/* Delete Group */}
                        <button
                          onClick={() => setDeletingGroup(group)}
                          disabled={group.isProtected || actionLoading === `delete-${group.groupname}`}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 transition-colors"
                          title={group.isProtected ? 'Protected group cannot be deleted' : 'Delete group (groupdel)'}
                          aria-label={`Delete group ${group.groupname}`}
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
      {deletingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-100">Confirm Group Deletion</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove group <strong className="font-mono text-cyan-400">{deletingGroup.groupname}</strong> (GID: {deletingGroup.gid})?
            </p>

            <div className="p-2.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-rose-400">
              groupdel {deletingGroup.groupname}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingGroup(null)}
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

      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
      {managingGroup && <ManageMembersModal group={managingGroup} onClose={() => setManagingGroup(null)} />}
    </div>
  );
};
