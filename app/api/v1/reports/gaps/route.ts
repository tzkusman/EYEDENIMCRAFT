import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { permissions } from '@/lib/permissions';
import { buildLedger } from '@/lib/ledger';

export async function GET() {
  try {
    const user = store.getCurrentUser();
    if (!permissions.canExportReports(user)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only Managers and Admins can view and export reports' } },
        { status: 403 }
      );
    }

    const challans = store.getChallans();
    const settings = store.getSettings();

    // Map all challans with gap metrics
    const gapRecords = challans.map(challan => {
      const entries = store.getEntriesByChallanId(challan.id);
      const { summary } = buildLedger(challan, entries, settings.staleDays);
      return {
        id: challan.id,
        dcNo: challan.dcNo,
        party: challan.party || '—',
        article: challan.article || '—',
        status: challan.status,
        openDate: challan.openDate,
        longestGap: summary.longestGap,
        averageGap: summary.averageGap,
        daysSinceLastEntry: summary.daysSinceLastEntry,
        daysOpen: summary.daysOpen,
        balance: summary.isClosed ? '—' : summary.currentBalance,
        isStale: summary.isStale,
      };
    });

    // Sort by longest gap descending
    const sortedByGap = [...gapRecords].sort((a, b) => b.longestGap - a.longestGap);
    const staleList = gapRecords.filter(r => r.isStale);

    return NextResponse.json({
      gapsReport: sortedByGap,
      staleReport: staleList,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: (err as Error).message } },
      { status: 500 }
    );
  }
}
