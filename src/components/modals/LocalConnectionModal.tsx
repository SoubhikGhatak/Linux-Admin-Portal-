import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import { X, Server, Wifi, Check, AlertCircle, Copy, Terminal, Shield } from 'lucide-react';

export const LocalConnectionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { mode, setMode, backendUrl, setBackendUrl, health, refreshAll, showToast } = useSystem();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    setTesting(true);
    setBackendUrl(urlInput);
    setMode('local');
    await refreshAll();
    setTesting(false);
    showToast({
      type: 'info',
      title: 'Connection Updated',
      message: 'Updated target Linux backend configuration.',
    });
    onClose();
  };

  const sudoersSnippet = `# /etc/sudoers.d/linux-mgmt
# Academic Linux Management Daemon - Narrowly Scoped Allowlist
%admin ALL=(root) NOPASSWD: /usr/sbin/useradd, /usr/sbin/userdel, /usr/sbin/usermod, /usr/sbin/groupadd, /usr/sbin/groupdel, /usr/bin/gpasswd, /bin/chown`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Local Linux Backend Configuration</h3>
              <p className="text-xs text-slate-400">Configure connection to real Linux system or integrated daemon</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Mode Switch Card */}
          <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Execution Environment Mode</div>
              <p className="text-[11px] text-slate-400">
                {mode === 'local'
                  ? 'Currently targeting Real Linux Backend with strict command allowlist.'
                  : 'Currently operating in Demo Mode with persistent mock Linux state.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('demo')}
                className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                  mode === 'demo'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                Demo Mode
              </button>
              <button
                onClick={() => setMode('local')}
                className={`px-3 py-1.5 rounded-md font-medium text-xs transition-all ${
                  mode === 'local'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                Local Linux
              </button>
            </div>
          </div>

          {/* Connection URL */}
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-200">
              Backend Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Leave blank for integrated /api (or e.g. http://localhost:3000)"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSave}
                disabled={testing}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Wifi className="w-3.5 h-3.5" />
                {testing ? 'Testing...' : 'Connect'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Default is empty, which routes to the integrated full-stack Node.js server.
            </p>
          </div>

          {/* Current Health Status */}
          <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Backend Health &amp; Privileges</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${health.isLocalBackendAvailable ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                {health.isLocalBackendAvailable ? 'ACTIVE DAEMON' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
              <div>Effective UID: <span className="text-slate-200">{health.currentUid}</span> ({health.currentLinuxUser})</div>
              <div>Ping Latency: <span className="text-slate-200">{health.latencyMs} ms</span></div>
              <div className="col-span-2 truncate">Sandbox Directory: <span className="text-cyan-400">{health.sandboxPath}</span></div>
            </div>
          </div>

          {/* Academic Sudoers Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Security Model: Narrowly Scoped Sudoers
              </span>
              <button
                onClick={() => handleCopy(sudoersSnippet, 'sudoers')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copied === 'sudoers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Sudoers Rule
              </button>
            </div>
            <div className="p-3 bg-black/60 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
              <pre>{sudoersSnippet}</pre>
            </div>
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300/90 text-[11px] flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong>Least-Privilege Enforcement:</strong> The backend never allows raw shell commands or arbitrary root commands. Only the specific binaries listed above are permitted with validated argument schemas.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/40">
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
