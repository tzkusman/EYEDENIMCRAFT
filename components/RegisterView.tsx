'use client';

import React from 'react';
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatNumber, formatKarachiDate, getTodayDateString } from '@/lib/ledger';
import { UserProfile } from '@/lib/types';
import { permissions } from '@/lib/permissions';
import { exportRegisterToExcel, exportRegisterToPDF } from './ExportUtils';

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
  balanceAtTime: number | null;
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

interface RegisterData {
  groups: RegisterDayGroup[];
  range: { from: string; to: string };
  summary: {
    totalIn: number;
    totalOut: number;
    net: number;
    activeDays: number;
    totalDays: number;
  };
}

interface RegisterViewProps {
  currentUser: UserProfile | null;
  onSelectDc: (dcId: string) => void;
}

export function RegisterView({ currentUser, onSelectDc }: RegisterViewProps) {
  const [rangePreset, setRangePreset] = React.useState<string>('last14');
  const [customFrom, setCustomFrom] = React.useState<string>('');
  const [customTo, setCustomTo] = React.useState<string>('');

  const [dcSearch, setDcSearch] = React.useState<string>('');
  const [partySearch, setPartySearch] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');

  const [data, setData] = React.useState<RegisterData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Compute dates based on preset
  const computeDates = React.useCallback((): { from: string; to: string } => {
    const today = getTodayDateString();
    const d = new Date(today + 'T00:00:00Z');

    if (rangePreset === 'today') {
      return { from: today, to: today };
    }

    if (rangePreset === 'yesterday') {
      d.setUTCDate(d.getUTCDate() - 1);
      const yStr = d.toISOString().slice(0, 10);
      return { from: yStr, to: yStr };
    }

    if (rangePreset === 'thisWeek') {
      // Monday to today
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diff);
      return { from: monday.toISOString().slice(0, 10), to: today };
    }

    if (rangePreset === 'thisMonth') {
      const firstDay = `${today.slice(0, 7)}-01`;
      return { from: firstDay, to: today };
    }

    if (rangePreset === 'last14') {
      const past = new Date(d);
      past.setUTCDate(past.getUTCDate() - 13);
      return { from: past.toISOString().slice(0, 10), to: today };
    }

    if (rangePreset === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }

    return { from: today, to: today };
  }, [rangePreset, customFrom, customTo]);

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const { from, to } = computeDates();
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (dcSearch) params.set('dcNo', dcSearch);
        if (partySearch) params.set('party', partySearch);
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/v1/register?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load register');
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
  }, [computeDates, dcSearch, partySearch, statusFilter]);

  const canExport = permissions.canExportReports(currentUser);

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Date-Wise Register
              </h1>
              <span className="text-xs bg-blue-100 text-[#1e3a5f] font-semibold px-2 py-0.5 rounded">
                Digital Diary
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Every garment movement recorded date-wise across all DCs. Empty dates reveal production delays.
            </p>
          </div>

          {/* Export buttons (Manager and Admin only) */}
          <div className="flex items-center gap-2">
            {canExport ? (
              <>
                <button
                  onClick={() => data && exportRegisterToExcel(data.groups, `${data.range.from}_to_${data.range.to}`)}
                  disabled={!data || data.groups.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => data && exportRegisterToPDF(data.groups, `${data.range.from}_to_${data.range.to}`)}
                  disabled={!data || data.groups.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Export PDF</span>
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Export reserved for Managers & Admins</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Date presets */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'thisWeek', label: 'This Week' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'last14', label: 'Last 14 Days' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setRangePreset(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  rangePreset === p.id
                    ? 'bg-[#1e3a5f] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search filters */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <div className="relative flex-1 md:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search DC No..."
                value={dcSearch}
                onChange={e => setDcSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-[#1e3a5f] focus:outline-hidden uppercase font-mono"
              />
            </div>

            <div className="relative flex-1 md:w-44">
              <input
                type="text"
                placeholder="Filter party / line..."
                value={partySearch}
                onChange={e => setPartySearch(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-[#1e3a5f] focus:outline-hidden"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-hidden text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="CLOSED">Closed Only</option>
            </select>
          </div>

        </div>

        {/* Custom Range Picker */}
        {rangePreset === 'custom' && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">To:</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>
        )}

      </div>

      {/* Date groups listing */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-slate-200 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-xl border border-red-200 text-red-600 text-xs">
          {error}
        </div>
      ) : data?.groups.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
          No records found for the selected period.
        </div>
      ) : (
        <div className="space-y-6">
          {data?.groups.map(group => {
            const isToday = group.date === getTodayDateString();
            return (
              <div
                key={group.date}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                
                {/* Date Header */}
                <div className={`px-5 py-3 border-b flex items-center justify-between ${
                  isToday ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#1e3a5f]" />
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {formatKarachiDate(group.date)}
                    </span>
                    {isToday && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 text-[#1e3a5f] rounded">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    {group.entries.length} movement{group.entries.length === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Date Table */}
                {!group.hasActivity ? (
                  /* Muted empty row showing production gap */
                  <div className="py-6 px-5 text-center bg-slate-50/30">
                    <p className="text-xs text-slate-400 font-medium italic">
                      — No production movements recorded on this date (Floor Dormant) —
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/40 text-slate-500 font-medium">
                          <th className="py-2.5 px-4">DC No</th>
                          <th className="py-2.5 px-4">Party / Line</th>
                          <th className="py-2.5 px-4">Article</th>
                          <th className="py-2.5 px-4 text-right bg-emerald-50/40 text-emerald-800">In (pcs)</th>
                          <th className="py-2.5 px-4 text-right bg-rose-50/40 text-rose-800">Out (pcs)</th>
                          <th className="py-2.5 px-4 text-right font-bold text-slate-900">Balance</th>
                          <th className="py-2.5 px-4 text-center">Gap</th>
                          <th className="py-2.5 px-4">Note</th>
                          <th className="py-2.5 px-4 text-right">Entered By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.entries.map(e => (
                          <tr
                            key={e.id}
                            onClick={() => onSelectDc(e.challanId)}
                            className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                          >
                            <td className="py-2.5 px-4 font-mono font-bold text-[#1e3a5f] group-hover:underline">
                              {e.dcNo}
                            </td>
                            <td className="py-2.5 px-4 text-slate-800 font-medium">
                              {e.party}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {e.article}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono bg-emerald-50/20 text-emerald-700 font-semibold">
                              {e.inQty !== null ? formatNumber(e.inQty) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono bg-rose-50/20 text-rose-700 font-semibold">
                              {e.outQty !== null ? formatNumber(e.outQty) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                              {e.balanceAtTime !== null ? formatNumber(e.balanceAtTime) : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                              {e.gapDays > 1 ? (
                                <span className="text-amber-700 font-bold">{e.gapDays}d</span>
                              ) : (
                                `${e.gapDays}d`
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                              {e.note || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-500">
                              {e.enteredBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Day Footer with Daily Totals and Net */}
                {group.hasActivity && (
                  <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Day Total:</span>
                    <div className="flex items-center gap-6 font-mono font-bold">
                      <span className="text-emerald-700">
                        Total In: {formatNumber(group.totalIn)}
                      </span>
                      <span className="text-rose-700">
                        Total Out: {formatNumber(group.totalOut)}
                      </span>
                      <span className="text-[#1e3a5f]">
                        Net: {group.net >= 0 ? '+' : ''}{formatNumber(group.net)}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
