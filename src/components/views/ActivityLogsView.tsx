import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { api } from '../../services/api';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Trash2,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Users,
  FolderLock
} from 'lucide-react';

export const ActivityLogsView: React.FC = () => {
  const { logs, refreshAll, showToast } = useSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'warning'>('all');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'users' | 'groups' | 'permissions' | 'system'>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.commandSnippet && log.commandSnippet.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    return true;
  });

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to reset the system audit log?')) return;
    try {
      await api.clearLogs();
      showToast({
        type: 'info',
        title: 'Audit Logs Reset',
        message: 'Administrative activity table was cleared.',
      });
      await refreshAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Failed to clear logs.',
      });
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `linux_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Module', 'Target', 'Status', 'Message', 'Command', 'DurationMs'];
    const rows = logs.map((l) => [
      l.timestamp,
      l.action,
      l.module,
      `"${l.target.replace(/"/g, '""')}"`,
      l.status,
      `"${l.message.replace(/"/g, '""')}"`,
      `"${(l.commandSnippet || '').replace(/"/g, '""')}"`,
      l.durationMs ?? 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `linux_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-400" />
            Administrative Activity &amp; Audit Logs
          </h2>
          <p className="text-xs text-slate-400">
            Chronological audit trail of all useradd, usermod, groupdel, chmod and chown executions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Download audit logs in CSV spreadsheet format"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Download structured JSON audit trail"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Clear current log entries"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, command, target or error..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {/* Status filter */}
          {(['all', 'success', 'failed', 'warning'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="text-slate-700 mx-1">|</span>

          {/* Module filter */}
          {(['all', 'users', 'groups', 'permissions'] as const).map((mod) => (
            <button
              key={mod}
              onClick={() => setModuleFilter(mod)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                moduleFilter === mod
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-300 border border-slate-800'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action / Module</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Executed Linux Command</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Result / Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No log events match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isFailed = log.status === 'failed';
                  const isWarning = log.status === 'warning';

                  return (
                    <tr key={log.id} className="hover:bg-slate-900/90 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pl-4.5">
                          {new Date(log.timestamp).toISOString().slice(0, 10)}
                        </div>
                      </td>

                      {/* Action & Module */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-100">{log.action}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {log.module}
                          </span>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 font-mono text-emerald-300 text-xs">
                        {log.target}
                      </td>

                      {/* Executed Command */}
                      <td className="px-4 py-3 max-w-xs truncate">
                        {log.commandSnippet ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-slate-300 truncate">
                            <Terminal className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{log.commandSnippet}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isFailed
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                          {isFailed && <XCircle className="w-3 h-3" />}
                          {isWarning && <AlertTriangle className="w-3 h-3" />}
                          {log.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Result Message */}
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        <div className="truncate max-w-sm" title={log.message}>
                          {log.message}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
