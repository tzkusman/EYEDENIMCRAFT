import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatKarachiDate, formatNumber } from '@/lib/ledger';

export function exportRegisterToExcel(
  groups: Array<{
    date: string;
    entries: Array<{
      dcNo: string;
      party: string;
      article: string;
      inQty: number | null;
      outQty: number | null;
      balanceAtTime: number | null;
      gapDays: number;
      note: string;
      enteredBy: string;
    }>;
    totalIn: number;
    totalOut: number;
    net: number;
    hasActivity: boolean;
  }>,
  rangeStr: string
) {
  const rows: Array<Record<string, unknown>> = [];

  groups.forEach(group => {
    if (!group.hasActivity) {
      rows.push({
        'Date': formatKarachiDate(group.date),
        'DC No': '—',
        'Party': 'No Activity (Production Gap)',
        'Article': '',
        'IN (pcs)': '',
        'OUT (pcs)': '',
        'Balance': '',
        'Gap (Days)': '',
        'Note': '',
        'Entered By': '',
      });
      return;
    }

    group.entries.forEach(entry => {
      rows.push({
        'Date': formatKarachiDate(group.date),
        'DC No': entry.dcNo,
        'Party': entry.party,
        'Article': entry.article,
        'IN (pcs)': entry.inQty !== null ? entry.inQty : '',
        'OUT (pcs)': entry.outQty !== null ? entry.outQty : '',
        'Balance': entry.balanceAtTime !== null ? entry.balanceAtTime : '—',
        'Gap (Days)': entry.gapDays,
        'Note': entry.note,
        'Entered By': entry.enteredBy,
      });
    });

    // Subtotal row for day
    rows.push({
      'Date': `${formatKarachiDate(group.date)} Subtotal`,
      'DC No': '',
      'Party': '',
      'Article': '',
      'IN (pcs)': group.totalIn,
      'OUT (pcs)': group.totalOut,
      'Balance': `Net: ${group.net >= 0 ? '+' : ''}${group.net}`,
      'Gap (Days)': '',
      'Note': '',
      'Entered By': '',
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Production Register');
  XLSX.writeFile(wb, `DenimCrafts_EYE_Register_${rangeStr}.xlsx`);
}

export function exportRegisterToPDF(
  groups: Array<{
    date: string;
    entries: Array<{
      dcNo: string;
      party: string;
      article: string;
      inQty: number | null;
      outQty: number | null;
      balanceAtTime: number | null;
      gapDays: number;
      note: string;
      enteredBy: string;
    }>;
    totalIn: number;
    totalOut: number;
    net: number;
    hasActivity: boolean;
  }>,
  rangeStr: string
) {
  const doc = new jsPDF('landscape');

  // Header branding
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 95); // Denim blue
  doc.text('DENIM CRAFTS (KARACHI) — EYE PRODUCTION MONITOR', 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date-Wise Production Register | Period: ${rangeStr} | Exported: ${new Date().toLocaleString()}`, 14, 22);

  const tableBody: Array<string[]> = [];

  groups.forEach(group => {
    if (!group.hasActivity) {
      tableBody.push([
        formatKarachiDate(group.date),
        '—',
        'No production activity on this date',
        '—',
        '—',
        '—',
        '—',
        '—',
      ]);
      return;
    }

    group.entries.forEach(e => {
      tableBody.push([
        formatKarachiDate(group.date),
        e.dcNo,
        e.party,
        e.inQty !== null ? formatNumber(e.inQty) : '—',
        e.outQty !== null ? formatNumber(e.outQty) : '—',
        e.balanceAtTime !== null ? formatNumber(e.balanceAtTime) : '—',
        e.note || '—',
        e.enteredBy,
      ]);
    });

    // Day total row
    tableBody.push([
      `${formatKarachiDate(group.date)} TOTAL`,
      '',
      `Net: ${group.net >= 0 ? '+' : ''}${formatNumber(group.net)}`,
      formatNumber(group.totalIn),
      formatNumber(group.totalOut),
      '',
      '',
      '',
    ]);
  });

  autoTable(doc, {
    startY: 28,
    head: [['Date', 'DC No', 'Party / Line', 'In', 'Out', 'Balance', 'Note', 'Operator']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`DenimCrafts_EYE_Register_${rangeStr}.pdf`);
}

export function exportSummaryToExcel(report: Array<Record<string, unknown>>) {
  const ws = XLSX.utils.json_to_sheet(report);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DC Summary');
  XLSX.writeFile(wb, 'DenimCrafts_EYE_Summary_Report.xlsx');
}

export function exportSummaryToPDF(report: Array<{
  dcNo: string;
  openDate: string;
  party: string;
  article: string;
  totalIn: number;
  totalOut: number;
  balance: string | number;
  status: string;
  daysOpen: number;
}>) {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 95);
  doc.text('DENIM CRAFTS (KARACHI) — DC SUMMARY REPORT', 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()} | Timezone: Asia/Karachi`, 14, 22);

  const tableBody = report.map(r => [
    r.dcNo,
    formatKarachiDate(r.openDate),
    r.party,
    r.article,
    formatNumber(r.totalIn),
    formatNumber(r.totalOut),
    typeof r.balance === 'number' ? formatNumber(r.balance) : String(r.balance),
    r.status,
    `${r.daysOpen} days`,
  ]);

  autoTable(doc, {
    startY: 28,
    head: [['DC No', 'Open Date', 'Party / Line', 'Article', 'Total In', 'Total Out', 'Balance', 'Status', 'Days Open']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255] },
  });

  doc.save('DenimCrafts_EYE_Summary_Report.pdf');
}

export function exportChallansToExcel(challans: Array<any>) {
  const rows = challans.map(c => ({
    'DC No': c.dcNo,
    'Date': formatKarachiDate(c.openDate),
    'Party': c.party || '',
    'Article': c.article || '',
    'Opening Qty (pcs)': c.openingQty,
    'Total IN (pcs)': c.summary.totalIn,
    'Total OUT (pcs)': c.summary.totalOut,
    'Remaining Balance (pcs)': c.status === 'CLOSED' ? 0 : c.summary.currentBalance,
    'Status': c.status,
    'Days Since Last Move': c.summary.daysSinceLastEntry,
    'Remarks': c.remarks || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Active DCs Register');
  XLSX.writeFile(wb, `DenimCrafts_Active_DCs_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportChallansToPDF(challans: Array<any>) {
  const doc = new jsPDF('landscape');
  doc.setFontSize(15);
  doc.setTextColor(30, 58, 95);
  doc.text('DENIM CRAFTS (KARACHI) — ACTIVE DC REGISTER', 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported: ${new Date().toLocaleString()} | Operating Timezone: Asia/Karachi`, 14, 21);

  const tableBody = challans.map(c => [
    c.dcNo,
    formatKarachiDate(c.openDate),
    c.party || '—',
    c.article || '—',
    formatNumber(c.openingQty),
    c.summary.totalIn > 0 ? `+${formatNumber(c.summary.totalIn)}` : '0',
    c.summary.totalOut > 0 ? `-${formatNumber(c.summary.totalOut)}` : '0',
    c.status === 'CLOSED' ? '—' : formatNumber(c.summary.currentBalance),
    c.status,
    `${c.summary.daysSinceLastEntry}d`,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [['DC No', 'Date', 'Party', 'Article', 'Opening', 'Total IN', 'Total OUT', 'Balance', 'Status', 'Activity']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`DenimCrafts_Active_DCs_${new Date().toISOString().slice(0, 10)}.pdf`);
}

