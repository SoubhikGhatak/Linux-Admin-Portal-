import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  validateUsername,
  validateGroupname,
  isProtectedAccount,
  validateOctal,
  sanitizeSandboxPath,
  PROTECTED_SYSTEM_ACCOUNTS
} from '../src/utils/permissionCalculators';
import { LinuxUser, LinuxGroup, SandboxFile, SystemDiagnostics } from '../src/types';

const execFileAsync = promisify(execFile);

// Configurable Sandbox Directory for test operations
export const SANDBOX_DIR = path.resolve(process.env.SANDBOX_DIR || path.join(os.tmpdir(), 'linux-mgmt-sandbox'));

// Allowlist of executable binaries (strict paths)
const BIN_ALLOWLIST: Record<string, string> = {
  id: '/usr/bin/id',
  who: '/usr/bin/who',
  uptime: '/usr/bin/uptime',
  uname: '/usr/bin/uname',
  stat: '/usr/bin/stat',
  ls: '/usr/bin/ls',
  chmod: '/bin/chmod',
  chown: '/bin/chown',
  useradd: '/usr/sbin/useradd',
  userdel: '/usr/sbin/userdel',
  usermod: '/usr/sbin/usermod',
  groupadd: '/usr/sbin/groupadd',
  groupdel: '/usr/sbin/groupdel',
  gpasswd: '/usr/bin/gpasswd',
  getent: '/usr/bin/getent',
  sudo: '/usr/bin/sudo',
};

// Locate binary if standard path doesn't exist (fallback to PATH)
function getBinary(cmd: string): string {
  const preferred = BIN_ALLOWLIST[cmd];
  if (preferred && fs.existsSync(preferred)) {
    return preferred;
  }
  // Alternate standard locations
  const fallbacks = [
    `/bin/${cmd}`,
    `/usr/bin/${cmd}`,
    `/sbin/${cmd}`,
    `/usr/sbin/${cmd}`,
  ];
  for (const fb of fallbacks) {
    if (fs.existsSync(fb)) return fb;
  }
  return cmd; // fallback to resolve from PATH
}

// Detect if sudo is actually present on system
function hasSudo(): string | null {
  const possible = ['/usr/bin/sudo', '/bin/sudo'];
  for (const p of possible) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Execute command with strict arguments array and timeout
 */
export async function executeSafe(
  cmdName: string,
  args: string[],
  useSudo: boolean = false
): Promise<{ stdout: string; stderr: string; commandSnippet: string }> {
  const bin = getBinary(cmdName);
  let finalBin = bin;
  let finalArgs = args;

  // Process is root if UID is 0
  const isCurrentRoot = (typeof process.getuid === 'function' ? process.getuid() === 0 : false) || os.userInfo().uid === 0;
  const sudoBin = hasSudo();
  const actuallyNeedsSudo = useSudo && !isCurrentRoot && sudoBin !== null;

  if (actuallyNeedsSudo && sudoBin) {
    finalBin = sudoBin;
    finalArgs = ['-n', bin, ...args]; // -n non-interactive: don't hang on password
  }

  const snippet = `${actuallyNeedsSudo ? 'sudo ' : ''}${cmdName} ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`;

  try {
    const result = await execFileAsync(finalBin, finalArgs, {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, LANG: 'C', LC_ALL: 'C' }
    });
    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      commandSnippet: snippet,
    };
  } catch (err: any) {
    const errorMsg = err.stderr ? err.stderr.trim() : err.message;
    const errorSnippet = snippet;
    const enhancedErr: any = new Error(errorMsg || `Command failed: ${cmdName}`);
    enhancedErr.code = err.code;
    enhancedErr.commandSnippet = errorSnippet;
    throw enhancedErr;
  }
}

/**
 * Ensure Sandbox Directory exists and seed sample files
 */
