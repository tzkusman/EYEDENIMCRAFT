'use client';

import React from 'react';
import { Eye, UserCircle2, ChevronDown, Check, Plus, Database } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { permissions } from '@/lib/permissions';
import { SupabaseModal } from './SupabaseModal';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: UserProfile | null;
  availableUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onOpenNewDcModal: () => void;
}

export function Navbar({
  currentView,
  onNavigate,
  currentUser,
  availableUsers,
  onSwitchUser,
  onOpenNewDcModal,
}: NavbarProps) {
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);
  const [supabaseModalOpen, setSupabaseModalOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANAGER':
        return 'bg-blue-100 text-[#1e3a5f] border-blue-200';
      case 'MERCHANDISER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('active-dcs')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] flex items-center justify-center text-white shadow-xs group-hover:bg-[#152a45] transition-colors">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-[#1e3a5f] block leading-none">
                  EYE
                </span>
                <span className="text-[11px] font-medium text-slate-500 tracking-wide block mt-0.5">
                  Denim Crafts · Karachi
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onNavigate('active-dcs')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'active-dcs' || currentView === 'dashboard'
                  ? 'bg-slate-100 text-[#1e3a5f] font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Active DCs
            </button>

            <button
              onClick={() => onNavigate('register')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'register'
                  ? 'bg-slate-100 text-[#1e3a5f]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Date Register
            </button>

            {permissions.canExportReports(currentUser) && (
              <button
                onClick={() => onNavigate('reports')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  currentView === 'reports'
                    ? 'bg-slate-100 text-[#1e3a5f]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Reports
              </button>
            )}

            {permissions.canViewAuditLog(currentUser) && (
              <button
                onClick={() => onNavigate('audit')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  currentView === 'audit'
                    ? 'bg-slate-100 text-[#1e3a5f]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Audit Log
              </button>
            )}

            {permissions.canManageUsers(currentUser) && (
              <button
                onClick={() => onNavigate('users')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  currentView === 'users'
                    ? 'bg-slate-100 text-[#1e3a5f]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Users
              </button>
            )}

            {permissions.canManageSettings(currentUser) && (
              <button
                onClick={() => onNavigate('settings')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  currentView === 'settings'
                    ? 'bg-slate-100 text-[#1e3a5f]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Settings
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Action & Role Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Supabase Database Button */}
            <button
              onClick={() => setSupabaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-md transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
              title="Supabase Database Connection & Schema"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Database</span>
            </button>

            {/* Open New DC Button */}
            <button
              onClick={onOpenNewDcModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-md transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Open DC</span>
            </button>

            {/* Profile & Demo Role Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/60 transition-colors focus:outline-hidden"
                title="Switch active user or role for testing"
              >
                <UserCircle2 className="w-5 h-5 text-slate-500" />
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser?.fullName || 'User'}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {currentUser?.role}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleBadgeColor(
                    currentUser?.role
                  )}`}
                >
                  {currentUser?.role}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">Switch Role / Test Persona</p>
                    <p className="text-[11px] text-slate-500">
                      Instantly test Denim Crafts permissions:
                    </p>
                  </div>
                  <div className="py-1">
                    {availableUsers.map(u => {
                      const isSelected = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u.id);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-blue-50/60 text-[#1e3a5f] font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span>{u.fullName}</span>
                              <span
                                className={`text-[9px] font-bold px-1 py-0.2 rounded border ${getRoleBadgeColor(
                                  u.role
                                )}`}
                              >
                                {u.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">{u.email}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#1e3a5f]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />
    </header>
  );
}
