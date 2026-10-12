import fs from 'fs';
import path from 'path';
import { Challan, Entry, UserProfile, AuditLogItem, AppSettings } from './types';
import { getTodayDateString, buildLedger } from './ledger';
import { supabase, getSupabaseClient } from './supabase';

const DATA_FILE = path.join(process.cwd(), '.eye_data.json');

// In-memory data store with atomic disk persistence for AI Studio Next.js server runtime
class Store {
  private users: UserProfile[] = [];
  private challans: Challan[] = [];
  private entries: Entry[] = [];
  private auditLogs: AuditLogItem[] = [];
  private settings: AppSettings = {
    staleDays: 5,
    companyName: 'Denim Crafts',
    karachiTimezone: 'Asia/Karachi',
  };
  private currentUserId: string = 'usr-admin-1';
  private initialized: boolean = false;

  constructor() {
    this.seed();
    this.loadFromDisk();
    this.syncWithSupabase().catch(() => {});
  }

  async syncWithSupabase(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data: supaChallans, error: chErr } = await client
        .from('challans')
        .select('*');

      if (!chErr && Array.isArray(supaChallans)) {
        for (const c of supaChallans) {
          const mapped: Challan = {
            id: c.id,
            dcNo: String(c.dc_no),
            openDate: c.open_date,
            openingQty: Number(c.opening_qty) || 0,
            party: c.party || '',
            article: c.article || '',
            remarks: c.remarks || '',
            status: c.status || 'OPEN',
            closedDate: c.closed_date || null,
            voidReason: c.void_reason || null,
            createdById: c.created_by_id || 'usr-admin-1',
            createdByName: c.created_by_name || 'Operator',
            createdAt: c.created_at || new Date().toISOString(),
            updatedAt: c.updated_at || new Date().toISOString(),
          };

          const idx = this.challans.findIndex(x => x.id === mapped.id || x.dcNo === mapped.dcNo);
          if (idx !== -1) {
            this.challans[idx] = { ...this.challans[idx], ...mapped };
          } else {
            this.challans.push(mapped);
          }
        }
      }

      const { data: supaEntries, error: entErr } = await client
        .from('entries')
        .select('*');

      if (!entErr && Array.isArray(supaEntries)) {
        for (const e of supaEntries) {
          const mapped: Entry = {
            id: e.id,
            challanId: e.challan_id,
            entryDate: e.entry_date,
            type: e.type,
            qty: Number(e.qty) || 0,
            note: e.note || '',
            createdById: e.created_by_id || 'usr-admin-1',
            createdByName: e.created_by_name || 'Operator',
            createdAt: e.created_at || new Date().toISOString(),
            updatedAt: e.updated_at || new Date().toISOString(),
            deletedAt: e.deleted_at || null,
          };

          const idx = this.entries.findIndex(x => x.id === mapped.id);
          if (idx !== -1) {
            this.entries[idx] = { ...this.entries[idx], ...mapped };
          } else {
            this.entries.push(mapped);
          }
        }
      }

