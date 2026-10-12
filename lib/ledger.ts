import { Challan, Entry, LedgerRow, ChallanSummary } from './types';

/**
 * Format date in dd-mm-yyyy format for Asia/Karachi timezone
 */
export function formatKarachiDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    
    // Format to YYYY-MM-DD or parse date string directly if YYYY-MM-DD
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [yyyy, mm, dd] = dateInput.split('-');
      return `${dd}-${mm}-${yyyy}`;
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Get today's date in YYYY-MM-DD (Karachi time)
 */
export function getTodayDateString(): string {
  const now = new Date();
  // Adjust for Karachi UTC+5
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const karachiTime = new Date(utc + (3600000 * 5));
  const yyyy = karachiTime.getFullYear();
  const mm = String(karachiTime.getMonth() + 1).padStart(2, '0');
  const dd = String(karachiTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculate difference in days between two YYYY-MM-DD dates
 */
export function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00Z');
  const d2 = new Date(dateStr2 + 'T00:00:00Z');
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format numbers with thousands separators (e.g. 5,000)
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  return val.toLocaleString('en-US');
}

/**
 * Builds the complete diary ledger rows and calculates the running balance
 * and gap days according to Denim Crafts production rules.
 */
export function buildLedger(
  challan: Challan,
  entries: Entry[],
  staleThresholdDays: number = 5
): {
  rows: LedgerRow[];
  summary: ChallanSummary;
} {
  // Filter active (non-deleted) entries and sort chronologically
  const activeEntries = entries
    .filter(e => !e.deletedAt)
    .sort((a, b) => {
      const dateCmp = a.entryDate.localeCompare(b.entryDate);
      if (dateCmp !== 0) return dateCmp;
      return a.createdAt.localeCompare(b.createdAt);
    });

  const rows: LedgerRow[] = [];
  let runningBalance = challan.openingQty;
  let totalIn = challan.openingQty;
  let totalOut = 0;
  let previousDate = challan.openDate;
  const gaps: number[] = [];

  // Row 1: Opening row
  // The first row is the opening quantity, shown in the In column.
  rows.push({
    rowNumber: 1,
    isOpening: true,
    date: challan.openDate,
    inQty: challan.openingQty,
    outQty: null,
    balance: runningBalance,
    rawBalance: runningBalance,
    gapDays: 0,
    hasGapDivider: false,
    note: challan.remarks ? `Opening: ${challan.remarks}` : 'Opening Balance',
    enteredBy: challan.createdByName || 'Initial Challan',
    createdById: challan.createdById,
    createdAt: challan.createdAt,
  });

  // Subsequent rows: IN and OUT movements
  activeEntries.forEach((entry, idx) => {
    const gap = daysBetween(previousDate, entry.entryDate);
    if (idx > 0 || gap > 0) {
      gaps.push(gap);
    }

    if (entry.type === 'IN') {
      runningBalance += entry.qty;
      totalIn += entry.qty;
    } else {
      runningBalance -= entry.qty;
      totalOut += entry.qty;
    }

    const hasGapDivider = gap > 1;

    rows.push({
      rowNumber: idx + 2,
      id: entry.id,
      isOpening: false,
      date: entry.entryDate,
      inQty: entry.type === 'IN' ? entry.qty : null,
      outQty: entry.type === 'OUT' ? entry.qty : null,
      balance: runningBalance === 0 ? null : runningBalance, // displays as null ("—") when 0
      rawBalance: runningBalance,
      gapDays: gap,
      hasGapDivider,
      note: entry.note || '',
      enteredBy: entry.createdByName || 'Operator',
      createdById: entry.createdById,
      createdAt: entry.createdAt,
    });

    previousDate = entry.entryDate;
  });

  const isClosed = runningBalance === 0;
  const todayStr = getTodayDateString();

  // Days open: from openDate to today (or to closedDate if closed)
  const endDate = isClosed && challan.closedDate ? challan.closedDate : todayStr;
  const daysOpen = daysBetween(challan.openDate, endDate);

  // Days since last entry
  const lastActivityDate = activeEntries.length > 0 
    ? activeEntries[activeEntries.length - 1].entryDate 
    : challan.openDate;
  const daysSinceLastEntry = daysBetween(lastActivityDate, todayStr);

  const averageGap = gaps.length > 0 
    ? Math.round((gaps.reduce((acc, g) => acc + g, 0) / gaps.length) * 10) / 10 
    : 0;
  const longestGap = gaps.length > 0 ? Math.max(...gaps) : 0;
  const isStale = !isClosed && challan.status === 'OPEN' && daysSinceLastEntry > staleThresholdDays;

  const summary: ChallanSummary = {
    totalIn,
    totalOut,
    difference: totalIn - totalOut,
    currentBalance: runningBalance,
    isClosed,
    daysOpen,
    daysSinceLastEntry,
    averageGap,
    longestGap,
    isStale,
  };

  return { rows, summary };
}

/**
 * Validate proposed entry addition or update.
 * Ensures:
 * 1. Entry date >= challan openDate
 * 2. Entry date <= today
 * 3. OUT does not exceed current running balance
 */
export function validateEntryMovement(
  challan: Challan,
  existingEntries: Entry[],
  newEntry: {
    entryDate: string;
    type: 'IN' | 'OUT';
    qty: number;
    idToIgnore?: string; // used when editing an existing entry
  }
): { valid: boolean; errorMessage?: string; resultingBalance?: number } {
  // Check date bounds
  if (newEntry.entryDate < challan.openDate) {
    return {
      valid: false,
      errorMessage: `Entry date (${formatKarachiDate(newEntry.entryDate)}) cannot be before DC open date (${formatKarachiDate(challan.openDate)})`,
    };
  }

  const todayStr = getTodayDateString();
  if (newEntry.entryDate > todayStr) {
    return {
      valid: false,
      errorMessage: `Entry date cannot be in the future (today is ${formatKarachiDate(todayStr)})`,
    };
  }

  if (newEntry.qty <= 0) {
    return {
      valid: false,
      errorMessage: 'Quantity must be a positive number greater than 0',
    };
  }

  // Compute balance with all active entries except the one being edited
  const entriesToConsider = existingEntries.filter(
    e => !e.deletedAt && e.id !== newEntry.idToIgnore
  );

  let balance = challan.openingQty;
  for (const e of entriesToConsider) {
    if (e.type === 'IN') {
      balance += e.qty;
    } else {
      balance -= e.qty;
    }
  }

  if (newEntry.type === 'OUT') {
    if (newEntry.qty > balance) {
      return {
        valid: false,
        errorMessage: `Only ${formatNumber(balance)} available, you entered ${formatNumber(newEntry.qty)}`,
      };
    }
    balance -= newEntry.qty;
  } else {
    balance += newEntry.qty;
  }

  return {
    valid: true,
    resultingBalance: balance,
  };
}
