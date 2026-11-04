export type SystemMode = 'demo' | 'local';

export interface LinuxUser {
  username: string;
  uid: number;
  gid: number;
  primaryGroup: string;
  supplementaryGroups: string[];
  gecos: string; // Full name / info
  homeDir: string;
  shell: string;
  isSystem: boolean;
  isLocked: boolean;
  isProtected: boolean;
}

export interface LinuxGroup {
  groupname: string;
  gid: number;
  members: string[];
  isSystem: boolean;
  isProtected: boolean;
}

export interface SandboxFile {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  sizeBytes: number;
  owner: string;
  group: string;
  octalMode: string;       // e.g. '0755'
  symbolicMode: string;    // e.g. '-rwxr-xr-x'
  modifiedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  module: 'users' | 'groups' | 'permissions' | 'system' | 'auth';
  target: string;
  commandSnippet: string;
  mode: SystemMode;
  status: 'success' | 'failed' | 'warning';
  message: string;
  durationMs?: number;
}

export interface SystemDiagnostics {
  hostname: string;
  osRelease: string;
  kernelVersion: string;
  arch: string;
  uptimeSeconds: number;
  loadAverage: [number, number, number];
  totalMemoryMB: number;
  freeMemoryMB: number;
  loggedInUsers: {
    user: string;
    terminal: string;
    loginTime: string;
    host: string;
  }[];
  currentUser: string;
  currentUid: number;
  isRoot: boolean;
  sandboxPath: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  mode: SystemMode;
  isLocalBackendAvailable: boolean;
  currentLinuxUser: string;
  currentUid: number;
  sandboxPath: string;
  latencyMs?: number;
}
