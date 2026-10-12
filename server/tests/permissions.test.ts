import { describe, it, expect } from 'vitest';
import { permissions } from '../../lib/permissions';
import { UserProfile, Entry } from '../../lib/types';

describe('EYE Central Permission Matrix', () => {
  const admin: UserProfile = {
    id: 'u-admin',
    fullName: 'Usman Tariq',
    email: 'admin@denimcrafts.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
  };

  const manager: UserProfile = {
    id: 'u-mgr',
    fullName: 'Rashid Khan',
    email: 'manager@denimcrafts.com',
    role: 'MANAGER',
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
  };

  const merchUser1: UserProfile = {
    id: 'u-merch-1',
    fullName: 'Bilal Ahmed',
    email: 'bilal@denimcrafts.com',
    role: 'MERCHANDISER',
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
  };

  const merchUser2: UserProfile = {
    id: 'u-merch-2',
    fullName: 'Hamza Farooq',
    email: 'hamza@denimcrafts.com',
    role: 'MERCHANDISER',
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
  };

  const todayStr = new Date().toISOString();

  const entryCreatedTodayByMerch1: Entry = {
    id: 'ent-today-1',
    challanId: 'dc-1',
    entryDate: todayStr.slice(0, 10),
    type: 'OUT',
    qty: 250,
    createdById: merchUser1.id,
    createdAt: todayStr,
    updatedAt: todayStr,
  };

  const entryCreatedYesterdayByMerch1: Entry = {
    id: 'ent-yest-1',
    challanId: 'dc-1',
    entryDate: '2026-10-10',
    type: 'OUT',
    qty: 250,
    createdById: merchUser1.id,
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
  };

  it('allows all active users to open DCs and add entries', () => {
    expect(permissions.canOpenDC(admin)).toBe(true);
    expect(permissions.canOpenDC(manager)).toBe(true);
    expect(permissions.canOpenDC(merchUser1)).toBe(true);

    expect(permissions.canAddEntry(admin)).toBe(true);
    expect(permissions.canAddEntry(manager)).toBe(true);
    expect(permissions.canAddEntry(merchUser1)).toBe(true);
  });

  it('allows merchandisers to edit/delete ONLY their own entries created today', () => {
    // Same day, own entry -> ALLOWED
    expect(permissions.canEditEntry(merchUser1, entryCreatedTodayByMerch1)).toBe(true);
    expect(permissions.canDeleteEntry(merchUser1, entryCreatedTodayByMerch1)).toBe(true);

    // Another merchandiser attempting to edit/delete -> REJECTED
    expect(permissions.canEditEntry(merchUser2, entryCreatedTodayByMerch1)).toBe(false);
    expect(permissions.canDeleteEntry(merchUser2, entryCreatedTodayByMerch1)).toBe(false);

    // Past day entry created by own self -> REJECTED for merchandiser
    expect(permissions.canEditEntry(merchUser1, entryCreatedYesterdayByMerch1)).toBe(false);
    expect(permissions.canDeleteEntry(merchUser1, entryCreatedYesterdayByMerch1)).toBe(false);
  });

  it('allows Manager and Admin to edit/delete any entry on any day', () => {
    expect(permissions.canEditEntry(manager, entryCreatedYesterdayByMerch1)).toBe(true);
    expect(permissions.canDeleteEntry(manager, entryCreatedYesterdayByMerch1)).toBe(true);

    expect(permissions.canEditEntry(admin, entryCreatedYesterdayByMerch1)).toBe(true);
    expect(permissions.canDeleteEntry(admin, entryCreatedYesterdayByMerch1)).toBe(true);
  });

  it('restricts voiding a DC exclusively to Admin', () => {
    expect(permissions.canVoidDC(admin)).toBe(true);
    expect(permissions.canVoidDC(manager)).toBe(false);
    expect(permissions.canVoidDC(merchUser1)).toBe(false);
  });

  it('restricts user management and settings strictly to Admin', () => {
    expect(permissions.canManageUsers(admin)).toBe(true);
    expect(permissions.canManageUsers(manager)).toBe(false);
    expect(permissions.canManageUsers(merchUser1)).toBe(false);

    expect(permissions.canManageSettings(admin)).toBe(true);
    expect(permissions.canManageSettings(manager)).toBe(false);
  });

  it('blocks deactivated users from all actions', () => {
    const deactivatedUser: UserProfile = { ...merchUser1, isActive: false };
    expect(permissions.canViewAllDCs(deactivatedUser)).toBe(false);
    expect(permissions.canOpenDC(deactivatedUser)).toBe(false);
    expect(permissions.canAddEntry(deactivatedUser)).toBe(false);
  });
});
