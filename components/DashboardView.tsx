'use client';

import React from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  ExternalLink,
  Plus,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { formatNumber, formatKarachiDate } from '@/lib/ledger';

interface DashboardData {
  kpis: {
    openDcs: number;
    closedDcs: number;
    totalPendingQty: number;
    staleDcs: number;
    todayIn: number;
    todayOut: number;
  };
  openDcs: Array<{
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
  }>;
  trend30Days: Array<{
    date: string;
    inQty: number;
    outQty: number;
  }>;
}

interface DashboardViewProps {
  onSelectDc: (dcId: string) => void;
  onOpenNewDcModal: () => void;
}

export function DashboardView({ onSelectDc, onOpenNewDcModal }: DashboardViewProps) {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [guideOpen, setGuideOpen] = React.useState(true);

  const refreshDashboard = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const res = await fetch('/api/v1/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard data');
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
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-xl" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-red-200">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">{error || 'Unable to load dashboard'}</p>
        <button
          onClick={refreshDashboard}
          className="mt-3 px-4 py-1.5 text-xs font-semibold bg-[#1e3a5f] text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  const chartData = data.trend30Days.map(d => ({
    displayDate: d.date.slice(5), // MM-DD
    IN: d.inQty,
    OUT: d.outQty,
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Production Floor Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time DC ledger monitoring across Karachi stitching lines & wash lots
          </p>
        </div>
        <button
          onClick={onOpenNewDcModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Open New DC</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* 1. Open DCs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open DCs</span>
            <Layers className="w-4 h-4 text-[#1e3a5f]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {data.kpis.openDcs}
            </span>
            <span className="text-[11px] text-slate-400">in floor circulation</span>
          </div>
        </div>

        {/* 2. Total Pending Quantity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Quantity</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {formatNumber(data.kpis.totalPendingQty)}
            </span>
            <span className="text-[11px] text-slate-500">pcs</span>
          </div>
        </div>

        {/* 3. Stale DCs Alert */}
        <div className={`p-4 rounded-xl border shadow-2xs ${
          data.kpis.staleDcs > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${data.kpis.staleDcs > 0 ? 'text-red-700' : 'text-slate-500'}`}>
              Stale DCs
            </span>
            <AlertTriangle className={`w-4 h-4 ${data.kpis.staleDcs > 0 ? 'text-red-600' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${
              data.kpis.staleDcs > 0 ? 'text-red-700' : 'text-slate-900'
            }`}>
              {data.kpis.staleDcs}
            </span>
            <span className={`text-[11px] ${data.kpis.staleDcs > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
              {data.kpis.staleDcs > 0 ? '> 5 days dormant' : 'None delayed'}
            </span>
          </div>
        </div>

        {/* 4. Closed DCs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Closed DCs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
              {data.kpis.closedDcs}
            </span>
            <span className="text-[11px] text-slate-400">cleared (balance 0)</span>
          </div>
        </div>

        {/* 5. Today's Movements */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today&apos;s Moves</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="text-emerald-700 flex items-center gap-0.5 font-bold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {formatNumber(data.kpis.todayIn)}
            </span>
            <span className="text-rose-700 flex items-center gap-0.5 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {formatNumber(data.kpis.todayOut)}
            </span>
          </div>
        </div>

      </div>

      {/* How EYE Works: Step-by-Step Diary Guide */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1e3a5f] text-white rounded-xl p-5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setGuideOpen(!guideOpen)}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-200 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                How EYE Works: Adding Real Production Data One by One
              </h2>
              <p className="text-xs text-blue-200">
                Digital diary replacing manual notebook tracking for Denim Crafts
              </p>
            </div>
          </div>
          <button className="text-blue-200 hover:text-white p-1 rounded transition-colors">
            {guideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {guideOpen && (
          <div className="mt-4 pt-4 border-t border-blue-400/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white/10 rounded-lg p-3 space-y-1 backdrop-blur-xs">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-blue-400/30 text-blue-100 px-1.5 py-0.5 rounded">
                Step 1 · Open DC
              </span>
              <p className="font-semibold text-white">Enter Physical DC No</p>
              <p className="text-blue-100/80 leading-relaxed text-[11px]">
                Click <strong>&quot;Open New DC&quot;</strong>. Type your DC No (e.g. DC-5001), Opening Quantity (e.g. 5,000 pcs), and Date. The DC No is permanent and locked once saved.
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-3 space-y-1 backdrop-blur-xs">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-400/30 text-emerald-100 px-1.5 py-0.5 rounded">
                Step 2 · Movements
              </span>
              <p className="font-semibold text-white">Record IN &amp; OUT</p>
              <p className="text-blue-100/80 leading-relaxed text-[11px]">
                Open the DC from the table. Type quantity and click <strong>IN</strong> (received) or <strong>OUT</strong> (sent to wash/finishing). EYE automatically computes the balance.
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-3 space-y-1 backdrop-blur-xs">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-purple-400/30 text-purple-100 px-1.5 py-0.5 rounded">
                Step 3 · Auto-Close
              </span>
              <p className="font-semibold text-white">Zero Balance Close</p>
              <p className="text-blue-100/80 leading-relaxed text-[11px]">
                When remaining balance hits exactly 0, EYE marks the DC as <strong>CLOSED</strong> automatically. The balance shows as &quot;—&quot; everywhere.
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-3 space-y-1 backdrop-blur-xs">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-400/30 text-amber-100 px-1.5 py-0.5 rounded">
                Step 4 · Gap Alert
              </span>
              <p className="font-semibold text-white">Dormant Lot Alerts</p>
              <p className="text-blue-100/80 leading-relaxed text-[11px]">
                If no movement is logged for a DC for &gt;5 days, EYE highlights it in red with the inactive day count, so no lot gets lost on the factory floor.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 30-Day Activity Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">30-Day Movement Trend (IN vs OUT)</h2>
            <p className="text-xs text-slate-500">Daily piece turnover across all factory lines</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-xs inline-block" />
              <span className="text-slate-600">IN (Received)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#1e3a5f] rounded-xs inline-block" />
              <span className="text-slate-600">OUT (Dispatched)</span>
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="IN" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="OUT" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Open DCs Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Active DCs</h2>
            <p className="text-xs text-slate-500">Live running balance and delay tracking</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {data.openDcs.length} open DC{data.openDcs.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">DC No</th>
                <th className="py-3 px-4">Open Date</th>
                <th className="py-3 px-4">Party / Line</th>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-4 text-right">Total In</th>
                <th className="py-3 px-4 text-right">Total Out</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">Balance</th>
                <th className="py-3 px-4">Last Entry</th>
                <th className="py-3 px-4 text-center">Delay</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.openDcs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1e3a5f] flex items-center justify-center mx-auto">
                        <Plus className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No DCs Yet</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Ready for real factory floor records! Click &quot;Open First DC&quot; to enter your physical DC No, opening quantity, and start logging movements date-wise.
                      </p>
                      <button
                        onClick={onOpenNewDcModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-lg shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Open First DC</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data.openDcs.map(dc => (
                  <tr
                    key={dc.id}
                    onClick={() => onSelectDc(dc.id)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#1e3a5f] group-hover:underline">
                      {dc.dcNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatKarachiDate(dc.openDate)}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {dc.party || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {dc.article || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700">
                      {formatNumber(dc.totalIn)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700">
                      {formatNumber(dc.totalOut)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatNumber(dc.balance)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatKarachiDate(dc.lastEntryDate)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {dc.isStale ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          {dc.daysSinceLastEntry}d stale
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono">
                          {dc.daysSinceLastEntry === 0 ? 'Today' : `${dc.daysSinceLastEntry}d ago`}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectDc(dc.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] hover:text-[#152a45] hover:underline"
                      >
                        <span>Open Diary</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
