'use client';

import React from 'react';
import { UserPlus, Shield, UserX, UserCheck, KeyRound, Edit } from 'lucide-react';
import { UserProfile, Role } from '@/lib/types';
import { formatKarachiDate } from '@/lib/ledger';

export function UsersView() {
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newRole, setNewRole] = React.useState<Role>('MERCHANDISER');

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editRole, setEditRole] = React.useState<Role>('MERCHANDISER');
  const [editActive, setEditActive] = React.useState(true);

  const [notification, setNotification] = React.useState<string | null>(null);

  const refreshUsers = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const res = await fetch('/api/v1/users');
        if (!res.ok) throw new Error('Failed to load users');
        const json = await res.json();
        if (isSubscribed) {
          setUsers(json.users || []);
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isSubscribed = false;
    };
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to create user');
        return;
      }
      setCreateModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNotification('User created successfully');
      refreshUsers();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/v1/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editName.trim(),
          role: editRole,
          isActive: editActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to update user');
        return;
      }
      setEditModalOpen(false);
      setNotification('User updated successfully');
      refreshUsers();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleResetPassword(user: UserProfile) {
    if (!confirm(`Send password reset email to ${user.fullName} (${user.email})?`)) return;
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to reset password');
        return;
      }
      setNotification(`Password reset triggered for ${user.email}`);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin console: manage Denim Crafts floor roles, authorizations, and credentials
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-lg transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-xl border border-red-200 text-xs text-red-600">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{u.fullName}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'MANAGER'
                        ? 'bg-blue-100 text-[#1e3a5f]'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      u.isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}>
                      {u.isActive ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Active
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5 text-slate-400" />
                          Deactivated
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {formatKarachiDate(u.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditName(u.fullName);
                          setEditRole(u.role);
                          setEditActive(u.isActive);
                          setEditModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-[#1e3a5f] rounded hover:bg-slate-100"
                        title="Edit User"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(u)}
                        className="p-1 text-slate-400 hover:text-amber-700 rounded hover:bg-slate-100"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Add New Denim Crafts User</h3>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. tariq@denimcrafts.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                >
                  <option value="MERCHANDISER">Merchandiser (View all, open DC, own same-day edits)</option>
                  <option value="MANAGER">Manager (Any edit/delete, reopen DC, view audits, export)</option>
                  <option value="ADMIN">Admin (Full access, user management, settings, void DC)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] rounded-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Edit User: {editingUser.email}</h3>
            <form onSubmit={handleUpdateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                >
                  <option value="MERCHANDISER">Merchandiser</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={editActive}
                  onChange={e => setEditActive(e.target.checked)}
                  className="rounded border-slate-300 text-[#1e3a5f]"
                />
                <label htmlFor="userActiveCheck" className="text-xs font-semibold text-slate-700">
                  Account Active (Uncheck to deactivate user)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
