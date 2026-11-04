/**
 * Linux Permissions & Security Utility Functions
 * Academic-grade logic for permission conversions, validation, and path sandboxing.
 */

export interface PermissionTriad {
  read: boolean;
  write: boolean;
  execute: boolean;
}

export interface SpecialBits {
  suid: boolean;   // 4000: Set UID on execution
  sgid: boolean;   // 2000: Set GID on execution
  sticky: boolean; // 1000: Sticky bit (restricted deletion flag)
}

export interface FilePermissions {
  special: SpecialBits;
  owner: PermissionTriad;
  group: PermissionTriad;
  others: PermissionTriad;
}

// Protected Linux system accounts that should never be modified or deleted
export const PROTECTED_SYSTEM_ACCOUNTS = new Set([
  'root', 'bin', 'daemon', 'sys', 'adm', 'tty', 'disk', 'lp', 'mail', 'news',
  'uucp', 'man', 'proxy', 'kmem', 'dialout', 'fax', 'voice', 'cdrom', 'floppy',
  'tape', 'sudo', 'audio', 'dip', 'www-data', 'backup', 'operator', 'list',
  'irc', 'src', 'gnats', 'shadow', 'utmp', 'video', 'sasl', 'plugdev', 'staff',
  'games', 'users', 'nogroup', 'nobody', 'systemd-network', 'systemd-resolve',
  'systemd-timesync', 'messagebus', 'syslog', 'ssh', 'sshd'
]);

/**
 * Validate a Linux username according to POSIX / shadow-utils useradd standards:
 * - Must start with a lowercase letter or underscore: [a-z_]
 * - Followed by lowercase letters, digits, underscores, or hyphens: [a-z0-9_-]
 * - Max 32 characters in length
 */
export function validateUsername(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Username cannot be empty.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 32) {
    return { valid: false, error: 'Username must be between 1 and 32 characters.' };
  }
  // Linux standard regex
  const regex = /^[a-z_][a-z0-9_-]*$/;
  if (!regex.test(trimmed)) {
    return {
      valid: false,
      error: 'Username must start with a lowercase letter or underscore, and only contain lowercase letters, numbers, underscores, or dashes.'
    };
  }
  return { valid: true };
}

/**
 * Validate a Linux group name
 */
export function validateGroupname(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Group name cannot be empty.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 32) {
    return { valid: false, error: 'Group name must be between 1 and 32 characters.' };
  }
  const regex = /^[a-z_][a-z0-9_-]*$/;
  if (!regex.test(trimmed)) {
    return {
      valid: false,
      error: 'Group name must start with a lowercase letter or underscore, and contain only lowercase letters, digits, underscores, or dashes.'
    };
  }
  return { valid: true };
}

/**
 * Check if an account is a protected Linux system account (UID < 1000 or reserved name)
 */
export function isProtectedAccount(username: string, uid?: number): boolean {
  if (PROTECTED_SYSTEM_ACCOUNTS.has(username.toLowerCase())) {
    return true;
  }
  if (typeof uid === 'number' && uid >= 0 && uid < 1000) {
    return true;
  }
  return false;
}

/**
 * Calculate numeric value (0-7) of a permission triad
 */
export function triadToOctal(triad: PermissionTriad): number {
  let val = 0;
  if (triad.read) val += 4;
  if (triad.write) val += 2;
  if (triad.execute) val += 1;
  return val;
}

/**
 * Convert 0-7 number into a PermissionTriad
 */
export function octalToTriad(val: number): PermissionTriad {
  const clamped = Math.max(0, Math.min(7, Math.floor(val)));
  return {
    read: (clamped & 4) !== 0,
    write: (clamped & 2) !== 0,
    execute: (clamped & 1) !== 0,
  };
}

/**
 * Calculate special bits number (0-7)
 * SUID = 4, SGID = 2, Sticky = 1
 */
export function specialBitsToOctal(special: SpecialBits): number {
  let val = 0;
  if (special.suid) val += 4;
  if (special.sgid) val += 2;
  if (special.sticky) val += 1;
  return val;
}

/**
 * Convert 0-7 special bits number to SpecialBits object
 */
export function octalToSpecialBits(val: number): SpecialBits {
  const clamped = Math.max(0, Math.min(7, Math.floor(val)));
  return {
    suid: (clamped & 4) !== 0,
    sgid: (clamped & 2) !== 0,
    sticky: (clamped & 1) !== 0,
  };
}

/**
 * Convert FilePermissions object to 4-digit octal string (e.g. '0755')
 */
export function permissionsToOctal(perms: FilePermissions): string {
  const s = specialBitsToOctal(perms.special);
  const u = triadToOctal(perms.owner);
  const g = triadToOctal(perms.group);
  const o = triadToOctal(perms.others);
  return `${s}${u}${g}${o}`;
}

