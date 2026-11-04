import React, { useState } from 'react';
import { SystemProvider, useSystem } from './context/SystemContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { DashboardView } from './components/views/DashboardView';
import { UserManagementView } from './components/views/UserManagementView';
import { GroupManagementView } from './components/views/GroupManagementView';
import { FilePermissionView } from './components/views/FilePermissionView';
import { ActivityLogsView } from './components/views/ActivityLogsView';
import { SystemInfoView } from './components/views/SystemInfoView';
import { DocumentationView } from './components/views/DocumentationView';
import {
  LayoutDashboard,
  Users,
  Layers,
  FolderLock,
  ScrollText,
  Activity,
  BookOpen,
  Menu,
  X
} from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab } = useSystem();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileNavItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'groups', label: 'Groups', icon: Layers },
    { id: 'permissions', label: 'Permissions', icon: FolderLock },
    { id: 'logs', label: 'Logs', icon: ScrollText },
    { id: 'system', label: 'System', icon: Activity },
    { id: 'docs', label: 'Docs', icon: BookOpen },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header />

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900/90 px-4 py-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>Active View:</span>
          <span className="text-emerald-400 capitalize">{activeTab}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-3 space-y-1 z-20">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Dynamic View Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'users' && <UserManagementView />}
            {activeTab === 'groups' && <GroupManagementView />}
            {activeTab === 'permissions' && <FilePermissionView />}
            {activeTab === 'logs' && <ActivityLogsView />}
            {activeTab === 'system' && <SystemInfoView />}
            {activeTab === 'docs' && <DocumentationView />}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <SystemProvider>
      <MainContent />
    </SystemProvider>
  );
}
