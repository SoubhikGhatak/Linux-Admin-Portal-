import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initializeSandbox,
  getSystemDiagnostics,
  getLinuxUsers,
  createLinuxUser,
  deleteLinuxUser,
  modifyLinuxUser,
  getLinuxGroups,
  createLinuxGroup,
  deleteLinuxGroup,
  addGroupMember,
  removeGroupMember,
  listSandboxFiles,
  createSandboxItem,
  changeFilePermissions,
  changeFileOwnership,
  deleteSandboxItem,
  SANDBOX_DIR
} from './server/linuxExecutor';
import { ActivityLog } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory activity log store
const serverLogs: ActivityLog[] = [
  {
    id: 'log-boot-01',
    timestamp: new Date().toISOString(),
    action: 'SYSTEM_BOOT',
    module: 'system',
    target: 'daemon',
    commandSnippet: 'systemctl start linux-mgmt-service',
    mode: 'local',
    status: 'success',
    message: `Linux Management Daemon initialized. Sandbox rooted at: ${SANDBOX_DIR}`,
    durationMs: 4,
  }
];

function recordLog(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
  const newLog: ActivityLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  serverLogs.unshift(newLog);
  if (serverLogs.length > 500) serverLogs.pop();
  return newLog;
}

// Ensure sandbox is initialized on startup
initializeSandbox();

// ======================== API ROUTES ========================

