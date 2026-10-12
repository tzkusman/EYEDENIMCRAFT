export type Role = 'ADMIN' | 'MANAGER' | 'MERCHANDISER';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Challan {
  id: string;
  dcNo: string; // IMMUTABLE once created
  openDate: string; // YYYY-MM-DD
  openingQty: number;
  party?: string;
  article?: string;
  remarks?: string;
  status: 'OPEN' | 'CLOSED' | 'VOID';
  closedDate?: string | null;
  voidReason?: string | null;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  challanId: string;
  entryDate: string; // YYYY-MM-DD
  type: 'IN' | 'OUT';
  qty: number;
  note?: string;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface LedgerRow {
  rowNumber: number;
  id?: string;
  isOpening?: boolean;
  date: string;
  inQty: number | null;
  outQty: number | null;
  balance: number | null; // null if closed when viewing closed state or formatted as "—"
  rawBalance: number;
  gapDays: number;
  hasGapDivider?: boolean;
  note?: string;
  enteredBy: string;
  createdById: string;
  createdAt: string;
}

export interface ChallanSummary {
  totalIn: number;
  totalOut: number;
  difference: number;
  currentBalance: number;
  isClosed: boolean;
  daysOpen: number;
  daysSinceLastEntry: number;
  averageGap: number;
  longestGap: number;
  isStale: boolean;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID' | 'REOPEN' | 'SETTINGS';
  entity: 'CHALLAN' | 'ENTRY' | 'USER' | 'SETTING';
  entityId: string;
  oldValue?: Record<string, unknown> | null | any;
  newValue?: Record<string, unknown> | null | any;
  reason?: string;
  ip?: string;
  createdAt: string;
}

export interface AppSettings {
  staleDays: number;
  companyName: string;
  karachiTimezone: string;
  [key: string]: unknown;
}