/**
 * Validate octal permission string (3 or 4 digits in [0-7])
 */
export function validateOctal(octal: string): { valid: boolean; formatted: string; error?: string } {
  if (!octal || typeof octal !== 'string') {
    return { valid: false, formatted: '0755', error: 'Octal string is empty.' };
  }
  const clean = octal.trim();
  if (!/^[0-7]{3,4}$/.test(clean)) {
    return { valid: false, formatted: '0755', error: 'Octal permission must be 3 or 4 digits between 0 and 7 (e.g. 755 or 0755).' };
  }
  // Pad to 4 digits
  const padded = clean.length === 3 ? `0${clean}` : clean;
  return { valid: true, formatted: padded };
}

/**
 * Convert octal string to FilePermissions object
 */
export function octalToPermissions(octal: string): FilePermissions {
  const { valid, formatted } = validateOctal(octal);
  const code = valid ? formatted : '0755';

  const s = parseInt(code[0], 10);
  const u = parseInt(code[1], 10);
  const g = parseInt(code[2], 10);
  const o = parseInt(code[3], 10);

  return {
    special: octalToSpecialBits(s),
    owner: octalToTriad(u),
    group: octalToTriad(g),
    others: octalToTriad(o),
  };
}

/**
 * Format permission triad to 3-char string with special bit support
 */
function formatTriad(triad: PermissionTriad, specialChar: string | null = null): string {
  const r = triad.read ? 'r' : '-';
  const w = triad.write ? 'w' : '-';
  let x = triad.execute ? 'x' : '-';

  if (specialChar) {
    if (specialChar === 's') {
      x = triad.execute ? 's' : 'S';
    } else if (specialChar === 't') {
      x = triad.execute ? 't' : 'T';
    }
  }

  return `${r}${w}${x}`;
}

/**
 * Convert FilePermissions object to standard Linux 10-char symbolic format
 * e.g. -rwxr-xr-x or drwxr-xr-x
 */
export function permissionsToSymbolic(perms: FilePermissions, isDirectory: boolean = false): string {
  const prefix = isDirectory ? 'd' : '-';
  const uSpecial = perms.special.suid ? 's' : null;
  const gSpecial = perms.special.sgid ? 's' : null;
  const oSpecial = perms.special.sticky ? 't' : null;

  const u = formatTriad(perms.owner, uSpecial);
  const g = formatTriad(perms.group, gSpecial);
  const o = formatTriad(perms.others, oSpecial);

  return `${prefix}${u}${g}${o}`;
}

/**
 * Convert symbolic representation or clause (e.g. "u=rwx,g=rx,o=rx" or "755") to FilePermissions
 */
export function parseSymbolicClauses(clause: string, baseOctal: string = '0755'): FilePermissions {
  const base = octalToPermissions(baseOctal);
  if (!clause || typeof clause !== 'string') return base;

  const parts = clause.split(',');
  for (const part of parts) {
    const match = part.trim().match(/^([ugoa]*)([+-=])([rwxXst]*)$/);
    if (!match) continue;

    const [, whoRaw, op, perms] = match;
    const who = whoRaw === '' || whoRaw.includes('a') ? ['u', 'g', 'o'] : whoRaw.split('');
    const hasR = perms.includes('r');
    const hasW = perms.includes('w');
    const hasX = perms.includes('x') || perms.includes('X');
    const hasS = perms.includes('s');
    const hasT = perms.includes('t');

    for (const target of who) {
      const triad = target === 'u' ? base.owner : target === 'g' ? base.group : base.others;

      if (op === '=') {
        triad.read = hasR;
        triad.write = hasW;
        triad.execute = hasX;
        if (target === 'u') base.special.suid = hasS;
        if (target === 'g') base.special.sgid = hasS;
        if (target === 'o') base.special.sticky = hasT;
      } else if (op === '+') {
        if (hasR) triad.read = true;
        if (hasW) triad.write = true;
        if (hasX) triad.execute = true;
        if (target === 'u' && hasS) base.special.suid = true;
        if (target === 'g' && hasS) base.special.sgid = true;
        if (target === 'o' && hasT) base.special.sticky = true;
      } else if (op === '-') {
        if (hasR) triad.read = false;
        if (hasW) triad.write = false;
        if (hasX) triad.execute = false;
        if (target === 'u' && hasS) base.special.suid = false;
        if (target === 'g' && hasS) base.special.sgid = false;
        if (target === 'o' && hasT) base.special.sticky = false;
      }
    }
  }

  return base;
}

/**
 * Generate human-readable explanation of permission mode
 */
