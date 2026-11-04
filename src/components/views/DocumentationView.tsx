import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Shield,
  Server,
  Code,
  Copy,
  Check,
  FileText,
  KeyRound,
  GraduationCap
} from 'lucide-react';

export const DocumentationView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sudoersCode = `# /etc/sudoers.d/linux-mgmt
# Strict least-privilege allowlist for Academic Linux Management Daemon
# Do not grant unrestricted ALL=(ALL) root access!

Cmnd_Alias USER_OPS = /usr/sbin/useradd, /usr/sbin/userdel, /usr/sbin/usermod
Cmnd_Alias GROUP_OPS = /usr/sbin/groupadd, /usr/sbin/groupdel, /usr/bin/gpasswd
Cmnd_Alias PERM_OPS = /bin/chown, /usr/bin/chown

# Allow service runner or admin group to run only these commands non-interactively
%admin ALL=(root) NOPASSWD: USER_OPS, GROUP_OPS, PERM_OPS`;

  const installCode = `# 1. Clone repository & install dependencies
git clone <repo_url> linux-mgmt-app
cd linux-mgmt-app
npm install

# 2. Configure environment
cat << 'EOF' > .env
PORT=3000
SANDBOX_DIR=/tmp/linux-mgmt-sandbox
NODE_ENV=production
EOF

# 3. Create sandboxed testing directory
sudo mkdir -p /tmp/linux-mgmt-sandbox
sudo chown -R $USER:$USER /tmp/linux-mgmt-sandbox
chmod 755 /tmp/linux-mgmt-sandbox

# 4. Install scoped sudoers rule (optional for real useradd/chown)
sudo visudo -f /etc/sudoers.d/linux-mgmt

# 5. Run daemon
npm run build
npm start`;

  const testInstructions = `# Run automated logic & security tests
npx --yes tsx --test src/utils/permissionCalculators.test.ts

# Test REST API health check via curl
curl -s http://localhost:3000/api/health | jq .

# Test sandbox files endpoint
curl -s http://localhost:3000/api/files | jq .`;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          Academic Guide &amp; Technical Documentation
        </h2>
        <p className="text-xs text-slate-400">
          Architecture overview, real Linux host deployment, sudoers hardening, and API specification.
        </p>
      </div>

      {/* Dual Mode Overview Card */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Dual Execution Modes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              1. DEMO MODE (Preview &amp; Simulation)
            </div>
            <p className="text-slate-300 leading-relaxed">
              Ideal for classroom demonstration, testing, and UI grading without modifying any host files. Operates on a simulated Linux in-memory state seeded with standard academic users, groups, and files. All mutations are persistent and verify state.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              2. LOCAL LINUX MODE (Real System Agent)
            </div>
            <p className="text-slate-300 leading-relaxed">
              Communicates with the Node.js daemon running directly on a Linux machine (Ubuntu, Debian, Fedora, Arch). Executes real <code>useradd</code>, <code>usermod</code>, <code>chmod</code>, and <code>chown</code> calls strictly through an argument allowlist and safe process calls without shell interpolation.
            </p>
          </div>
        </div>
      </div>

      {/* Security Threat Model & Protections */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          Security Threat Model &amp; Defenses
        </h3>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <strong className="text-slate-100 block mb-1">1. Zero Shell String Interpolation:</strong>
            All commands use <code>child_process.execFile(binaryPath, argsArray)</code> instead of <code>child_process.exec(&apos;cmd &apos; + input)</code>. Attack vectors such as <code>username; rm -rf /</code> or <code>$(whoami)</code> are completely neutralized because arguments are passed directly to OS kernel execve.
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <strong className="text-slate-100 block mb-1">2. Protected System Accounts Guard:</strong>
            Accounts with UID &lt; 1000 (such as <code>root</code>, <code>daemon</code>, <code>bin</code>, <code>www-data</code>, <code>nobody</code>) and reserved system names are protected from deletion or unauthorized modification.
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <strong className="text-slate-100 block mb-1">3. Path Traversal &amp; Sandbox Enforcement:</strong>
            All file permission operations (<code>chmod</code>, <code>chown</code>, <code>rm</code>) are strictly quarantined to the configured sandbox directory (e.g. <code>/tmp/linux-mgmt-sandbox</code>). Paths attempting traversal via <code>../</code> or absolute escapes outside the sandbox are rejected with HTTP 400.
          </div>
        </div>
      </div>

      {/* Sudoers Hardening Configuration */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Narrowly Scoped Sudoers Rule (/etc/sudoers.d/linux-mgmt)
          </h3>
          <button
            onClick={() => copyToClipboard(sudoersCode, 'sudoers')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {copiedSection === 'sudoers' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Rule
          </button>
        </div>
        <div className="p-3.5 bg-black/70 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto">
          <pre>{sudoersCode}</pre>
        </div>
      </div>

      {/* Installation & Deployment Guide */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            Local Linux Host Deployment Steps
          </h3>
          <button
            onClick={() => copyToClipboard(installCode, 'install')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {copiedSection === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Script
          </button>
        </div>
        <div className="p-3.5 bg-black/70 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
          <pre>{installCode}</pre>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            Testing Instructions &amp; Verification Suite
          </h3>
          <button
            onClick={() => copyToClipboard(testInstructions, 'test')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {copiedSection === 'test' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Test Commands
          </button>
        </div>
        <div className="p-3.5 bg-black/70 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto">
          <pre>{testInstructions}</pre>
        </div>
      </div>

      {/* API Reference Table */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          REST API Endpoint Reference
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Endpoint</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              <tr>
                <td className="px-3 py-2 text-emerald-400">GET</td>
                <td className="px-3 py-2">/api/health</td>
                <td className="px-3 py-2 font-sans text-slate-400">Connection health, latency &amp; user privileges</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-emerald-400">GET</td>
                <td className="px-3 py-2">/api/system/info</td>
                <td className="px-3 py-2 font-sans text-slate-400">Hostname, kernel, OS, uptime, load averages</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-emerald-400">GET</td>
                <td className="px-3 py-2">/api/users</td>
                <td className="px-3 py-2 font-sans text-slate-400">Parse /etc/passwd and return Linux user records</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-cyan-400">POST</td>
                <td className="px-3 py-2">/api/users</td>
                <td className="px-3 py-2 font-sans text-slate-400">Create new user with safe useradd execution</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-amber-400">PATCH</td>
                <td className="px-3 py-2">/api/users/:username</td>
                <td className="px-3 py-2 font-sans text-slate-400">Modify shell, supplementary groups, or lock status</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-rose-400">DELETE</td>
                <td className="px-3 py-2">/api/users/:username</td>
                <td className="px-3 py-2 font-sans text-slate-400">Remove user account via userdel (with optional -r)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-emerald-400">GET</td>
                <td className="px-3 py-2">/api/groups</td>
                <td className="px-3 py-2 font-sans text-slate-400">List all Linux groups from /etc/group</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-cyan-400">POST</td>
                <td className="px-3 py-2">/api/groups</td>
                <td className="px-3 py-2 font-sans text-slate-400">Create group via groupadd (supports -r for system)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-cyan-400">POST</td>
                <td className="px-3 py-2">/api/groups/:groupname/members</td>
                <td className="px-3 py-2 font-sans text-slate-400">Add member user to group via gpasswd -a</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-emerald-400">GET</td>
                <td className="px-3 py-2">/api/files</td>
                <td className="px-3 py-2 font-sans text-slate-400">Inspect sandbox files with detailed stat readback</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-amber-400">PATCH</td>
                <td className="px-3 py-2">/api/files/permissions</td>
                <td className="px-3 py-2 font-sans text-slate-400">Change permissions via chmod with state verification</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-amber-400">PATCH</td>
                <td className="px-3 py-2">/api/files/ownership</td>
                <td className="px-3 py-2 font-sans text-slate-400">Change file owner/group via chown with verification</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-emerald-400">GET</td>
                <td className="px-3 py-2">/api/logs</td>
                <td className="px-3 py-2 font-sans text-slate-400">Retrieve chronological administrative audit events</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
