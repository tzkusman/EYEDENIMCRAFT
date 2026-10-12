'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { ActiveDcsView } from '@/components/ActiveDcsView';
import { RegisterView } from '@/components/RegisterView';
import { DcDetailView } from '@/components/DcDetailView';
import { ReportsView } from '@/components/ReportsView';
import { UsersView } from '@/components/UsersView';
import { AuditView } from '@/components/AuditView';
import { SettingsView } from '@/components/SettingsView';
import { OpenDcModal } from '@/components/OpenDcModal';
import { UserProfile, Challan } from '@/lib/types';
import { permissions } from '@/lib/permissions';

export default function HomePage() {
  const [currentView, setCurrentView] = React.useState<string>('active-dcs');
  const [selectedDcId, setSelectedDcId] = React.useState<string | null>(null);
  const [openDcModalOpen, setOpenDcModalOpen] = React.useState(false);

  // Current session & available demo accounts
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = React.useState<UserProfile[]>([]);
  const [loadingAuth, setLoadingAuth] = React.useState(true);

  const refreshAuth = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const json = await res.json();
        setCurrentUser(json.user);
        setAvailableUsers(json.availableUsers || []);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }, []);

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (isSubscribed) {
            setCurrentUser(json.user);
            setAvailableUsers(json.availableUsers || []);
            setLoadingAuth(false);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        if (isSubscribed) {
          setLoadingAuth(false);
        }
      }
    };

    load();
    return () => {
      isSubscribed = false;
    };
  }, []);

  async function handleSwitchUser(userId: string) {
    try {
      const res = await fetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const json = await res.json();
        setCurrentUser(json.user);

        // If switched to Merchandiser while on Admin/Manager only pages, route to dashboard
        if (json.user.role === 'MERCHANDISER') {
          if (['users', 'settings', 'audit', 'reports'].includes(currentView)) {
            setCurrentView('active-dcs');
          }
        }
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  }

  function handleOpenDc(dcId: string) {
    setSelectedDcId(dcId);
    setCurrentView('dc-detail');
  }

  function handleDcCreated(challan: Challan) {
    setSelectedDcId(challan.id);
    setCurrentView('dc-detail');
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading EYE Production Monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={view => {
          setCurrentView(view);
          if (view !== 'dc-detail') setSelectedDcId(null);
        }}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSwitchUser={handleSwitchUser}
        onOpenNewDcModal={() => setOpenDcModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {(currentView === 'active-dcs' || currentView === 'dashboard') && (
          <ActiveDcsView
            currentUser={currentUser}
            onSelectDc={handleOpenDc}
            onOpenNewDcModal={() => setOpenDcModalOpen(true)}
          />
        )}

        {currentView === 'register' && (
          <RegisterView
            currentUser={currentUser}
            onSelectDc={handleOpenDc}
          />
        )}

        {currentView === 'dc-detail' && selectedDcId && (
          <DcDetailView
            dcId={selectedDcId}
            currentUser={currentUser}
            onBack={() => setCurrentView('active-dcs')}
            onRefresh={refreshAuth}
          />
        )}

        {currentView === 'reports' && permissions.canExportReports(currentUser) && (
          <ReportsView />
        )}

        {currentView === 'audit' && permissions.canViewAuditLog(currentUser) && (
          <AuditView />
        )}

        {currentView === 'users' && permissions.canManageUsers(currentUser) && (
          <UsersView />
        )}

        {currentView === 'settings' && permissions.canManageSettings(currentUser) && (
          <SettingsView />
        )}

      </main>

      {/* Open New DC Modal */}
      <OpenDcModal
        isOpen={openDcModalOpen}
        onClose={() => setOpenDcModalOpen(false)}
        onSuccess={handleDcCreated}
        onJumpToExistingDc={dcId => handleOpenDc(dcId)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} Denim Crafts (Karachi, Pakistan) — EYE Production Monitor</p>
          <div className="flex items-center gap-4">
            <span>Operating Timezone: Asia/Karachi (UTC+5)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400">v1.0.0 Production</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
