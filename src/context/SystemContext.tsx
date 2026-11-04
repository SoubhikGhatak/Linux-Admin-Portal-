import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SystemMode,
  LinuxUser,
  LinuxGroup,
  SandboxFile,
  ActivityLog,
  SystemDiagnostics,
  HealthStatus
} from '../types';
import { api } from '../services/api';

export type ActiveTab = 'dashboard' | 'users' | 'groups' | 'permissions' | 'logs' | 'system' | 'docs';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  command?: string;
  timestamp: string;
}

interface SystemContextType {
  mode: SystemMode;
  setMode: (mode: SystemMode) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  health: HealthStatus;
  users: LinuxUser[];
  groups: LinuxGroup[];
  files: SandboxFile[];
  logs: ActivityLog[];
  diagnostics: SystemDiagnostics | null;
  loading: boolean;
  refreshAll: () => Promise<void>;
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  dismissToast: (id: string) => void;
  resetDemoData: () => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<SystemMode>('demo');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [backendUrl, setBackendUrlState] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [users, setUsers] = useState<LinuxUser[]>([]);
  const [groups, setGroups] = useState<LinuxGroup[]>([]);
  const [files, setFiles] = useState<SandboxFile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  const [health, setHealth] = useState<HealthStatus>({
    status: 'ok',
    mode: 'demo',
    isLocalBackendAvailable: false,
    currentLinuxUser: 'sysadmin',
    currentUid: 1000,
    sandboxPath: '/var/academic/sandbox',
    latencyMs: 1,
  });

  const showToast = useCallback((t: Omit<Toast, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: Toast = { ...t, id, timestamp: new Date().toLocaleTimeString() };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setMode = useCallback((newMode: SystemMode) => {
    api.setMode(newMode);
    setModeState(newMode);
    showToast({
      type: 'info',
      title: `Switched to ${newMode === 'demo' ? 'DEMO MODE' : 'LOCAL LINUX MODE'}`,
      message: newMode === 'demo'
        ? 'Operating in simulated sandbox with realistic mock state.'
        : 'Connecting to real Linux backend process with strict argument allowlist.'
    });
  }, [showToast]);

  const setBackendUrl = useCallback((url: string) => {
    api.setCustomBaseUrl(url);
    setBackendUrlState(url);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      // Check health
      const h = await api.checkHealth();
      setHealth({
        status: h.isAvailable ? 'ok' : (mode === 'local' ? 'degraded' : 'ok'),
        mode,
        isLocalBackendAvailable: h.isAvailable,
        currentLinuxUser: h.data?.currentLinuxUser || 'sysadmin',
        currentUid: h.data?.currentUid || 1000,
        sandboxPath: h.data?.sandboxPath || '/var/academic/sandbox',
        latencyMs: h.latencyMs,
      });

      const [u, g, f, l, d] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getGroups().catch(() => []),
        api.getFiles().catch(() => []),
        api.getLogs().catch(() => []),
        api.getSystemDiagnostics().catch(() => null),
      ]);

      setUsers(u);
      setGroups(g);
      setFiles(f);
      setLogs(l);
      setDiagnostics(d);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Refresh Warning',
        message: err.message || 'Failed to sync Linux state.'
      });
    } finally {
      setLoading(false);
    }
  }, [mode, showToast]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll, mode]);

  // Periodic heartbeat
  useEffect(() => {
    const interval = setInterval(async () => {
      const h = await api.checkHealth();
      setHealth((prev) => ({
        ...prev,
        isLocalBackendAvailable: h.isAvailable,
        latencyMs: h.latencyMs,
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const resetDemoData = useCallback(() => {
    api.resetDemoData();
    refreshAll();
    showToast({
      type: 'success',
      title: 'Demo State Reset',
      message: 'Restored original demo users, groups, files and audit logs.'
    });
  }, [refreshAll, showToast]);

  return (
    <SystemContext.Provider
      value={{
        mode,
        setMode,
        activeTab,
        setActiveTab,
        health,
        users,
        groups,
        files,
        logs,
        diagnostics,
        loading,
        refreshAll,
        toasts,
        showToast,
        dismissToast,
        resetDemoData,
        backendUrl,
        setBackendUrl,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