      this.saveToDisk();
    } catch (err) {
      console.error('Failed to sync with Supabase:', err);
    }
  }

  private saveToDisk() {
    try {
      const payload = {
        users: this.users,
        challans: this.challans,
        entries: this.entries,
        auditLogs: this.auditLogs,
        settings: this.settings,
        currentUserId: this.currentUserId,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Ignore in read-only environments
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (Array.isArray(parsed.users) && parsed.users.length > 0) this.users = parsed.users;
          if (Array.isArray(parsed.challans)) this.challans = parsed.challans;
          if (Array.isArray(parsed.entries)) this.entries = parsed.entries;
          if (Array.isArray(parsed.auditLogs)) this.auditLogs = parsed.auditLogs;
          if (parsed.settings) this.settings = parsed.settings;
          if (parsed.currentUserId) this.currentUserId = parsed.currentUserId;
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  private seed() {
    if (this.initialized) return;

    // 1. Seed Users (with Usman as Admin)
    this.users = [
      {
        id: 'usr-admin-1',
        fullName: 'Usman (Admin)',
        email: 'tzkusman786@gmail.com',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-manager-2',
        fullName: 'Rashid Khan (Floor Manager)',
        email: 'manager@denimcrafts.com',
        role: 'MANAGER',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-merch-3',
        fullName: 'Bilal Ahmed (Merchandiser)',
        email: 'merch@denimcrafts.com',
        role: 'MERCHANDISER',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    // Clean initial state: No fake or placeholder records
    this.challans = [];
    this.entries = [];
    this.auditLogs = [];
    this.initialized = true;
  }

  // Clear all production records (Challans, Entries, Audit Logs) to start completely fresh
  clearAllProductionData() {
    this.challans = [];
    this.entries = [];
    this.auditLogs = [];
    this.saveToDisk();

    try {
      if (supabase) {
        Promise.resolve(supabase.from('entries').delete().neq('id', '')).catch(() => {});
        Promise.resolve(supabase.from('challans').delete().neq('id', '')).catch(() => {});
      }
    } catch {
      // Ignore if Supabase tables not configured yet
    }
  }

  // User Management
  getCurrentUser(): UserProfile {
    return this.users.find(u => u.id === this.currentUserId) || this.users[0];
  }

  setCurrentUser(id: string) {
    const user = this.users.find(u => u.id === id);
    if (user) {
      this.currentUserId = id;
      this.saveToDisk();
    }
  }

  getUsers(): UserProfile[] {
    return [...this.users];
  }

  getUserById(id: string): UserProfile | undefined {
    return this.users.find(u => u.id === id);
  }

  addUser(userData: Omit<UserProfile, 'id' | 'createdAt'>): UserProfile {
    const id = `usr-${Date.now()}`;
    const newUser: UserProfile = {
      ...userData,
      id,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.saveToDisk();
    return newUser;
  }

  updateUser(id: string, updates: Partial<UserProfile>): UserProfile {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    this.users[idx] = { ...this.users[idx], ...updates };
    this.saveToDisk();
    return this.users[idx];
  }

  // Challans
  getChallans(): Challan[] {
    return [...this.challans];
  }

  getChallanById(id: string): Challan | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    const cleanUpper = id.trim().toUpperCase();
    return this.challans.find(
      c => c.id.toLowerCase() === clean ||
           c.dcNo.toUpperCase() === cleanUpper ||
           c.id.toLowerCase() === `dc-${clean}` ||
           clean === `dc-${c.id.toLowerCase()}` ||
           c.dcNo.toUpperCase() === `DC-${cleanUpper}`
    );
  }

  getChallanByDcNo(dcNo: string): Challan | undefined {
    const clean = dcNo.trim().toUpperCase();
    return this.challans.find(
      c => c.dcNo === clean || c.dcNo === `DC-${clean}` || clean === `DC-${c.dcNo}`
    );
  }

  createChallan(data: {
    dcNo: string;
    openDate: string;
    openingQty: number;
    party?: string;
    article?: string;
    remarks?: string;
    createdById: string;
  }): Challan {
    const cleanDcNo = data.dcNo.trim().toUpperCase();
    if (!cleanDcNo) {
      throw new Error('DC No cannot be blank');
    }

    const existing = this.getChallanByDcNo(cleanDcNo);
    if (existing) {
      const err = new Error(`This DC No is already open (${cleanDcNo})`);
      (err as unknown as { code: string }).code = 'DC_EXISTS';
      throw err;
    }

    const creator = this.getUserById(data.createdById);
    const now = new Date().toISOString();
    const id = `dc-${cleanDcNo.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const challan: Challan = {
      id,
      dcNo: cleanDcNo,
      openDate: data.openDate,
      openingQty: data.openingQty,
      party: data.party?.trim() || '',
      article: data.article?.trim() || '',
      remarks: data.remarks?.trim() || '',
      status: 'OPEN',
      closedDate: null,
      voidReason: null,
      createdById: data.createdById,
      createdByName: creator?.fullName || 'Operator',
      createdAt: now,
      updatedAt: now,
    };

    this.challans.unshift(challan);

    // Audit log
    this.addAuditLog({
      userId: data.createdById,
      userName: creator?.fullName || 'Operator',
      userEmail: creator?.email || '',
      action: 'CREATE',
      entity: 'CHALLAN',
      entityId: challan.id,
      oldValue: null,
      newValue: {
        dcNo: challan.dcNo,
        openDate: challan.openDate,
        openingQty: challan.openingQty,
        party: challan.party,
        article: challan.article,
      },
      reason: 'Created new DC',
    });

    this.saveToDisk();

    try {
      if (supabase) {
        Promise.resolve(
          supabase.from('challans').insert({
            id: challan.id,
            dc_no: challan.dcNo,
            open_date: challan.openDate,
            opening_qty: challan.openingQty,
            party: challan.party || null,
            article: challan.article || null,
            remarks: challan.remarks || null,
            status: challan.status,
            created_by_id: challan.createdById || null,
          })
        ).catch(() => {});
      }
    } catch {
      // Ignore if Supabase tables not set up yet
    }

    return challan;
  }

  updateChallan(
    id: string,
    updates: {
      party?: string;
      article?: string;
      remarks?: string;
      openingQty?: number;
      reason?: string;
    },
    user: UserProfile
  ): Challan {
    const idx = this.challans.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Challan not found');

    const challan = this.challans[idx];

    // IMMUTABILITY GUARD: Reject any attempt to change dcNo
    if ('dcNo' in updates && (updates as Record<string, unknown>).dcNo !== challan.dcNo) {
      throw new Error('DC No is strictly immutable and cannot be changed.');
    }

    const oldVal: Record<string, unknown> = {
      party: challan.party,
      article: challan.article,
      remarks: challan.remarks,
      openingQty: challan.openingQty,
    };

    if (updates.party !== undefined) challan.party = updates.party.trim();
    if (updates.article !== undefined) challan.article = updates.article.trim();
    if (updates.remarks !== undefined) challan.remarks = updates.remarks.trim();

    if (updates.openingQty !== undefined && updates.openingQty !== challan.openingQty) {
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        throw new Error('Only Managers and Admins can modify Opening Quantity.');
      }
      if (!updates.reason) {
        throw new Error('A reason is required to modify Opening Quantity.');
      }
      challan.openingQty = updates.openingQty;
    }

    challan.updatedAt = new Date().toISOString();

    // Recompute auto-closure / reopen status
    const entries = this.getEntriesByChallanId(challan.id);
    const { summary } = buildLedger(challan, entries, this.settings.staleDays);
    if (summary.currentBalance === 0) {
      challan.status = 'CLOSED';
      challan.closedDate = entries.length > 0 ? entries[entries.length - 1].entryDate : challan.openDate;
    } else if (challan.status === 'CLOSED' && summary.currentBalance > 0) {
      challan.status = 'OPEN';
      challan.closedDate = null;
    }

    this.challans[idx] = challan;

    this.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'UPDATE',
      entity: 'CHALLAN',
      entityId: challan.id,
      oldValue: oldVal,
      newValue: {
        party: challan.party,
        article: challan.article,
        remarks: challan.remarks,
        openingQty: challan.openingQty,
      },
      reason: updates.reason || 'Updated DC header information',
    });

    this.saveToDisk();

    try {
      if (supabase) {
        Promise.resolve(
          supabase.from('challans').update({
            party: challan.party,
            article: challan.article,
            remarks: challan.remarks,
            opening_qty: challan.openingQty,
            status: challan.status,
            updated_at: challan.updatedAt,
          }).eq('id', challan.id)
        ).catch(() => {});
      }
    } catch {
      // Ignore if Supabase tables not set up yet
    }

    return challan;
  }

  voidChallan(id: string, reason: string, user: UserProfile): Challan {
    if (user.role !== 'ADMIN') {
      throw new Error('Only Admins can void a DC.');
    }
    if (!reason || !reason.trim()) {
      throw new Error('A valid reason is strictly required to void a DC.');
    }

    const idx = this.challans.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Challan not found');

    const challan = this.challans[idx];
    const oldStatus = challan.status;
    challan.status = 'VOID';
    challan.voidReason = reason.trim();
    challan.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'VOID',
      entity: 'CHALLAN',
      entityId: challan.id,
      oldValue: { status: oldStatus },
      newValue: { status: 'VOID', voidReason: challan.voidReason },
      reason: reason.trim(),
    });

    this.saveToDisk();
    return challan;
  }

  // Entries
  getEntries(): Entry[] {
    return [...this.entries];
  }

  getEntriesByChallanId(challanId: string): Entry[] {
    return this.entries.filter(e => e.challanId === challanId && !e.deletedAt);
  }

  getEntryById(id: string): Entry | undefined {
    return this.entries.find(e => e.id === id);
  }

  addEntry(data: {
    challanId: string;
    entryDate: string;
    type: 'IN' | 'OUT';
    qty: number;
    note?: string;
    createdById: string;
  }): { entry: Entry; challan: Challan } {
    const challan = this.getChallanById(data.challanId);
    if (!challan) throw new Error('Challan not found');
    if (challan.status === 'VOID') throw new Error('Cannot add entries to a voided DC');

    const user = this.getUserById(data.createdById);
    const now = new Date().toISOString();
    const id = `ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newEntry: Entry = {
      id,
      challanId: data.challanId,
      entryDate: data.entryDate,
      type: data.type,
      qty: data.qty,
      note: data.note?.trim() || '',
      createdById: data.createdById,
      createdByName: user?.fullName || 'Operator',
      createdAt: now,
      updatedAt: now,
    };

    this.entries.push(newEntry);

    // Recompute balance
    const allChallanEntries = this.getEntriesByChallanId(challan.id);
    const { summary } = buildLedger(challan, allChallanEntries, this.settings.staleDays);

    if (summary.currentBalance === 0) {
      challan.status = 'CLOSED';
      challan.closedDate = data.entryDate;
      challan.updatedAt = now;
    } else if (challan.status === 'CLOSED' && summary.currentBalance > 0) {
      challan.status = 'OPEN';
      challan.closedDate = null;
      challan.updatedAt = now;
    }

    this.addAuditLog({
      userId: data.createdById,
      userName: user?.fullName || 'Operator',
      userEmail: user?.email || '',
      action: 'CREATE',
      entity: 'ENTRY',
      entityId: newEntry.id,
      oldValue: null,
      newValue: {
        challanId: challan.id,
        dcNo: challan.dcNo,
        entryDate: newEntry.entryDate,
        type: newEntry.type,
        qty: newEntry.qty,
        note: newEntry.note,
      },
      reason: `Recorded ${newEntry.type} movement of ${newEntry.qty}`,
    });

    try {
      if (supabase) {
        Promise.resolve(
          supabase.from('entries').insert({
            id: newEntry.id,
            challan_id: newEntry.challanId,
            entry_date: newEntry.entryDate,
            type: newEntry.type,
            qty: newEntry.qty,
            note: newEntry.note || null,
            created_by_id: newEntry.createdById || null,
          })
        ).catch(() => {});
      }
    } catch {
      // Ignore if Supabase tables not set up yet
    }

    return { entry: newEntry, challan };
  }

  updateEntry(
    id: string,
    updates: {
      entryDate?: string;
      qty?: number;
      type?: 'IN' | 'OUT';
      note?: string;
      reason: string;
    },
    user: UserProfile
  ): { entry: Entry; challan: Challan } {
    const entryIdx = this.entries.findIndex(e => e.id === id);
    if (entryIdx === -1) throw new Error('Entry not found');
    const entry = this.entries[entryIdx];

    const challan = this.getChallanById(entry.challanId);
    if (!challan) throw new Error('Challan not found');

    const oldVal = { ...entry };

    if (updates.entryDate !== undefined) entry.entryDate = updates.entryDate;
    if (updates.qty !== undefined) entry.qty = updates.qty;
    if (updates.type !== undefined) entry.type = updates.type;
    if (updates.note !== undefined) entry.note = updates.note.trim();
    entry.updatedAt = new Date().toISOString();

    // Recompute balance and update challan closed/open state
    const allChallanEntries = this.getEntriesByChallanId(challan.id);
    const { summary } = buildLedger(challan, allChallanEntries, this.settings.staleDays);

    if (summary.currentBalance === 0) {
      challan.status = 'CLOSED';
      challan.closedDate = entry.entryDate;
    } else if (challan.status === 'CLOSED' && summary.currentBalance > 0) {
      challan.status = 'OPEN';
      challan.closedDate = null;
    }

    this.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'UPDATE',
      entity: 'ENTRY',
      entityId: entry.id,
      oldValue: oldVal,
      newValue: { ...entry },
      reason: updates.reason,
    });

    return { entry, challan };
  }

  deleteEntry(id: string, reason: string, user: UserProfile): { entry: Entry; challan: Challan } {
    const entryIdx = this.entries.findIndex(e => e.id === id);
    if (entryIdx === -1) throw new Error('Entry not found');
    const entry = this.entries[entryIdx];

    const challan = this.getChallanById(entry.challanId);
    if (!challan) throw new Error('Challan not found');

    // Soft delete
    entry.deletedAt = new Date().toISOString();

    // Recompute balance
    const allChallanEntries = this.getEntriesByChallanId(challan.id);
    const { summary } = buildLedger(challan, allChallanEntries, this.settings.staleDays);

    if (summary.currentBalance === 0) {
      challan.status = 'CLOSED';
      challan.closedDate = allChallanEntries.length > 0 
        ? allChallanEntries[allChallanEntries.length - 1].entryDate 
        : challan.openDate;
    } else if (challan.status === 'CLOSED' && summary.currentBalance > 0) {
      challan.status = 'OPEN';
      challan.closedDate = null;
    }

    this.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'DELETE',
      entity: 'ENTRY',
      entityId: entry.id,
      oldValue: { ...entry },
      newValue: { deletedAt: entry.deletedAt },
      reason,
    });

    return { entry, challan };
  }

  // Audit Logs
  getAuditLogs(): AuditLogItem[] {
    return [...this.auditLogs];
  }

  addAuditLog(item: Omit<AuditLogItem, 'id' | 'createdAt'>) {
    const log: AuditLogItem = {
      ...item,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
  }

  // Settings
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<AppSettings>, user: UserProfile): AppSettings {
    if (user.role !== 'ADMIN') {
      throw new Error('Only Admins can modify system settings');
    }
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...updates };

    this.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      action: 'SETTINGS',
      entity: 'SETTING',
      entityId: 'app_settings',
      oldValue: oldSettings,
      newValue: this.settings,
      reason: 'Updated system settings',
    });

    return { ...this.settings };
  }
}

// Global singleton instance for the server runtime
export const store = new Store();