export function initializeSandbox() {
  try {
    if (!fs.existsSync(SANDBOX_DIR)) {
      fs.mkdirSync(SANDBOX_DIR, { recursive: true, mode: 0o755 });
    }

    const sampleFiles = [
      { name: 'README.txt', content: 'Academic Linux Permissions Sandbox.\nPractice chmod and chown operations here safely.\n', mode: 0o644 },
      { name: 'backup_script.sh', content: '#!/bin/bash\n# Sample backup script\necho "Running test backup routine..."\nexit 0\n', mode: 0o755 },
      { name: 'server_config.conf', content: '# Sample production server configuration\nPORT=8080\nLOG_LEVEL=info\nMAX_CONN=500\n', mode: 0o640 },
      { name: 'grades_report.csv', content: 'student_id,assignment_1,assignment_2,final_grade\nCS201-01,92,88,90\nCS201-02,78,85,82\n', mode: 0o600 },
    ];

    for (const sf of sampleFiles) {
      const fullPath = path.join(SANDBOX_DIR, sf.name);
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, sf.content, { mode: sf.mode });
      }
    }

    const restrictedDir = path.join(SANDBOX_DIR, 'restricted_project');
    if (!fs.existsSync(restrictedDir)) {
      fs.mkdirSync(restrictedDir, { recursive: true, mode: 0o750 });
      fs.writeFileSync(
        path.join(restrictedDir, 'secret_token.key'),
        'SECRET_ACADEMIC_KEY_DEMO_2026\n',
        { mode: 0o600 }
      );
    }
  } catch (err) {
    console.warn('Sandbox initialization note:', err);
  }
}

/**
 * Get System Diagnostics (hostname, uptime, OS, users)
 */
export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  const hostname = os.hostname();
  const osRelease = `${os.type()} ${os.release()}`;
  const kernelVersion = os.version ? os.version() : os.release();
  const arch = os.arch();
  const uptimeSeconds = Math.floor(os.uptime());
  const loadAverage = os.loadavg() as [number, number, number];
  const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemoryMB = Math.round(os.freemem() / (1024 * 1024));

  const currentUser = os.userInfo().username;
  const currentUid = os.userInfo().uid;
  const isRoot = currentUid === 0;

  // Query logged-in users via `who`
  let loggedInUsers: SystemDiagnostics['loggedInUsers'] = [];
  try {
    const { stdout } = await executeSafe('who', []);
    if (stdout) {
      const lines = stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          loggedInUsers.push({
            user: parts[0],
            terminal: parts[1],
            loginTime: parts.slice(2, 4).join(' '),
            host: parts[4] ? parts[4].replace(/[()]/g, '') : 'local',
          });
        }
      }
    }
  } catch {
    loggedInUsers = [{ user: currentUser, terminal: 'pts/0', loginTime: new Date().toLocaleTimeString(), host: 'localhost' }];
  }

  return {
    hostname,
    osRelease,
    kernelVersion,
    arch,
    uptimeSeconds,
    loadAverage,
    totalMemoryMB,
    freeMemoryMB,
    loggedInUsers,
    currentUser,
    currentUid,
    isRoot,
    sandboxPath: SANDBOX_DIR,
  };
}

/**
 * Parse system users from `/etc/passwd`
 */
export async function getLinuxUsers(): Promise<LinuxUser[]> {
  try {
    const passwdContent = fs.readFileSync('/etc/passwd', 'utf8');
    const groupContent = fs.existsSync('/etc/group') ? fs.readFileSync('/etc/group', 'utf8') : '';

    // Map group id to group name
    const gidToName: Record<number, string> = {};
    const userToGroups: Record<string, string[]> = {};

    for (const line of groupContent.split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [gname, , gidStr, membersStr] = line.split(':');
      const gid = parseInt(gidStr, 10);
      if (!isNaN(gid)) {
        gidToName[gid] = gname;
      }
      if (membersStr) {
        const members = membersStr.split(',').map(m => m.trim()).filter(Boolean);
        for (const m of members) {
          if (!userToGroups[m]) userToGroups[m] = [];
          userToGroups[m].push(gname);
        }
      }
    }

    const users: LinuxUser[] = [];
    const lines = passwdContent.split('\n');

    for (const line of lines) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [username, , uidStr, gidStr, gecos, homeDir, shell] = line.split(':');
      const uid = parseInt(uidStr, 10);
      const gid = parseInt(gidStr, 10);

      if (username && !isNaN(uid)) {
        const isSystem = uid < 1000;
        const isProtected = isProtectedAccount(username, uid);
        const primaryGroup = gidToName[gid] || `gid-${gid}`;
        const supp = userToGroups[username] || [];

        users.push({
          username,
          uid,
          gid,
          primaryGroup,
          supplementaryGroups: supp.filter(g => g !== primaryGroup),
          gecos: gecos || '',
          homeDir: homeDir || '',
          shell: shell || '',
          isSystem,
          isLocked: false,
          isProtected,
        });
      }
    }

    return users.sort((a, b) => a.uid - b.uid);
  } catch (err: any) {
    throw new Error(`Failed to read Linux users: ${err.message}`);
  }
}

