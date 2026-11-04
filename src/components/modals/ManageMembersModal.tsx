import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import { LinuxGroup } from '../../types';
import { X, UserCheck, UserPlus, UserMinus, Terminal, Shield } from 'lucide-react';

export const ManageMembersModal: React.FC<{ group: LinuxGroup; onClose: () => void }> = ({ group, onClose }) => {
  const { users, refreshAll, showToast } = useSystem();
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Available users not currently in this group
  const nonMembers = users.filter((u) => !group.members.includes(u.username) && u.primaryGroup !== group.groupname);

  const handleAddMember = async () => {
    if (!selectedUserToAdd) return;
    setLoadingAction(`add-${selectedUserToAdd}`);
    const cmd = `gpasswd -a ${selectedUserToAdd} ${group.groupname}`;

    try {
      await api.addGroupMember(group.groupname, selectedUserToAdd);
      showToast({
        type: 'success',
        title: 'Member Added',
        message: `Added user '${selectedUserToAdd}' to group '${group.groupname}'.`,
        command: cmd,
      });
      setSelectedUserToAdd('');
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Add Member Failed',
        message: err.message || 'Failed to add member to group.',
        command: cmd,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveMember = async (username: string) => {
    setLoadingAction(`remove-${username}`);
    const cmd = `gpasswd -d ${username} ${group.groupname}`;

    try {
      await api.removeGroupMember(group.groupname, username);
      showToast({
        type: 'success',
        title: 'Member Removed',
        message: `Removed user '${username}' from group '${group.groupname}'.`,
        command: cmd,
      });
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Remove Member Failed',
        message: err.message || 'Failed to remove member from group.',
        command: cmd,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Manage Group Members</h3>
              <p className="text-xs text-slate-400 font-mono">
                {group.groupname} (GID: {group.gid}) &bull; {group.members.length} members
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Add Member Bar */}
          <div className="space-y-2 p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <label className="block font-semibold text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              Add User to Group (gpasswd -a)
            </label>
            <div className="flex gap-2">
              <select
                value={selectedUserToAdd}
                onChange={(e) => setSelectedUserToAdd(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a user account...</option>
                {nonMembers.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.username} (UID: {u.uid})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedUserToAdd || loadingAction !== null}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Current Members List */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-200 flex items-center justify-between">
              <span>Current Members ({group.members.length})</span>
              <span className="text-[11px] text-slate-400 font-mono">/etc/group lookup</span>
            </span>

            {group.members.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 text-center text-slate-400">
                No supplementary members currently assigned to this group.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {group.members.map((member) => (
                  <div
                    key={member}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold">
                        {member[0].toUpperCase()}
                      </div>
                      <span className="font-mono text-slate-200">{member}</span>
                    </div>

                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleRemoveMember(member)}
                      className="px-2.5 py-1 rounded text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors flex items-center gap-1"
                      title={`Remove ${member} from ${group.groupname}`}
                    >
                      <UserMinus className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Academic explanation */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <Terminal className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong>Academic Note:</strong> In Linux, users have one primary GID recorded in <code>/etc/passwd</code>, and zero or more supplementary groups recorded in <code>/etc/group</code>. <code>gpasswd</code> modifies supplementary group membership.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