export function explainPermissions(octal: string, isDirectory: boolean = false): {
  summary: string;
  ownerText: string;
  groupText: string;
  othersText: string;
  securityNote?: string;
} {
  const perms = octalToPermissions(octal);

  const triadDesc = (t: PermissionTriad, target: string, isDir: boolean) => {
    const acts: string[] = [];
    if (t.read) acts.push('read');
    if (t.write) acts.push(isDir ? 'create/delete entries' : 'modify content');
    if (t.execute) acts.push(isDir ? 'traverse directory' : 'execute as program');

    if (acts.length === 0) return `${target} has NO access (---).`;
    if (acts.length === 3) return `${target} has FULL access (read, write, execute).`;
    return `${target} can ${acts.join(', ')}.`;
  };

  const ownerText = triadDesc(perms.owner, 'Owner', isDirectory);
  const groupText = triadDesc(perms.group, 'Group', isDirectory);
  const othersText = triadDesc(perms.others, 'Others (world)', isDirectory);

  let summary = `Standard ${isDirectory ? 'directory' : 'file'} mode (${validateOctal(octal).formatted}).`;
  const cleanOctal = validateOctal(octal).formatted;

  if (cleanOctal.endsWith('777')) {
    summary = `⚠️ World-writable (${cleanOctal}) - High risk, any system user can alter or delete this.`;
  } else if (cleanOctal.endsWith('755')) {
    summary = `Standard executable/directory permission (${cleanOctal}): Owner has full control; others can read and execute.`;
  } else if (cleanOctal.endsWith('644')) {
    summary = `Standard data file permission (${cleanOctal}): Owner can read/write; others can read only.`;
  } else if (cleanOctal.endsWith('600')) {
    summary = `Strict private file (${cleanOctal}): Only the owner can read and write; completely blocked for everyone else.`;
  } else if (cleanOctal.endsWith('700')) {
    summary = `Private directory/script (${cleanOctal}): Only the owner can access.`;
  }

  let securityNote: string | undefined;
  if (perms.special.suid) {
    securityNote = 'SUID bit active: Executes with owner privileges (elevated).';
  } else if (perms.special.sgid) {
    securityNote = isDirectory
      ? 'SGID bit active: Subfiles inherit directory group ownership.'
      : 'SGID bit active: Executes with group privileges.';
  } else if (perms.special.sticky) {
    securityNote = 'Sticky bit active: Only file owners or root can delete files in this directory (e.g. /tmp).';
  }

  return { summary, ownerText, groupText, othersText, securityNote };
}

/**
 * Path Sandbox Validator:
 * Ensures a requested file path resolves strictly inside the allowed sandbox directory.
 * Prevents traversal attacks like `../../etc/passwd` or absolute escapes.
 */
export function sanitizeSandboxPath(sandboxRoot: string, userInputPath: string): {
  valid: boolean;
  safeRelativePath: string;
  safeFullPath: string;
  error?: string;
} {
  if (!userInputPath || typeof userInputPath !== 'string') {
    return { valid: false, safeRelativePath: '', safeFullPath: '', error: 'Path cannot be empty.' };
  }

  // Normalize path separators
  const normalized = userInputPath.replace(/\\/g, '/').trim();

  // Strip leading slashes to evaluate as relative
  const cleanRelative = normalized.replace(/^\/+/, '');

  // Check for directory traversal sequences
  const segments = cleanRelative.split('/').filter(Boolean);
  const safeSegments: string[] = [];

  for (const seg of segments) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') {
      if (safeSegments.length === 0) {
        return {
          valid: false,
          safeRelativePath: '',
          safeFullPath: '',
          error: 'Path traversal attempted: outside sandbox boundary.'
        };
      }
      safeSegments.pop();
    } else {
      // Reject dangerous characters
      if (/[<>:"|?*\x00-\x1f]/.test(seg)) {
        return {
          valid: false,
          safeRelativePath: '',
          safeFullPath: '',
          error: 'Filename contains invalid or dangerous control characters.'
        };
      }
      safeSegments.push(seg);
    }
  }

  const finalRelative = safeSegments.join('/');
  const finalFull = sandboxRoot.replace(/\/+$/, '') + (finalRelative ? '/' + finalRelative : '');

  // Verify it starts strictly with sandboxRoot
  const cleanRoot = sandboxRoot.replace(/\/+$/, '');
  if (!finalFull.startsWith(cleanRoot)) {
    return {
      valid: false,
      safeRelativePath: '',
      safeFullPath: '',
      error: 'Access denied: Target path must remain inside the test sandbox.'
    };
  }

  return {
    valid: true,
    safeRelativePath: finalRelative,
    safeFullPath: finalFull
  };
}