/**
 * Create a new Linux user (useradd)
 */
export async function createLinuxUser(options: {
  username: string;
  gecos?: string;
  shell?: string;
  createHome?: boolean;
  primaryGroup?: string;
  groups?: string[];
}): Promise<{ user: LinuxUser; commandSnippet: string }> {
  const val = validateUsername(options.username);
  if (!val.valid) {
    throw new Error(val.error);
  }

  if (isProtectedAccount(options.username)) {
    throw new Error(`Cannot create reserved system username '${options.username}'.`);
  }

  const args: string[] = [];
  if (options.createHome !== false) {
    args.push('-m');
  }
  if (options.shell) {
    args.push('-s', options.shell);
  }
  if (options.gecos) {
    args.push('-c', options.gecos);
  }
  if (options.primaryGroup && options.primaryGroup.trim()) {
    const gVal = validateGroupname(options.primaryGroup.trim());
    if (!gVal.valid) throw new Error(gVal.error);
    args.push('-g', options.primaryGroup.trim());
  }
  if (options.groups && options.groups.length > 0) {
    for (const g of options.groups) {
      const gVal = validateGroupname(g);
      if (!gVal.valid) throw new Error(gVal.error);
    }
    args.push('-G', options.groups.join(','));
  }
  args.push(options.username);

  // Execute safe process
  const execResult = await executeSafe('useradd', args, true);

  // State verification: Read resulting user from system state
  const allUsers = await getLinuxUsers();
  const created = allUsers.find(u => u.username === options.username);
  if (!created) {
    throw new Error(`Verification failed: User '${options.username}' was not found in system state after creation.`);
  }

  return { user: created, commandSnippet: execResult.commandSnippet };
}

/**
 * Delete a Linux user (userdel)
 */
export async function deleteLinuxUser(username: string, removeHome: boolean = false): Promise<{ success: boolean; commandSnippet: string }> {
  const val = validateUsername(username);
  if (!val.valid) {
    throw new Error(val.error);
  }

  if (isProtectedAccount(username)) {
    throw new Error(`Forbidden: Account '${username}' is a protected system account and cannot be deleted.`);
  }

  const args: string[] = [];
  if (removeHome) {
    args.push('-r');
  }
  args.push(username);

  const execResult = await executeSafe('userdel', args, true);

  // Verify deletion from system state
  const allUsers = await getLinuxUsers();
  const exists = allUsers.some(u => u.username === username);
  if (exists) {
    throw new Error(`Verification failed: User '${username}' still exists in /etc/passwd.`);
  }

  return { success: true, commandSnippet: execResult.commandSnippet };
}

/**
 * Modify a Linux user (usermod)
 */
