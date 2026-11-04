import {
  LinuxUser,
  LinuxGroup,
  SandboxFile,
  ActivityLog,
  SystemDiagnostics,
  SystemMode
} from '../types';
import {
  INITIAL_DEMO_USERS,
  INITIAL_DEMO_GROUPS,
  INITIAL_DEMO_FILES,
  INITIAL_DEMO_LOGS,
  INITIAL_DEMO_DIAGNOSTICS
} from './mockData';
import {
  validateUsername,
  validateGroupname,
  isProtectedAccount,
  validateOctal,
  permissionsToSymbolic,
  octalToPermissions,
  sanitizeSandboxPath
} from '../utils/permissionCalculators';

// LocalStorage keys for Demo persistence
const STORAGE_KEYS = {
  USERS: 'linux_mgmt_demo_users_v1',
  GROUPS: 'linux_mgmt_demo_groups_v1',
  FILES: 'linux_mgmt_demo_files_v1',
  LOGS: 'linux_mgmt_demo_logs_v1',
};

// Helper for local mock storage
function loadMock<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveMock<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota issues
  }
}

export class LinuxService {
  private mode: SystemMode = 'demo';
  private customBaseUrl: string = '';

  constructor() {
    // initialize storage if empty
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      saveMock(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
      saveMock(STORAGE_KEYS.GROUPS, INITIAL_DEMO_GROUPS);
      saveMock(STORAGE_KEYS.FILES, INITIAL_DEMO_FILES);
      saveMock(STORAGE_KEYS.LOGS, INITIAL_DEMO_LOGS);
    }
  }

  public setMode(mode: SystemMode) {
    this.mode = mode;
  }

  public getMode(): SystemMode {
    return this.mode;
  }

