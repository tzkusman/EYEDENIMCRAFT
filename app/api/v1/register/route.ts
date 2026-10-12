import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';
import { buildLedger, getTodayDateString } from '@/lib/ledger';

interface RegisterDayEntry {
  id: string;
  challanId: string;
  dcNo: string;
  party: string;
  article: string;
  date: string;
  type: 'IN' | 'OUT';
  inQty: number | null;
  outQty: number | null;
  balanceAtTime: number | null; // calculated balance of this DC after this row
  gapDays: number;
  note: string;
  enteredBy: string;
  createdById: string;
}

interface RegisterDayGroup {
  date: string;
  entries: RegisterDayEntry[];
  totalIn: number;
  totalOut: number;
  net: number;
  hasActivity: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canViewAllDCs(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const dcNoQuery = searchParams.get('dcNo')?.trim().toUpperCase() || '';
    const partyQuery = searchParams.get('party')?.trim().toLowerCase() || '';
    const userIdQuery = searchParams.get('userId') || '';
    const statusQuery = searchParams.get('status') || '';

    const todayStr = getTodayDateString();
    // Default to last 14 days if not specified
    let toDate = toParam || todayStr;
    let fromDate = fromParam;
    if (!fromDate) {
      const d = new Date(toDate);
      d.setDate(d.getDate() - 13);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      fromDate = `${yyyy}-${mm}-${dd}`;
    }

    const challans = store.getChallans();
    const settings = store.getSettings();

    // Map each entry to its running balance in its respective DC
    const allEnrichedEntries: RegisterDayEntry[] = [];

    challans.forEach(challan => {
      // Apply status filter if present
      if (statusQuery && challan.status !== statusQuery) return;
      if (dcNoQuery && !challan.dcNo.includes(dcNoQuery)) return;
      if (partyQuery && (!challan.party || !challan.party.toLowerCase().includes(partyQuery))) return;

      const entries = store.getEntriesByChallanId(challan.id);
      const { rows } = buildLedger(challan, entries, settings.staleDays);

      rows.forEach(row => {
        // Exclude the opening balance row from day movements unless requested,
        // but ledger rows contain all entries
        if (row.isOpening) return; // day register tracks daily operational movements
        if (userIdQuery && row.createdById !== userIdQuery) return;

        allEnrichedEntries.push({
          id: row.id || `row-${row.rowNumber}`,
          challanId: challan.id,
          dcNo: challan.dcNo,
          party: challan.party || '—',
          article: challan.article || '—',
          date: row.date,
          type: row.inQty !== null ? 'IN' : 'OUT',
          inQty: row.inQty,
          outQty: row.outQty,
          balanceAtTime: row.balance,
          gapDays: row.gapDays,
          note: row.note || '',
          enteredBy: row.enteredBy,
          createdById: row.createdById,
        });
      });
    });

    // Generate list of dates in the range [fromDate, toDate] inclusive (newest first)
    const dateList: string[] = [];
    const cur = new Date(toDate + 'T00:00:00Z');
    const start = new Date(fromDate + 'T00:00:00Z');

    while (cur >= start) {
      const yyyy = cur.getUTCFullYear();
      const mm = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(cur.getUTCDate()).padStart(2, '0');
      dateList.push(`${yyyy}-${mm}-${dd}`);
      cur.setUTCDate(cur.getUTCDate() - 1);
    }

    // Group entries by date
    const groups: RegisterDayGroup[] = dateList.map(date => {
      const dayEntries = allEnrichedEntries.filter(e => e.date === date);
      let dayIn = 0;
      let dayOut = 0;

      dayEntries.forEach(e => {
        if (e.inQty) dayIn += e.inQty;
        if (e.outQty) dayOut += e.outQty;
      });

      return {
        date,
        entries: dayEntries,
        totalIn: dayIn,
        totalOut: dayOut,
        net: dayIn - dayOut,
        hasActivity: dayEntries.length > 0,
      };
    });

    // Overall summary for the queried range
    const totalIn = groups.reduce((acc, g) => acc + g.totalIn, 0);
    const totalOut = groups.reduce((acc, g) => acc + g.totalOut, 0);

    return NextResponse.json({
      groups,
      range: { from: fromDate, to: toDate },
      summary: {
        totalIn,
        totalOut,
        net: totalIn - totalOut,
        activeDays: groups.filter(g => g.hasActivity).length,
        totalDays: groups.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