// Health & System Info
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const diag = await getSystemDiagnostics();
    res.json({
      status: 'ok',
      mode: 'local',
      isLocalBackendAvailable: true,
      currentLinuxUser: diag.currentUser,
      currentUid: diag.currentUid,
      sandboxPath: diag.sandboxPath,
      uptimeSeconds: diag.uptimeSeconds,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

app.get('/api/system/info', async (req: Request, res: Response) => {
  try {
    const diag = await getSystemDiagnostics();
    res.json(diag);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await getLinuxUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { username, gecos, shell, createHome, primaryGroup, groups } = req.body;
    const result = await createLinuxUser({
      username,
      gecos,
      shell,
      createHome,
      primaryGroup,
      groups,
    });
    recordLog({
      action: 'USER_CREATE',
      module: 'users',
      target: username,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Created Linux user '${username}' (UID: ${result.user.uid})`,
      durationMs: Date.now() - start,
    });
    res.status(201).json(result.user);
  } catch (err: any) {
    recordLog({
      action: 'USER_CREATE',
      module: 'users',
      target: req.body?.username || 'unknown',
      commandSnippet: `useradd ${req.body?.username || ''}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:username', async (req: Request, res: Response) => {
  const start = Date.now();
  const { username } = req.params;
  const removeHome = req.query.removeHome === 'true';

  try {
    const result = await deleteLinuxUser(username, removeHome);
    recordLog({
      action: 'USER_DELETE',
      module: 'users',
      target: username,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Deleted Linux user '${username}'`,
      durationMs: Date.now() - start,
    });
    res.json({ success: true, message: `User '${username}' deleted successfully.` });
  } catch (err: any) {
    recordLog({
      action: 'USER_DELETE',
      module: 'users',
      target: username,
      commandSnippet: `userdel ${username}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/users/:username', async (req: Request, res: Response) => {
  const start = Date.now();
  const { username } = req.params;
  const { shell, gecos, supplementaryGroups, lockAccount } = req.body;

  try {
    const result = await modifyLinuxUser(username, {
      shell,
      gecos,
      supplementaryGroups,
      lockAccount,
    });
    recordLog({
      action: 'USER_MODIFY',
      module: 'users',
      target: username,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Modified user '${username}' properties`,
      durationMs: Date.now() - start,
    });
    res.json(result.user);
  } catch (err: any) {
    recordLog({
      action: 'USER_MODIFY',
      module: 'users',
      target: username,
      commandSnippet: `usermod ${username}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

// Groups
app.get('/api/groups', async (req: Request, res: Response) => {
  try {
    const groups = await getLinuxGroups();
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req: Request, res: Response) => {
  const start = Date.now();
  const { groupname, isSystem } = req.body;

  try {
    const result = await createLinuxGroup(groupname, isSystem);
    recordLog({
      action: 'GROUP_CREATE',
      module: 'groups',
      target: groupname,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Created group '${groupname}' (GID: ${result.group.gid})`,
      durationMs: Date.now() - start,
    });
    res.status(201).json(result.group);
  } catch (err: any) {
    recordLog({
      action: 'GROUP_CREATE',
      module: 'groups',
      target: groupname || 'unknown',
      commandSnippet: `groupadd ${groupname || ''}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/groups/:groupname', async (req: Request, res: Response) => {
  const start = Date.now();
  const { groupname } = req.params;

  try {
    const result = await deleteLinuxGroup(groupname);
    recordLog({
      action: 'GROUP_DELETE',
      module: 'groups',
      target: groupname,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Deleted group '${groupname}'`,
      durationMs: Date.now() - start,
    });
    res.json({ success: true });
  } catch (err: any) {
    recordLog({
      action: 'GROUP_DELETE',
      module: 'groups',
      target: groupname,
      commandSnippet: `groupdel ${groupname}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/groups/:groupname/members', async (req: Request, res: Response) => {
  const start = Date.now();
  const { groupname } = req.params;
  const { username } = req.body;

  try {
    const result = await addGroupMember(groupname, username);
    recordLog({
      action: 'GROUP_ADD_MEMBER',
      module: 'groups',
      target: `${groupname} (+${username})`,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Added user '${username}' to group '${groupname}'`,
      durationMs: Date.now() - start,
    });
    res.json({ success: true });
  } catch (err: any) {
    recordLog({
      action: 'GROUP_ADD_MEMBER',
      module: 'groups',
      target: `${groupname} (+${username})`,
      commandSnippet: `gpasswd -a ${username} ${groupname}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/groups/:groupname/members/:username', async (req: Request, res: Response) => {
  const start = Date.now();
  const { groupname, username } = req.params;

  try {
    const result = await removeGroupMember(groupname, username);
    recordLog({
      action: 'GROUP_REMOVE_MEMBER',
      module: 'groups',
      target: `${groupname} (-${username})`,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Removed user '${username}' from group '${groupname}'`,
      durationMs: Date.now() - start,
    });
    res.json({ success: true });
  } catch (err: any) {
    recordLog({
      action: 'GROUP_REMOVE_MEMBER',
      module: 'groups',
      target: `${groupname} (-${username})`,
      commandSnippet: `gpasswd -d ${username} ${groupname}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

// Sandbox File Permissions
app.get('/api/files', async (req: Request, res: Response) => {
  const subPath = (req.query.path as string) || '';
  try {
    const files = await listSandboxFiles(subPath);
    res.json(files);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/files', async (req: Request, res: Response) => {
  const start = Date.now();
  const { relativePath, isDirectory, content, mode } = req.body;

  try {
    const file = await createSandboxItem({ relativePath, isDirectory, content, mode });
    recordLog({
      action: isDirectory ? 'MKDIR' : 'TOUCH',
      module: 'permissions',
      target: relativePath,
      commandSnippet: isDirectory ? `mkdir -p "${relativePath}"` : `touch "${relativePath}"`,
      mode: 'local',
      status: 'success',
      message: `Created ${isDirectory ? 'directory' : 'file'} in sandbox: ${relativePath}`,
      durationMs: Date.now() - start,
    });
    res.status(201).json(file);
  } catch (err: any) {
    recordLog({
      action: 'FILE_CREATE',
      module: 'permissions',
      target: relativePath || 'sandbox',
      commandSnippet: `create ${relativePath || ''}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/files/permissions', async (req: Request, res: Response) => {
  const start = Date.now();
  const { relativePath, octalMode } = req.body;

  try {
    const result = await changeFilePermissions(relativePath, octalMode);
    recordLog({
      action: 'CHMOD',
      module: 'permissions',
      target: relativePath,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Updated permissions of '${relativePath}' to ${result.file.octalMode} (${result.file.symbolicMode})`,
      durationMs: Date.now() - start,
    });
    res.json(result.file);
  } catch (err: any) {
    recordLog({
      action: 'CHMOD',
      module: 'permissions',
      target: relativePath,
      commandSnippet: `chmod ${octalMode} ${relativePath}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/files/ownership', async (req: Request, res: Response) => {
  const start = Date.now();
  const { relativePath, newOwner, newGroup } = req.body;

  try {
    const result = await changeFileOwnership(relativePath, newOwner, newGroup);
    recordLog({
      action: 'CHOWN',
      module: 'permissions',
      target: relativePath,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Changed owner of '${relativePath}' to ${newOwner}${newGroup ? `:${newGroup}` : ''}`,
      durationMs: Date.now() - start,
    });
    res.json(result.file);
  } catch (err: any) {
    recordLog({
      action: 'CHOWN',
      module: 'permissions',
      target: relativePath,
      commandSnippet: `chown ${newOwner}${newGroup ? `:${newGroup}` : ''} ${relativePath}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/files', async (req: Request, res: Response) => {
  const start = Date.now();
  const relativePath = req.query.path as string;

  if (!relativePath || typeof relativePath !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid path query parameter.' });
  }

  try {
    const result = await deleteSandboxItem(relativePath);
    recordLog({
      action: 'RM',
      module: 'permissions',
      target: relativePath,
      commandSnippet: result.commandSnippet,
      mode: 'local',
      status: 'success',
      message: `Deleted sandbox item '${relativePath}'`,
      durationMs: Date.now() - start,
    });
    res.json({ success: true });
  } catch (err: any) {
    recordLog({
      action: 'RM',
      module: 'permissions',
      target: relativePath,
      commandSnippet: `rm ${relativePath}`,
      mode: 'local',
      status: 'failed',
      message: err.message,
      durationMs: Date.now() - start,
    });
    res.status(400).json({ error: err.message });
  }
});

// Logs
app.get('/api/logs', (req: Request, res: Response) => {
  res.json(serverLogs);
});

app.post('/api/logs', (req: Request, res: Response) => {
  const { action, module, target, commandSnippet, mode, status, message, durationMs } = req.body;
  const created = recordLog({
    action: action || 'CUSTOM_ACTION',
    module: module || 'system',
    target: target || 'system',
    commandSnippet: commandSnippet || '',
    mode: mode || 'local',
    status: status || 'success',
    message: message || '',
    durationMs,
  });
  res.status(201).json(created);
});

app.delete('/api/logs', (req: Request, res: Response) => {
  serverLogs.length = 0;
  recordLog({
    action: 'LOGS_CLEARED',
    module: 'system',
    target: 'audit_log',
    commandSnippet: 'truncate -s 0 /var/log/audit.log',
    mode: 'local',
    status: 'success',
    message: 'Audit log table was reset by administrator.',
  });
  res.json({ success: true });
});

// ======================== SERVER & VITE SETUP ========================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Dynamically import Vite in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Linux User & Permission Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
