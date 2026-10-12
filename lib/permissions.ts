import { Role, UserProfile, Entry } from './types';

/**
 * EYE Central Permission Matrix
 * Used by both backend API middleware and UI components to enforce
 * consistent authorization across Denim Crafts production systems.
 */
export const permissions = {
  // All authenticated users can view DCs and entries
  canViewAllDCs: (user?: UserProfile | null): boolean => {
    return Boolean(user && user.isActive);
  },

  // All authenticated users can open a new DC
  canOpenDC: (user?: UserProfile | null): boolean => {
    return Boolean(user && user.isActive);
  },

  // All authenticated users can add IN or OUT entries
  canAddEntry: (user?: UserProfile | null): boolean => {
    return Boolean(user && user.isActive);
  },

  /**
   * Edit Entry rule:
   * - MERCHANDISER: Can edit ONLY their own entry, and only on the same calendar day it was created (reason required)
   * - MANAGER & ADMIN: Can edit ANY entry on any day (reason required)
   */
  canEditEntry: (user?: UserProfile | null, entry?: Entry | null): boolean => {
    if (!user || !user.isActive || !entry) return false;
    if (entry.deletedAt) return false;

    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return true;
    }

    if (user.role === 'MERCHANDISER') {
      if (entry.createdById !== user.id) return false;
      // Check if created on the same day in Karachi (YYYY-MM-DD)
      const createdDate = entry.createdAt.slice(0, 10);
      const todayDate = new Date().toISOString().slice(0, 10);
      return createdDate === todayDate;
    }

    return false;
  },

  /**
   * Delete Entry rule (soft delete):
   * - MERCHANDISER: Can delete ONLY their own entry, and only on the same day it was created (reason required)
   * - MANAGER & ADMIN: Can delete ANY entry on any day (reason required)
   */
  canDeleteEntry: (user?: UserProfile | null, entry?: Entry | null): boolean => {
    if (!user || !user.isActive || !entry) return false;
    if (entry.deletedAt) return false;

    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return true;
    }

    if (user.role === 'MERCHANDISER') {
      if (entry.createdById !== user.id) return false;
      const createdDate = entry.createdAt.slice(0, 10);
      const todayDate = new Date().toISOString().slice(0, 10);
      return createdDate === todayDate;
    }

    return false;
  },

  // Edit Opening Quantity: MANAGER and ADMIN only (reason required, audit-logged)
  canEditOpeningQty: (user?: UserProfile | null): boolean => {
    if (!user || !user.isActive) return false;
    return user.role === 'ADMIN' || user.role === 'MANAGER';
  },

  // Reopen a closed DC: MANAGER and ADMIN
  canReopenDC: (user?: UserProfile | null): boolean => {
    if (!user || !user.isActive) return false;
    return user.role === 'ADMIN' || user.role === 'MANAGER';
  },

  // Void a DC: ADMIN only (reason required, audit-logged, DC cannot be reused)
  canVoidDC: (user?: UserProfile | null): boolean => {
    if (!user || !user.isActive) return false;
    return user.role === 'ADMIN';
  },

  // Export full reports (Excel/PDF): MANAGER and ADMIN only
  canExportReports: (user?: UserProfile | null): boolean => {
    if (!user || !user.isActive) return false;
    return user.role === 'ADMIN' || user.role === 'MANAGER';
  },

  // View audit log: MANAGER and ADMIN
  canViewAuditLog: (user?: UserProfile | null): boolean => {
    if (!user || !user.isActive) return false;
    return user.role === 'ADMIN' || user.role === 'MANAGER';
  },

  // User Management (create, edit, change roles, activate/deactivate, reset passwords): ADMIN only
  canManageUsers: (user?: UserProfile | null): boolean => {
    if (!user || !user.isActive) return false;
    return user.role === 'ADMIN';
  },

  // App Settings (stale days threshold, company name): ADMIN only
  canManageSettings: (user?: UserProfile | null): boolean => {
    if (!user || !user.isActive) return false;
    return user.role === 'ADMIN';
  },
};