  public setCustomBaseUrl(url: string) {
    this.customBaseUrl = url.trim().replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.customBaseUrl || '';
  }

  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    if (!res.ok) {
      let errorMsg = `Server error HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body.error) errorMsg = body.error;
      } catch {
        errorMsg = await res.text() || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Check health and ping
  public async checkHealth(): Promise<{ isAvailable: boolean; latencyMs: number; data?: any }> {
    const start = performance.now();
    try {
      const data = await this.fetchApi<any>('/api/health');
      const latencyMs = Math.round(performance.now() - start);
      return { isAvailable: true, latencyMs, data };
    } catch {
      return { isAvailable: false, latencyMs: 0 };
    }
  }

  // System Diagnostics
  public async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    if (this.mode === 'local') {
      return this.fetchApi<SystemDiagnostics>('/api/system/info');
    }
    // Demo mode: update uptime and return realistic data
    const diag = { ...INITIAL_DEMO_DIAGNOSTICS };
    diag.uptimeSeconds += 1;
    return diag;
  }

  // ================= USERS =================

  public async getUsers(): Promise<LinuxUser[]> {
    if (this.mode === 'local') {
      return this.fetchApi<LinuxUser[]>('/api/users');
    }
    return loadMock<LinuxUser[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
  }

  public async createUser(options: {
    username: string;
    gecos?: string;
    shell?: string;
    createHome?: boolean;
    primaryGroup?: string;
    groups?: string[];
  }): Promise<LinuxUser> {
    if (this.mode === 'local') {
      return this.fetchApi<LinuxUser>('/api/users', {
        method: 'POST',
        body: JSON.stringify(options),
      });
    }

    // Demo Mode Simulation
    const val = validateUsername(options.username);
    if (!val.valid) throw new Error(val.error);

    if (isProtectedAccount(options.username)) {
      throw new Error(`Cannot create reserved system username '${options.username}'.`);
    }

    const users = loadMock<LinuxUser[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    if (users.some(u => u.username === options.username)) {
      throw new Error(`User '${options.username}' already exists.`);
    }

    const nextUid = Math.max(1000, ...users.map(u => u.uid)) + 1;
    const primary = options.primaryGroup || options.username;
    const supp = options.groups || [];

    const newUser: LinuxUser = {
      username: options.username,
      uid: nextUid,
      gid: nextUid,
      primaryGroup: primary,
      supplementaryGroups: supp,
      gecos: options.gecos || options.username,
      homeDir: options.createHome !== false ? `/home/${options.username}` : '/nonexistent',
      shell: options.shell || '/bin/bash',
      isSystem: false,
      isLocked: false,
      isProtected: false,
    };

    users.push(newUser);
    saveMock(STORAGE_KEYS.USERS, users);

    await this.recordLog({
      action: 'USER_CREATE',
      module: 'users',
      target: options.username,
      commandSnippet: `useradd ${options.createHome !== false ? '-m ' : ''}-s ${newUser.shell} -g ${primary}${supp.length ? ` -G ${supp.join(',')}` : ''} ${options.username}`,
      mode: 'demo',
      status: 'success',
      message: `Created user '${options.username}' (UID ${nextUid}) in Demo Mode.`,
      durationMs: 8,
    });

    return newUser;
  }

  public async deleteUser(username: string, removeHome: boolean = false): Promise<void> {
    if (this.mode === 'local') {
      await this.fetchApi(`/api/users/${encodeURIComponent(username)}?removeHome=${removeHome}`, {
        method: 'DELETE',
      });
      return;
    }

    // Demo Mode
    const val = validateUsername(username);
    if (!val.valid) throw new Error(val.error);

    if (isProtectedAccount(username)) {
      throw new Error(`Account '${username}' is a protected system account and cannot be deleted.`);
    }

    const users = loadMock<LinuxUser[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const filtered = users.filter(u => u.username !== username);
    if (filtered.length === users.length) {
      throw new Error(`User '${username}' not found.`);
    }

    saveMock(STORAGE_KEYS.USERS, filtered);

    await this.recordLog({
      action: 'USER_DELETE',
      module: 'users',
      target: username,
      commandSnippet: `userdel ${removeHome ? '-r ' : ''}${username}`,
      mode: 'demo',
      status: 'success',
      message: `Deleted user '${username}' (Demo Mode).`,
      durationMs: 5,
    });
  }

  public async modifyUser(username: string, updates: {
    shell?: string;
    gecos?: string;
    supplementaryGroups?: string[];
    lockAccount?: boolean;
  }): Promise<LinuxUser> {
    if (this.mode === 'local') {
      return this.fetchApi<LinuxUser>(`/api/users/${encodeURIComponent(username)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    }

    // Demo Mode
    const users = loadMock<LinuxUser[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    const user = users.find(u => u.username === username);
    if (!user) throw new Error(`User '${username}' not found.`);

    if (user.isProtected) {
      throw new Error(`Forbidden: Modifying protected account '${username}' is restricted.`);
    }

    if (updates.shell) user.shell = updates.shell;
    if (updates.gecos !== undefined) user.gecos = updates.gecos;
    if (updates.supplementaryGroups) user.supplementaryGroups = updates.supplementaryGroups;
    if (updates.lockAccount !== undefined) user.isLocked = updates.lockAccount;

    saveMock(STORAGE_KEYS.USERS, users);

    await this.recordLog({
      action: 'USER_MODIFY',
      module: 'users',
      target: username,
      commandSnippet: `usermod ${updates.lockAccount ? '-L ' : updates.lockAccount === false ? '-U ' : ''}${username}`,
      mode: 'demo',
      status: 'success',
      message: `Updated account properties for '${username}'.`,
      durationMs: 7,
    });

    return user;
  }

  // ================= GROUPS =================

  public async getGroups(): Promise<LinuxGroup[]> {
    if (this.mode === 'local') {
      return this.fetchApi<LinuxGroup[]>('/api/groups');
    }
    return loadMock<LinuxGroup[]>(STORAGE_KEYS.GROUPS, INITIAL_DEMO_GROUPS);
  }

  public async createGroup(groupname: string, isSystem: boolean = false): Promise<LinuxGroup> {
    if (this.mode === 'local') {
      return this.fetchApi<LinuxGroup>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ groupname, isSystem }),
      });
    }

    const val = validateGroupname(groupname);
    if (!val.valid) throw new Error(val.error);

    if (isProtectedAccount(groupname)) {
      throw new Error(`Cannot create reserved system group '${groupname}'.`);
    }

    const groups = loadMock<LinuxGroup[]>(STORAGE_KEYS.GROUPS, INITIAL_DEMO_GROUPS);
    if (groups.some(g => g.groupname === groupname)) {
      throw new Error(`Group '${groupname}' already exists.`);
    }

    const nextGid = isSystem ? 950 : Math.max(1000, ...groups.map(g => g.gid)) + 1;
    const newGroup: LinuxGroup = {
      groupname,
      gid: nextGid,
      members: [],
      isSystem,
      isProtected: false,
    };

    groups.push(newGroup);
    saveMock(STORAGE_KEYS.GROUPS, groups);

    await this.recordLog({
      action: 'GROUP_CREATE',
      module: 'groups',
      target: groupname,
      commandSnippet: `groupadd ${isSystem ? '-r ' : ''}${groupname}`,
      mode: 'demo',
      status: 'success',
      message: `Created group '${groupname}' (GID: ${nextGid}).`,
      durationMs: 6,
    });

    return newGroup;
  }

  public async deleteGroup(groupname: string): Promise<void> {
    if (this.mode === 'local') {
      await this.fetchApi(`/api/groups/${encodeURIComponent(groupname)}`, {
        method: 'DELETE',
      });
      return;
    }

    const groups = loadMock<LinuxGroup[]>(STORAGE_KEYS.GROUPS, INITIAL_DEMO_GROUPS);
    const target = groups.find(g => g.groupname === groupname);
    if (!target) throw new Error(`Group '${groupname}' not found.`);

    if (target.isProtected) {
      throw new Error(`Cannot delete protected group '${groupname}'.`);
    }

    const filtered = groups.filter(g => g.groupname !== groupname);
    saveMock(STORAGE_KEYS.GROUPS, filtered);

    await this.recordLog({
      action: 'GROUP_DELETE',
      module: 'groups',
      target: groupname,
      commandSnippet: `groupdel ${groupname}`,
      mode: 'demo',
      status: 'success',
      message: `Deleted group '${groupname}'.`,
      durationMs: 4,
    });
  }

  public async addGroupMember(groupname: string, username: string): Promise<void> {
    if (this.mode === 'local') {
      await this.fetchApi(`/api/groups/${encodeURIComponent(groupname)}/members`, {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      return;
    }

    const groups = loadMock<LinuxGroup[]>(STORAGE_KEYS.GROUPS, INITIAL_DEMO_GROUPS);
    const grp = groups.find(g => g.groupname === groupname);
    if (!grp) throw new Error(`Group '${groupname}' not found.`);

    if (!grp.members.includes(username)) {
      grp.members.push(username);
      saveMock(STORAGE_KEYS.GROUPS, groups);
    }

    await this.recordLog({
      action: 'GROUP_ADD_MEMBER',
      module: 'groups',
      target: `${groupname} (+${username})`,
      commandSnippet: `gpasswd -a ${username} ${groupname}`,
      mode: 'demo',
      status: 'success',
      message: `Added user '${username}' to group '${groupname}'.`,
      durationMs: 5,
    });
  }

  public async removeGroupMember(groupname: string, username: string): Promise<void> {
    if (this.mode === 'local') {
      await this.fetchApi(`/api/groups/${encodeURIComponent(groupname)}/members/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      return;
    }

    const groups = loadMock<LinuxGroup[]>(STORAGE_KEYS.GROUPS, INITIAL_DEMO_GROUPS);
    const grp = groups.find(g => g.groupname === groupname);
    if (!grp) throw new Error(`Group '${groupname}' not found.`);

    grp.members = grp.members.filter(m => m !== username);
    saveMock(STORAGE_KEYS.GROUPS, groups);

    await this.recordLog({
      action: 'GROUP_REMOVE_MEMBER',
      module: 'groups',
      target: `${groupname} (-${username})`,
      commandSnippet: `gpasswd -d ${username} ${groupname}`,
      mode: 'demo',
      status: 'success',
      message: `Removed user '${username}' from group '${groupname}'.`,
      durationMs: 4,
    });
  }

  // ================= FILES & PERMISSIONS =================

  public async getFiles(subPath: string = ''): Promise<SandboxFile[]> {
    if (this.mode === 'local') {
      return this.fetchApi<SandboxFile[]>(`/api/files?path=${encodeURIComponent(subPath)}`);
    }
    return loadMock<SandboxFile[]>(STORAGE_KEYS.FILES, INITIAL_DEMO_FILES);
  }

  public async createSandboxFile(options: {
    relativePath: string;
    isDirectory: boolean;
    content?: string;
    mode?: string;
  }): Promise<SandboxFile> {
    if (this.mode === 'local') {
      return this.fetchApi<SandboxFile>('/api/files', {
        method: 'POST',
        body: JSON.stringify(options),
      });
    }

    const sanitize = sanitizeSandboxPath('/sandbox', options.relativePath);
    if (!sanitize.valid) throw new Error(sanitize.error);

    const files = loadMock<SandboxFile[]>(STORAGE_KEYS.FILES, INITIAL_DEMO_FILES);
    if (files.some(f => f.relativePath === sanitize.safeRelativePath)) {
      throw new Error(`File or directory already exists: ${sanitize.safeRelativePath}`);
    }

    const octal = options.mode ? validateOctal(options.mode).formatted : (options.isDirectory ? '0755' : '0644');
    const perms = octalToPermissions(octal);
    const symbolic = permissionsToSymbolic(perms, options.isDirectory);

    const newFile: SandboxFile = {
      name: options.relativePath.split('/').pop() || options.relativePath,
      relativePath: sanitize.safeRelativePath,
      isDirectory: options.isDirectory,
      sizeBytes: options.isDirectory ? 4096 : (options.content ? options.content.length : 0),
      owner: 'sysadmin',
      group: 'sysadmin',
      octalMode: octal,
      symbolicMode: symbolic,
      modifiedAt: new Date().toISOString(),
    };

    files.push(newFile);
    saveMock(STORAGE_KEYS.FILES, files);

    await this.recordLog({
      action: options.isDirectory ? 'MKDIR' : 'TOUCH',
      module: 'permissions',
      target: sanitize.safeRelativePath,
      commandSnippet: options.isDirectory ? `mkdir -p "/sandbox/${sanitize.safeRelativePath}"` : `touch "/sandbox/${sanitize.safeRelativePath}"`,
      mode: 'demo',
      status: 'success',
      message: `Created sandbox ${options.isDirectory ? 'directory' : 'file'}: ${sanitize.safeRelativePath}`,
      durationMs: 5,
    });

    return newFile;
  }

  public async changePermissions(relativePath: string, octalMode: string): Promise<SandboxFile> {
    if (this.mode === 'local') {
      return this.fetchApi<SandboxFile>('/api/files/permissions', {
        method: 'PATCH',
        body: JSON.stringify({ relativePath, octalMode }),
      });
    }

    const val = validateOctal(octalMode);
    if (!val.valid) throw new Error(val.error);

    const files = loadMock<SandboxFile[]>(STORAGE_KEYS.FILES, INITIAL_DEMO_FILES);
    const file = files.find(f => f.relativePath === relativePath);
    if (!file) throw new Error(`File not found: ${relativePath}`);

    file.octalMode = val.formatted;
    file.symbolicMode = permissionsToSymbolic(octalToPermissions(val.formatted), file.isDirectory);
    file.modifiedAt = new Date().toISOString();

    saveMock(STORAGE_KEYS.FILES, files);

    await this.recordLog({
      action: 'CHMOD',
      module: 'permissions',
      target: relativePath,
      commandSnippet: `chmod ${val.formatted} /sandbox/${relativePath}`,
      mode: 'demo',
      status: 'success',
      message: `Modified permissions to ${val.formatted} (${file.symbolicMode}). Verified via stat.`,
      durationMs: 7,
    });

    return file;
  }

  public async changeOwnership(relativePath: string, newOwner: string, newGroup?: string): Promise<SandboxFile> {
    if (this.mode === 'local') {
      return this.fetchApi<SandboxFile>('/api/files/ownership', {
        method: 'PATCH',
        body: JSON.stringify({ relativePath, newOwner, newGroup }),
      });
    }

    const uVal = validateUsername(newOwner);
    if (!uVal.valid) throw new Error(uVal.error);

    if (newGroup) {
      const gVal = validateGroupname(newGroup);
      if (!gVal.valid) throw new Error(gVal.error);
    }

    const files = loadMock<SandboxFile[]>(STORAGE_KEYS.FILES, INITIAL_DEMO_FILES);
    const file = files.find(f => f.relativePath === relativePath);
    if (!file) throw new Error(`File not found: ${relativePath}`);

    file.owner = newOwner;
    if (newGroup) file.group = newGroup;
    file.modifiedAt = new Date().toISOString();

    saveMock(STORAGE_KEYS.FILES, files);

    await this.recordLog({
      action: 'CHOWN',
      module: 'permissions',
      target: relativePath,
      commandSnippet: `chown ${newOwner}${newGroup ? `:${newGroup}` : ''} /sandbox/${relativePath}`,
      mode: 'demo',
      status: 'success',
      message: `Changed owner to ${newOwner}${newGroup ? `:${newGroup}` : ''}. Verified via stat.`,
      durationMs: 8,
    });

    return file;
  }

  public async deleteFile(relativePath: string): Promise<void> {
    if (this.mode === 'local') {
      await this.fetchApi(`/api/files?path=${encodeURIComponent(relativePath)}`, {
        method: 'DELETE',
      });
      return;
    }

    const files = loadMock<SandboxFile[]>(STORAGE_KEYS.FILES, INITIAL_DEMO_FILES);
    const filtered = files.filter(f => f.relativePath !== relativePath);
    if (filtered.length === files.length) {
      throw new Error(`File '${relativePath}' not found.`);
    }

    saveMock(STORAGE_KEYS.FILES, filtered);

    await this.recordLog({
      action: 'RM',
      module: 'permissions',
      target: relativePath,
      commandSnippet: `rm /sandbox/${relativePath}`,
      mode: 'demo',
      status: 'success',
      message: `Deleted '${relativePath}' from sandbox.`,
      durationMs: 4,
    });
  }

  // ================= ACTIVITY LOGS =================

  public async getLogs(): Promise<ActivityLog[]> {
    if (this.mode === 'local') {
      return this.fetchApi<ActivityLog[]>('/api/logs');
    }
    return loadMock<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_DEMO_LOGS);
  }

  public async recordLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    if (this.mode === 'local') {
      return this.fetchApi<ActivityLog>('/api/logs', {
        method: 'POST',
        body: JSON.stringify(log),
      });
    }

    const logs = loadMock<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_DEMO_LOGS);
    const newEntry: ActivityLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    if (logs.length > 300) logs.pop();
    saveMock(STORAGE_KEYS.LOGS, logs);
    return newEntry;
  }

  public async clearLogs(): Promise<void> {
    if (this.mode === 'local') {
      await this.fetchApi('/api/logs', { method: 'DELETE' });
      return;
    }
    saveMock(STORAGE_KEYS.LOGS, []);
  }

  // Reset demo data to pristine state
  public resetDemoData() {
    saveMock(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS);
    saveMock(STORAGE_KEYS.GROUPS, INITIAL_DEMO_GROUPS);
    saveMock(STORAGE_KEYS.FILES, INITIAL_DEMO_FILES);
    saveMock(STORAGE_KEYS.LOGS, INITIAL_DEMO_LOGS);
  }
}

export const api = new LinuxService();
