import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { buildLedger, getTodayDateString } from '@/lib/ledger';

export async function GET() {
  try {
    const challans = store.getChallans();
    const settings = store.getSettings();
    const todayStr = getTodayDateString();

    let openCount = 0;
    let closedCount = 0;
    let totalPendingQty = 0;
    let staleCount = 0;
    let todayIn = 0;
    let todayOut = 0;

    const openDcsList: Array<{
      id: string;
      dcNo: string;
      openDate: string;
      party?: string;
      article?: string;
      totalIn: number;
      totalOut: number;
      balance: number;
      lastEntryDate: string;
      daysSinceLastEntry: number;
      isStale: boolean;
    }> = [];

    // Map each challan
    challans.forEach(challan => {
      if (challan.status === 'VOID') return;

      const entries = store.getEntriesByChallanId(challan.id);
      const { summary } = buildLedger(challan, entries, settings.staleDays);

      if (challan.status === 'OPEN') {
        openCount++;
        totalPendingQty += summary.currentBalance;
        if (summary.isStale) staleCount++;

        const lastDate = entries.length > 0 
          ? entries[entries.length - 1].entryDate 
          : challan.openDate;

        openDcsList.push({
          id: challan.id,
          dcNo: challan.dcNo,
          openDate: challan.openDate,
          party: challan.party,
          article: challan.article,
          totalIn: summary.totalIn,
          totalOut: summary.totalOut,
          balance: summary.currentBalance,
          lastEntryDate: lastDate,
          daysSinceLastEntry: summary.daysSinceLastEntry,
          isStale: summary.isStale,
        });
      } else if (challan.status === 'CLOSED') {
        closedCount++;
      }

      // Check today's entries
      entries.forEach(e => {
        if (e.entryDate === todayStr) {
          if (e.type === 'IN') todayIn += e.qty;
          if (e.type === 'OUT') todayOut += e.qty;
        }
      });
    });

    // 30-day IN vs OUT trend
    const trendDays: Array<{ date: string; inQty: number; outQty: number }> = [];
    const dateCur = new Date(todayStr + 'T00:00:00Z');
    const allEntries = store.getEntries();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(dateCur);
      d.setUTCDate(d.getUTCDate() - i);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      let dayIn = 0;
      let dayOut = 0;

      allEntries.forEach(e => {
        if (!e.deletedAt && e.entryDate === dateKey) {
          if (e.type === 'IN') dayIn += e.qty;
          if (e.type === 'OUT') dayOut += e.qty;
        }
      });

      trendDays.push({
        date: dateKey,
        inQty: dayIn,
        outQty: dayOut,
      });
    }

    return NextResponse.json({
      kpis: {
        openDcs: openCount,
        closedDcs: closedCount,
        totalPendingQty,
        staleDcs: staleCount,
        todayIn,
        todayOut,
      },
      openDcs: openDcsList,
      trend30Days: trendDays,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
