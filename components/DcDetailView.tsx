'use client';

import React from 'react';
import {
  ArrowLeft,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Plus,
  TrendingDown,
  Clock,
  Ban,
  Save,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Challan, LedgerRow, ChallanSummary, UserProfile } from '@/lib/types';
import { permissions } from '@/lib/permissions';
import { formatNumber, formatKarachiDate, getTodayDateString } from '@/lib/ledger';

interface DcDetailViewProps {
  dcId: string;
  currentUser: UserProfile | null;
  onBack: () => void;
  onRefresh: () => void;
}

export function DcDetailView({
  dcId,
  currentUser,
  onBack,
  onRefresh,
}: DcDetailViewProps) {
  const [data, setData] = React.useState<{
    challan: Challan;
    rows: LedgerRow[];
    summary: ChallanSummary;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Quick entry bar inputs
  const [entryDate, setEntryDate] = React.useState(getTodayDateString());
  const [inInput, setInInput] = React.useState('');
  const [outInput, setOutInput] = React.useState('');
  const [noteInput, setNoteInput] = React.useState('');
  const [isSavingEntry, setIsSavingEntry] = React.useState(false);
  const [entryError, setEntryError] = React.useState<string | null>(null);

  // Focus ref for the IN input
  const inInputRef = React.useRef<HTMLInputElement>(null);

  // Modal states: Edit Opening Qty, Edit Entry, Delete Entry, Void DC
  const [editOpeningModalOpen, setEditOpeningModalOpen] = React.useState(false);
  const [newOpeningQty, setNewOpeningQty] = React.useState('');
  const [openingReason, setOpeningReason] = React.useState('');

  const [editEntryModalOpen, setEditEntryModalOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<LedgerRow | null>(null);
  const [editEntryQty, setEditEntryQty] = React.useState('');
  const [editEntryType, setEditEntryType] = React.useState<'IN' | 'OUT'>('OUT');
  const [editEntryDate, setEditEntryDate] = React.useState('');
  const [editEntryNote, setEditEntryNote] = React.useState('');
  const [editEntryReason, setEditEntryReason] = React.useState('');

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletingRow, setDeletingRow] = React.useState<LedgerRow | null>(null);
  const [deleteReason, setDeleteReason] = React.useState('');

  const [voidModalOpen, setVoidModalOpen] = React.useState(false);
  const [voidReason, setVoidReason] = React.useState('');

  const refreshData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/challans/${dcId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    }
  }, [dcId]);

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/v1/challans/${dcId}`);
        if (!res.ok) throw new Error('Failed to load DC details');
        const json = await res.json();
        if (isSubscribed) {
          setData(json);
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
  }, [dcId]);

  // Handle Quick Entry submission
  async function handleQuickEntrySubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!data) return;
    setEntryError(null);

    const isOut = Boolean(outInput && parseInt(outInput, 10) > 0);
    const isIn = Boolean(inInput && parseInt(inInput, 10) > 0);

    if (!isIn && !isOut) {
      setEntryError('Please enter either an IN or an OUT quantity.');
      return;
    }

    const type: 'IN' | 'OUT' = isIn ? 'IN' : 'OUT';
    const qty = parseInt(isIn ? inInput : outInput, 10);

    setIsSavingEntry(true);
    try {
      const res = await fetch(`/api/v1/challans/${dcId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate,
          type,
          qty,
          note: noteInput.trim() || undefined,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setEntryError(resJson.error?.message || 'Failed to record entry');
        setIsSavingEntry(false);
        return;
      }

      // Reset entry inputs
      setInInput('');
      setOutInput('');
      setNoteInput('');
      setData({
        challan: resJson.challan,
        rows: resJson.rows,
        summary: resJson.summary,
      });

      // Refocus IN box
      setTimeout(() => {
        inInputRef.current?.focus();
      }, 50);
    } catch (err) {
      setEntryError((err as Error).message);
    } finally {
      setIsSavingEntry(false);
    }
  }

  // Handle key down for fast typing: Enter submits
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickEntrySubmit();
    }
  }

  // Handle Edit Opening Qty
  async function handleSaveOpeningQty(e: React.FormEvent) {
    e.preventDefault();
    if (!openingReason.trim()) return;
    const qty = parseInt(newOpeningQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    try {
      const res = await fetch(`/api/v1/challans/${dcId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingQty: qty,
          reason: openingReason.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to update opening quantity');
        return;
      }
      setEditOpeningModalOpen(false);
      refreshData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // Handle Void DC
  async function handleVoidDc(e: React.FormEvent) {
    e.preventDefault();
    if (!voidReason.trim()) return;

    try {
      const res = await fetch(`/api/v1/challans/${dcId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to void DC');
        return;
      }
      setVoidModalOpen(false);
      refreshData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // Handle Edit Entry
  async function handleSaveEditEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRow?.id || !editEntryReason.trim()) return;
    const qty = parseInt(editEntryQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    try {
      const res = await fetch(`/api/v1/entries/${editingRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryDate: editEntryDate,
          type: editEntryType,
          qty,
          note: editEntryNote.trim() || undefined,
          reason: editEntryReason.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to update entry');
        return;
      }
      setEditEntryModalOpen(false);
      refreshData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // Handle Delete Entry
  async function handleConfirmDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deletingRow?.id || !deleteReason.trim()) return;

    try {
      const res = await fetch(`/api/v1/entries/${deletingRow.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to delete entry');
        return;
      }
      setDeleteModalOpen(false);
      refreshData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-80 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-red-200">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">{error || 'DC not found'}</p>
        <button
          onClick={onBack}
          className="mt-3 px-4 py-1.5 text-xs font-semibold bg-[#1e3a5f] text-white rounded-md"
        >
          Back to List
        </button>
      </div>
    );
  }

  const { challan, rows, summary } = data;
  const isClosed = summary.isClosed;
  const isVoid = challan.status === 'VOID';

  // Chart data: running raw balance over time
  const balanceChartData = rows.map((r, idx) => ({
    step: `#${r.rowNumber} (${r.date.slice(5)})`,
    Balance: r.rawBalance,
  }));

  return (
    <div className="space-y-6">
      
      {/* Back button & Title header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Register</span>
        </button>

        {/* Admin and Manager Actions */}
        <div className="flex items-center gap-2">
          {permissions.canEditOpeningQty(currentUser) && !isVoid && (
            <button
              onClick={() => {
                setNewOpeningQty(String(challan.openingQty));
                setOpeningReason('');
                setEditOpeningModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs"
            >
              Edit Opening Qty
            </button>
          )}

          {permissions.canVoidDC(currentUser) && !isVoid && (
            <button
              onClick={() => {
                setVoidReason('');
                setVoidModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg shadow-2xs"
            >
              Void DC
            </button>
          )}
        </div>
      </div>

      {/* Diary Ledger Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-mono tracking-tight text-[#1e3a5f]">
                {challan.dcNo}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <Lock className="w-3 h-3 text-slate-400" />
                IMMUTABLE
              </span>

              {/* Status Badge */}
              {isVoid ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-slate-200 text-slate-800 rounded border border-slate-300">
                  VOIDED
                </span>
              ) : isClosed ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  CLOSED in {summary.daysOpen} days
                </span>
              ) : summary.isStale ? (
                <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-800 rounded border border-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  STALE ({summary.daysSinceLastEntry}d inactive)
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-[#1e3a5f] rounded border border-blue-200">
                  OPEN
                </span>
              )}
            </div>

            <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-y-1 gap-x-4">
              <span>Opened: <strong className="font-mono text-slate-800">{formatKarachiDate(challan.openDate)}</strong></span>
              {challan.party && <span>Line / Party: <strong className="text-slate-800">{challan.party}</strong></span>}
              {challan.article && <span>Article: <strong className="text-slate-800">{challan.article}</strong></span>}
              {challan.remarks && <span className="italic text-slate-500">&ldquo;{challan.remarks}&rdquo;</span>}
            </div>
          </div>

          {/* Current Running Balance Callout */}
          <div className="text-left md:text-right bg-slate-50 p-4 rounded-xl border border-slate-200/80 min-w-[200px]">
            <span className="text-xs font-semibold text-slate-500 block">Current Balance</span>
            <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 block mt-0.5">
              {isClosed ? '—' : formatNumber(summary.currentBalance)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isClosed ? 'Challan fully completed' : 'pieces remaining in circulation'}
            </span>
          </div>

        </div>

        {/* Void Reason Banner */}
        {isVoid && challan.voidReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-600 shrink-0" />
            <span><strong>Voided by Admin:</strong> {challan.voidReason}</span>
          </div>
        )}

      </div>

      {/* Summary Metrics & Balance Trend Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Metric Cards Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ledger Metrics</h3>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Total In (Opening + IN)</span>
              <span className="text-base font-bold font-mono text-emerald-700 block mt-0.5">
                {formatNumber(summary.totalIn)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Total Out (Deductions)</span>
              <span className="text-base font-bold font-mono text-rose-700 block mt-0.5">
                {formatNumber(summary.totalOut)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Net Difference</span>
              <span className="text-base font-bold font-mono text-[#1e3a5f] block mt-0.5">
                {formatNumber(summary.difference)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Days Active</span>
              <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
                {summary.daysOpen} days
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Average Gap</span>
              <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
                {summary.averageGap} days
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Longest Gap</span>
              <span className={`text-base font-bold font-mono block mt-0.5 ${
                summary.longestGap > 3 ? 'text-amber-700' : 'text-slate-800'
              }`}>
                {summary.longestGap} days
              </span>
            </div>
          </div>
        </div>

        {/* Balance Over Time Line Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Balance Trajectory</h3>
              <p className="text-xs text-slate-500">Piece balance movement from opening towards zero</p>
            </div>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="step" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Balance"
                  stroke="#1e3a5f"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#1e3a5f' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Diary Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">DC Diary Ledger</h2>
            <p className="text-xs text-slate-500">
              Sequential movement register. Opening balance is row #1. No formulas shown.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {rows.length} row{rows.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-800 font-bold">In</th>
                <th className="py-3 px-4 text-right bg-rose-50/50 text-rose-800 font-bold">Out</th>
                <th className="py-3 px-4 text-right font-extrabold text-slate-900">Balance</th>
                <th className="py-3 px-4 text-center">Gap</th>
                <th className="py-3 px-4">Note / Description</th>
                <th className="py-3 px-4 text-right">Entered By</th>
                <th className="py-3 px-4 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const canEdit = !row.isOpening && permissions.canEditEntry(currentUser, row as unknown as any);
                const canDelete = !row.isOpening && permissions.canDeleteEntry(currentUser, row as unknown as any);

                return (
                  <React.Fragment key={row.rowNumber}>
                    {/* Gap Divider if gap > 1 day */}
                    {row.hasGapDivider && (
                      <tr className="bg-amber-50/60 border-y border-amber-200/50">
                        <td colSpan={9} className="py-1.5 px-4 text-center text-[11px] font-semibold text-amber-800">
                          ⏱ {row.gapDays} days gap between production movements
                        </td>
                      </tr>
                    )}

                    <tr className={`hover:bg-blue-50/20 transition-colors ${
                      row.isOpening ? 'bg-slate-50/40 font-medium' : ''
                    }`}>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {row.rowNumber}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {formatKarachiDate(row.date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono bg-emerald-50/20 text-emerald-700 font-bold">
                        {row.inQty !== null ? formatNumber(row.inQty) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono bg-rose-50/20 text-rose-700 font-bold">
                        {row.outQty !== null ? formatNumber(row.outQty) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 text-sm">
                        {row.balance !== null ? formatNumber(row.balance) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {row.isOpening ? '—' : `${row.gapDays}d`}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm truncate">
                        {row.note || '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {row.enteredBy}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!row.isOpening && (canEdit || canDelete) && !isVoid ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingRow(row);
                                  setEditEntryQty(String(row.inQty || row.outQty || ''));
                                  setEditEntryType(row.inQty !== null ? 'IN' : 'OUT');
                                  setEditEntryDate(row.date);
                                  setEditEntryNote(row.note || '');
                                  setEditEntryReason('');
                                  setEditEntryModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-[#1e3a5f] rounded hover:bg-slate-100"
                                title="Edit entry (reason required)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  setDeletingRow(row);
                                  setDeleteReason('');
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100"
                                title="Delete entry (reason required)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Entry Bar (The traditional diary entry row) */}
        {!isVoid && !isClosed && (
          <div className="bg-slate-50 p-4 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Quick Entry Bar (Type IN or OUT & Press Enter):</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Filling one box disables the other. Auto-calculates running balance.
              </span>
            </div>

            {entryError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{entryError}</span>
              </div>
            )}

            <form
              onSubmit={handleQuickEntrySubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              {/* Date */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#1e3a5f] focus:outline-hidden bg-white"
                />
              </div>

              {/* IN Box (Quantity added) */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                  IN (Pieces)
                </label>
                <input
                  ref={inInputRef}
                  type="number"
                  min="1"
                  step="1"
                  disabled={Boolean(outInput && outInput.length > 0)}
                  placeholder={outInput ? 'Disabled' : '0'}
                  value={inInput}
                  onChange={e => {
                    setInInput(e.target.value);
                    if (e.target.value) setOutInput('');
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2.5 py-2 text-xs border border-emerald-300 rounded-md font-mono tabular-nums focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* OUT Box (Quantity sent) */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                  OUT (Pieces)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  disabled={Boolean(inInput && inInput.length > 0)}
                  placeholder={inInput ? 'Disabled' : '0'}
                  value={outInput}
                  onChange={e => {
                    setOutInput(e.target.value);
                    if (e.target.value) setInInput('');
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2.5 py-2 text-xs border border-rose-300 rounded-md font-mono tabular-nums focus:ring-2 focus:ring-rose-500 focus:outline-hidden bg-white disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* Note */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Note / Section
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched to wash drum / line"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-[#1e3a5f] focus:outline-hidden bg-white"
                />
              </div>

              {/* Save Button */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSavingEntry || (!inInput && !outInput)}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-md transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingEntry ? 'Saving...' : 'Save Row'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Edit Opening Qty Modal */}
      {editOpeningModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Correct Opening Quantity</h3>
            <p className="text-xs text-slate-500 mt-1">
              Managers and Admins only. Will recalculate the entire ledger running balance.
            </p>
            <form onSubmit={handleSaveOpeningQty} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Opening Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newOpeningQty}
                  onChange={e => setNewOpeningQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment (Required for audit log) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Physical recount corrected from cutting room invoice"
                  value={openingReason}
                  onChange={e => setOpeningReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpeningModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] rounded-md"
                >
                  Save Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editEntryModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Edit Ledger Movement #{editingRow.rowNumber}</h3>
            <form onSubmit={handleSaveEditEntry} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={editEntryType}
                    onChange={e => setEditEntryType(e.target.value as 'IN' | 'OUT')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="IN">IN (Received)</option>
                    <option value="OUT">OUT (Sent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editEntryQty}
                    onChange={e => setEditEntryQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editEntryDate}
                  onChange={e => setEditEntryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
                <input
                  type="text"
                  value={editEntryNote}
                  onChange={e => setEditEntryNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Edit (Required) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Corrected slip slip-reading typo"
                  value={editEntryReason}
                  onChange={e => setEditEntryReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditEntryModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] rounded-md"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Entry Modal */}
      {deleteModalOpen && deletingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-red-900">Delete Ledger Entry #{deletingRow.rowNumber}</h3>
            <p className="text-xs text-slate-600 mt-1">
              Are you sure? This will soft-delete the row and recalculate the balance. A reason is required.
            </p>
            <form onSubmit={handleConfirmDelete} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Deletion (Required) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Duplicate entry by mistake"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void DC Modal */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-red-900">Void DC {challan.dcNo}</h3>
            <p className="text-xs text-slate-600 mt-1">
              Admin only: This will mark the DC as VOID. The DC No cannot be reused, and the action will be recorded in the audit log.
            </p>
            <form onSubmit={handleVoidDc} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Voiding *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Slip issued with erroneous party number and cancelled on floor"
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md"
                >
                  Void DC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