export async function modifyLinuxUser(username: string, updates: {
  shell?: string;
  gecos?: string;
  supplementaryGroups?: string[];
  lockAccount?: boolean;
}): Promise<{ user: LinuxUser; commandSnippet: string }> {
  const val = validateUsername(username);
  if (!val.valid) throw new Error(val.error);

  if (isProtectedAccount(username)) {
    throw new Error(`Forbidden: Modifying protected account '${username}' is restricted.`);
  }

  const args: string[] = [];
  if (updates.shell) {
    args.push('-s', updates.shell);
  }
  if (updates.gecos !== undefined) {
    args.push('-c', updates.gecos);
  }
  if (updates.supplementaryGroups) {
    for (const g of updates.supplementaryGroups) {
      const gVal = validateGroupname(g);
      if (!gVal.valid) throw new Error(gVal.error);
    }
    args.push('-G', updates.supplementaryGroups.join(','));
  }
  if (updates.lockAccount === true) {
    args.push('-L');
  } else if (updates.lockAccount === false) {
    args.push('-U');
  }

  if (args.length === 0) {
    throw new Error('No modifications provided.');
  }

  args.push(username);
  try {
    const execResult = await executeSafe('usermod', args, true);

    // State verification
    const allUsers = await getLinuxUsers();
    const updated = allUsers.find(u => u.username === username);
    if (!updated) {
      throw new Error(`Verification failed: User '${username}' not found after modification.`);
    }

    return { user: updated, commandSnippet: execResult.commandSnippet };
  } catch (err: any) {
    if (updates.lockAccount === false && (err.message?.includes('passwordless account') || err.message?.includes('unlocking'))) {
      // In Linux, usermod -U refuses to unlock an account with an empty password in /etc/shadow.
      // Set a locked password placeholder so usermod -U can unlock it successfully
      await executeSafe('usermod', ['-p', '!', username], true);
      const retryResult = await executeSafe('usermod', ['-U', username], true);
      const allUsers = await getLinuxUsers();
      const updated = allUsers.find(u => u.username === username);
      if (updated) return { user: updated, commandSnippet: retryResult.commandSnippet };
    }
    throw err;
  }
}

/**
 * Parse system groups from `/etc/group`
 */
export async function getLinuxGroups(): Promise<LinuxGroup[]> {
  try {
    const groupContent = fs.readFileSync('/etc/group', 'utf8');
    const groups: LinuxGroup[] = [];

    for (const line of groupContent.split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue;
      const [groupname, , gidStr, membersStr] = line.split(':');
      const gid = parseInt(gidStr, 10);
      if (groupname && !isNaN(gid)) {
        const isSystem = gid < 1000 && groupname !== 'users';
        const isProtected = isProtectedAccount(groupname, gid);
        const members = membersStr
          ? membersStr.split(',').map(m => m.trim()).filter(Boolean)
          : [];

        groups.push({
          groupname,
          gid,
          members,
          isSystem,
          isProtected,
        });
      }
    }

    return groups.sort((a, b) => a.gid - b.gid);
  } catch (err: any) {
    throw new Error(`Failed to read Linux groups: ${err.message}`);
  }
}

/**
 * Create a new Linux group (groupadd)
 */
export async function createLinuxGroup(groupname: string, isSystem: boolean = false): Promise<{ group: LinuxGroup; commandSnippet: string }> {
  const val = validateGroupname(groupname);
  if (!val.valid) throw new Error(val.error);

  if (isProtectedAccount(groupname)) {
    throw new Error(`Cannot create reserved system group '${groupname}'.`);
  }

  const args: string[] = [];
  if (isSystem) {
    args.push('-r');
  }
  args.push(groupname);

  const execResult = await executeSafe('groupadd', args, true);

  // Verify group creation from system state
  const allGroups = await getLinuxGroups();
  const created = allGroups.find(g => g.groupname === groupname);
  if (!created) {
    throw new Error(`Verification failed: Group '${groupname}' was not found in system state.`);
  }

  return { group: created, commandSnippet: execResult.commandSnippet };
}

/**
 * Delete a Linux group (groupdel)
 */
export async function deleteLinuxGroup(groupname: string): Promise<{ success: boolean; commandSnippet: string }> {
  const val = validateGroupname(groupname);
  if (!val.valid) throw new Error(val.error);

  if (isProtectedAccount(groupname)) {
    throw new Error(`Forbidden: Group '${groupname}' is a protected system group and cannot be deleted.`);
  }

  const execResult = await executeSafe('groupdel', [groupname], true);

  // Verify deletion from system state
  const allGroups = await getLinuxGroups();
  if (allGroups.some(g => g.groupname === groupname)) {
    throw new Error(`Verification failed: Group '${groupname}' still exists in /etc/group.`);
  }

  return { success: true, commandSnippet: execResult.commandSnippet };
}

/**
 * Add member to group (gpasswd -a <user> <group>)
 */
