'use client';

import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { formatNumber, formatKarachiDate } from '@/lib/ledger';
import { exportSummaryToExcel, exportSummaryToPDF } from './ExportUtils';

export function ReportsView() {
  const [activeTab, setActiveTab] = React.useState<'summary' | 'gaps' | 'stale'>('summary');
  const [summaryData, setSummaryData] = React.useState<any[]>([]);
  const [gapsData, setGapsData] = React.useState<any[]>([]);
  const [staleData, setStaleData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const [sumRes, gapRes] = await Promise.all([
          fetch('/api/v1/reports/summary'),
          fetch('/api/v1/reports/gaps'),
        ]);

        if (!sumRes.ok || !gapRes.ok) throw new Error('Failed to load reports');

        const sumJson = await sumRes.json();
        const gapJson = await gapRes.json();

        if (isSubscribed) {
          setSummaryData(sumJson.report || []);
          setGapsData(gapJson.gapsReport || []);
          setStaleData(gapJson.staleReport || []);
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

  return (
    <div className="space-y-6">
      
      {/* Header and Export Actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Factory Production Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manager & Admin audit summaries, bottleneck gap analysis, and dormant challan tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSummaryToExcel(summaryData)}
            disabled={summaryData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => exportSummaryToPDF(summaryData)}
            disabled={summaryData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'summary'
              ? 'bg-[#1e3a5f] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          DC-Wise Summary ({summaryData.length})
        </button>

        <button
          onClick={() => setActiveTab('gaps')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'gaps'
              ? 'bg-[#1e3a5f] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Production Gaps ({gapsData.length})
        </button>

        <button
          onClick={() => setActiveTab('stale')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'stale'
              ? 'bg-[#1e3a5f] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Stale Challans</span>
          {staleData.length > 0 && (
            <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full">
              {staleData.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-xl border border-red-200 text-xs text-red-600">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">DC No</th>
                    <th className="py-3 px-4">Open Date</th>
                    <th className="py-3 px-4">Party / Line</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4 text-right">Opening</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Total In</th>
                    <th className="py-3 px-4 text-right text-rose-700">Total Out</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-900">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Days Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1e3a5f]">{r.dcNo}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{formatKarachiDate(r.openDate)}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{r.party}</td>
                      <td className="py-3 px-4 text-slate-600">{r.article}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatNumber(r.openingQty)}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatNumber(r.totalIn)}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700">{formatNumber(r.totalOut)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {typeof r.balance === 'number' ? formatNumber(r.balance) : r.balance}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'VOID'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{r.daysOpen}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Production Gaps Tab */}
          {activeTab === 'gaps' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">DC No</th>
                    <th className="py-3 px-4">Party / Line</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center font-bold text-amber-800">Longest Gap</th>
                    <th className="py-3 px-4 text-center text-slate-600">Average Gap</th>
                    <th className="py-3 px-4 text-center">Days Inactive</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gapsData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1e3a5f]">{r.dcNo}</td>
                      <td className="py-3 px-4 text-slate-800 font-medium">{r.party}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold text-slate-600 uppercase">{r.status}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                        {r.longestGap} days
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {r.averageGap} days
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {r.daysSinceLastEntry} days
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {typeof r.balance === 'number' ? formatNumber(r.balance) : r.balance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stale Challans Tab */}
          {activeTab === 'stale' && (
            <div className="overflow-x-auto">
              {staleData.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No stale DCs. All production lots have recent activity.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-red-50/60 border-b border-red-200 text-red-900 font-semibold">
                      <th className="py-3 px-4">DC No</th>
                      <th className="py-3 px-4">Party / Line</th>
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4 text-center">Days Inactive</th>
                      <th className="py-3 px-4 text-right">Pending Balance</th>
                      <th className="py-3 px-4 text-center">Warning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {staleData.map(r => (
                      <tr key={r.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-red-900">{r.dcNo}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{r.party}</td>
                        <td className="py-3 px-4 text-slate-600">{r.article}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-red-700">
                          {r.daysSinceLastEntry} days
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatNumber(r.balance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            Production Dormant
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
