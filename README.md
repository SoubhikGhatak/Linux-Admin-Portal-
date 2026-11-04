# Linux User and Permission Management System

A professional, academic Linux administration web application built with **React**, modern **Tailwind CSS**, and a **Node.js Express** backend.

Designed for computer science and systems administration coursework to explore POSIX user account provisioning, group delegation, discretionary access control (DAC), octal/symbolic permissions, and audit logging within an isolated, safe execution sandbox.

---

## Key Features

1. **Dual Execution Modes**:
   - **DEMO MODE**: Interactive simulated environment with pre-populated realistic mock users, groups, sandbox files, and audit logs. All actions mutate state with verification and logging without affecting the host.
   - **LOCAL LINUX MODE**: Directly interfaces with a live Linux machine via safe Node.js process execution. Executes real `useradd`, `userdel`, `usermod`, `groupadd`, `groupdel`, `gpasswd`, `chmod`, and `chown` operations through a strict allowlist.

2. **Security & Sandboxing**:
   - **Zero Shell Interpolation**: All system operations execute via `execFile(binary, args[])` with strictly validated arguments. Arbitrary command injection (`rm -rf /`, `$(...)`, `;`, `&&`) is structurally impossible.
   - **Protected System Accounts Guard**: System accounts with UID < 1000 (such as `root`, `daemon`, `www-data`, `nobody`) and reserved names cannot be deleted or compromised.
   - **Path Traversal Defenses**: All file permission operations are confined strictly to an explicitly configured sandbox directory (default: `/tmp/linux-mgmt-sandbox`). Attempts to traverse outside with `../` or absolute paths fail with HTTP 400.
   - **State Verification**: Every action re-reads the post-execution state (via `stat`, `getent passwd`, or `getent group`) to verify that the operation actually succeeded in system state.

3. **Modules**:
   - **System Dashboard**: Hostname, kernel, distribution, uptime, load averages (1/5/15m), memory utilization, logged-in sessions (`who`), and recent activity stream.
   - **User Management**: View accounts, create users with home directories and shells (`/bin/bash`, `/bin/zsh`, `/bin/sh`, `/usr/sbin/nologin`), lock/unlock accounts (`usermod -L/-U`), inspect `/etc/passwd` anatomy and `id` outputs, and delete non-system users.
   - **Group Management**: View groups, create user or system groups (`groupadd -r`), manage supplementary group memberships with 1-click add/remove (`gpasswd`), and delete groups safely.
   - **File Permission Management**: Interactive visual 9-cell permission matrix (Owner/Group/Others × Read/Write/Execute), special bits (SUID, SGID, Sticky), live bidirectional Octal ↔ Symbolic conversion, human-readable academic explanations, and ownership assignment (`chown`).
   - **Activity Logs (Audit)**: Chronological logging of all administrative operations with timestamp, module, target, sanitized command snippet, execution duration, and status. Supports JSON and CSV exports.
   - **Academic Documentation & Reference**: Line anatomy guides for `/etc/passwd`, `/etc/shadow`, `/etc/group`, and umask references.

---

## Local Linux Setup Instructions

### 1. Prerequisites
- Linux OS (Ubuntu 22.04/24.04, Debian 12, Fedora 39/40, or Arch Linux)
- Node.js 20+ and npm

### 2. Installation
```bash
git clone <repository_url> linux-mgmt
cd linux-mgmt
npm install
```

### 3. Configure Sandbox Directory
```bash
sudo mkdir -p /tmp/linux-mgmt-sandbox
sudo chown -R $USER:$USER /tmp/linux-mgmt-sandbox
chmod 755 /tmp/linux-mgmt-sandbox
```

### 4. Narrowly Scoped Sudoers Configuration
To allow the local daemon to perform user and group operations without running the web server as root, install a scoped sudoers rule:
```bash
sudo visudo -f /etc/sudoers.d/linux-mgmt
```
Add the following content:
```sudoers
# /etc/sudoers.d/linux-mgmt
# Least-privilege command allowlist
Cmnd_Alias USER_OPS = /usr/sbin/useradd, /usr/sbin/userdel, /usr/sbin/usermod
Cmnd_Alias GROUP_OPS = /usr/sbin/groupadd, /usr/sbin/groupdel, /usr/bin/gpasswd
Cmnd_Alias PERM_OPS = /bin/chown, /usr/bin/chown

%admin ALL=(root) NOPASSWD: USER_OPS, GROUP_OPS, PERM_OPS
```

### 5. Start the Application
```bash
# Development mode with Vite middleware
npm run dev

# Or production build
npm run build
npm start
```
The app will listen on `http://0.0.0.0:3000`.

---

## Testing Instructions

### Run Automated Unit Tests
Fast-feedback pure logic unit tests covering username validation, octal/symbolic calculations, special bits, and sandbox path traversal defenses:
```bash
npx --yes tsx --test src/utils/permissionCalculators.test.ts
```

### Test API Endpoints via cURL
```bash
# Health check & daemon status
curl -s http://localhost:3000/api/health

# System diagnostics
curl -s http://localhost:3000/api/system/info

# List sandbox files
curl -s http://localhost:3000/api/files

# Test path traversal defense (should return HTTP 400 error)
curl -s -X PATCH http://localhost:3000/api/files/permissions \
  -H "Content-Type: application/json" \
  -d '{"relativePath":"../../etc/shadow","octalMode":"0777"}'
```

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health, latency, effective UID & sandbox path |
| `GET` | `/api/system/info` | Hostname, kernel, OS release, CPU load, RAM |
| `GET` | `/api/users` | List all system users |
| `POST` | `/api/users` | Create user with validated `useradd` |
| `PATCH` | `/api/users/:username` | Modify shell, groups or lock state (`usermod`) |
| `DELETE` | `/api/users/:username` | Delete user (`userdel`) |
| `GET` | `/api/groups` | List all groups from `/etc/group` |
| `POST` | `/api/groups` | Create group (`groupadd`) |
| `DELETE` | `/api/groups/:groupname` | Delete group (`groupdel`) |
| `POST` | `/api/groups/:groupname/members` | Add user to group (`gpasswd -a`) |
| `DELETE` | `/api/groups/:groupname/members/:username` | Remove user from group (`gpasswd -d`) |
| `GET` | `/api/files` | List sandbox items with `stat` readback |
| `POST` | `/api/files` | Create sandbox file or directory |
| `PATCH` | `/api/files/permissions` | Apply permissions via `chmod` |
| `PATCH` | `/api/files/ownership` | Change owner/group via `chown` |
| `DELETE` | `/api/files` | Delete sandbox file/dir |
| `GET` | `/api/logs` | Fetch activity audit log events |
| `DELETE` | `/api/logs` | Clear audit log |