export async function addGroupMember(groupname: string, username: string): Promise<{ success: boolean; commandSnippet: string }> {
  const gVal = validateGroupname(groupname);
  if (!gVal.valid) throw new Error(gVal.error);
  const uVal = validateUsername(username);
  if (!uVal.valid) throw new Error(uVal.error);

  const execResult = await executeSafe('gpasswd', ['-a', username, groupname], true);

  // Verify from system state
  const allGroups = await getLinuxGroups();
  const targetGroup = allGroups.find(g => g.groupname === groupname);
  if (!targetGroup || !targetGroup.members.includes(username)) {
    throw new Error(`Verification failed: User '${username}' was not added to group '${groupname}'.`);
  }

  return { success: true, commandSnippet: execResult.commandSnippet };
}

/**
 * Remove member from group (gpasswd -d <user> <group>)
 */
export async function removeGroupMember(groupname: string, username: string): Promise<{ success: boolean; commandSnippet: string }> {
  const gVal = validateGroupname(groupname);
  if (!gVal.valid) throw new Error(gVal.error);
  const uVal = validateUsername(username);
  if (!uVal.valid) throw new Error(uVal.error);

  const execResult = await executeSafe('gpasswd', ['-d', username, groupname], true);

  // Verify
  const allGroups = await getLinuxGroups();
  const targetGroup = allGroups.find(g => g.groupname === groupname);
  if (targetGroup && targetGroup.members.includes(username)) {
    throw new Error(`Verification failed: User '${username}' still in group '${groupname}'.`);
  }

  return { success: true, commandSnippet: execResult.commandSnippet };
}

/**
 * List sandbox files with stat details
 */
export async function listSandboxFiles(subPath: string = ''): Promise<SandboxFile[]> {
  initializeSandbox();

  const sanitize = sanitizeSandboxPath(SANDBOX_DIR, subPath || '.');
  if (!sanitize.valid) throw new Error(sanitize.error);

  const targetDir = sanitize.safeFullPath;
  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const results: SandboxFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);
    const relPath = path.relative(SANDBOX_DIR, fullPath);

    try {
      const stats = fs.statSync(fullPath);
      const octalMode = '0' + (stats.mode & 0o7777).toString(8);

      // Attempt to get owner and group names
      let ownerName = String(stats.uid);
      let groupName = String(stats.gid);

      try {
        // Query /etc/passwd and /etc/group directly if possible
        const users = await getLinuxUsers();
        const matchingUser = users.find(u => u.uid === stats.uid);
        if (matchingUser) ownerName = matchingUser.username;

        const groups = await getLinuxGroups();
        const matchingGroup = groups.find(g => g.gid === stats.gid);
        if (matchingGroup) groupName = matchingGroup.groupname;
      } catch {
        // fallback to uid/gid
      }

      // Convert octal mode to symbolic string
      const isDir = entry.isDirectory();
      const triadToChars = (val: number) => {
        const r = (val & 4) ? 'r' : '-';
        const w = (val & 2) ? 'w' : '-';
        const x = (val & 1) ? 'x' : '-';
        return `${r}${w}${x}`;
      };

      const u = triadToChars((stats.mode >> 6) & 7);
      const g = triadToChars((stats.mode >> 3) & 7);
      const o = triadToChars(stats.mode & 7);
      const symbolic = `${isDir ? 'd' : '-'}${u}${g}${o}`;

      results.push({
        name: entry.name,
        relativePath: relPath,
        isDirectory: isDir,
        sizeBytes: stats.size,
        owner: ownerName,
        group: groupName,
        octalMode,
        symbolicMode: symbolic,
        modifiedAt: stats.mtime.toISOString(),
      });
    } catch (err) {
      // Skip inaccessible file
    }
  }

  return results.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Create a new file or directory inside the test sandbox
 */
export async function createSandboxItem(options: {
  relativePath: string;
  isDirectory: boolean;
  content?: string;
  mode?: string;
}): Promise<SandboxFile> {
  const sanitize = sanitizeSandboxPath(SANDBOX_DIR, options.relativePath);
  if (!sanitize.valid) throw new Error(sanitize.error);

  const fullPath = sanitize.safeFullPath;
  if (fs.existsSync(fullPath)) {
    throw new Error(`File or directory already exists at path: ${sanitize.safeRelativePath}`);
  }

  const octal = options.mode ? validateOctal(options.mode).formatted : (options.isDirectory ? '0755' : '0644');
  const numMode = parseInt(octal, 8);

  if (options.isDirectory) {
    fs.mkdirSync(fullPath, { recursive: true, mode: numMode });
  } else {
    // Ensure parent dir exists
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, options.content || '', { mode: numMode });
  }

  // Verification read
  const files = await listSandboxFiles(path.dirname(sanitize.safeRelativePath));
  const created = files.find(f => f.name === path.basename(fullPath));
  if (!created) {
    throw new Error('Verification failed: Created item could not be verified in sandbox state.');
  }

  return created;
}

/**
 * Modify file permissions (chmod)
 */
export async function changeFilePermissions(
  relativePath: string,
  octalMode: string
): Promise<{ file: SandboxFile; commandSnippet: string }> {
  const sanitize = sanitizeSandboxPath(SANDBOX_DIR, relativePath);
  if (!sanitize.valid) throw new Error(sanitize.error);

  const octVal = validateOctal(octalMode);
  if (!octVal.valid) throw new Error(octVal.error);

  const fullPath = sanitize.safeFullPath;
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Target file does not exist: ${sanitize.safeRelativePath}`);
  }

  // Execute chmod safely
  const execResult = await executeSafe('chmod', [octVal.formatted, fullPath], false);

  // State verification: Read resulting mode via stat
  const stats = fs.statSync(fullPath);
  const resultingOctal = '0' + (stats.mode & 0o7777).toString(8);

  const files = await listSandboxFiles(path.dirname(sanitize.safeRelativePath));
  const target = files.find(f => f.name === path.basename(fullPath));
  if (!target) throw new Error('Verification failed: Item stat could not be re-read.');

  return { file: target, commandSnippet: execResult.commandSnippet };
}

/**
 * Modify file ownership (chown user:group)
 */
export async function changeFileOwnership(
  relativePath: string,
  newOwner: string,
  newGroup?: string
): Promise<{ file: SandboxFile; commandSnippet: string }> {
  const sanitize = sanitizeSandboxPath(SANDBOX_DIR, relativePath);
  if (!sanitize.valid) throw new Error(sanitize.error);

  const uVal = validateUsername(newOwner);
  if (!uVal.valid) throw new Error(uVal.error);

  let ownerGroupSpec = newOwner;
  if (newGroup) {
    const gVal = validateGroupname(newGroup);
    if (!gVal.valid) throw new Error(gVal.error);
    ownerGroupSpec += `:${newGroup}`;
  }

  const fullPath = sanitize.safeFullPath;
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Target file does not exist: ${sanitize.safeRelativePath}`);
  }

  const execResult = await executeSafe('chown', [ownerGroupSpec, fullPath], true);

  const files = await listSandboxFiles(path.dirname(sanitize.safeRelativePath));
  const target = files.find(f => f.name === path.basename(fullPath));
  if (!target) throw new Error('Verification failed: Item stat could not be re-read after chown.');

  return { file: target, commandSnippet: execResult.commandSnippet };
}

/**
 * Delete sandbox item (rm)
 */
export async function deleteSandboxItem(relativePath: string): Promise<{ success: boolean; commandSnippet: string }> {
  const sanitize = sanitizeSandboxPath(SANDBOX_DIR, relativePath);
  if (!sanitize.valid) throw new Error(sanitize.error);

  const fullPath = sanitize.safeFullPath;
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${sanitize.safeRelativePath}`);
  }

  // Prevent deleting the sandbox root itself!
  if (fullPath === SANDBOX_DIR) {
    throw new Error('Cannot delete sandbox root directory.');
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(fullPath);
  }

  if (fs.existsSync(fullPath)) {
    throw new Error('Verification failed: File still exists on filesystem.');
  }

  return { success: true, commandSnippet: `rm ${stat.isDirectory() ? '-rf ' : ''}${relativePath}` };
}
