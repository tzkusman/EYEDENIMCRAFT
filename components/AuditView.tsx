'use client';

import React from 'react';
import { History, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { AuditLogItem } from '@/lib/types';
import { formatKarachiDate } from '@/lib/ledger';

export function AuditView() {
  const [logs, setLogs] = React.useState<AuditLogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [actionFilter, setActionFilter] = React.useState('');
  const [entityFilter, setEntityFilter] = React.useState('');

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (actionFilter) params.set('action', actionFilter);
        if (entityFilter) params.set('entity', entityFilter);

        const res = await fetch(`/api/v1/audit?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load audit logs');
        const json = await res.json();
        if (isSubscribed) {
          setLogs(json.logs || []);
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
  }, [actionFilter, entityFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'VOID':
        return 'bg-red-100 text-red-900 border-red-300 font-extrabold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">System Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident chronological log of every creation, correction, deletion, and void across Denim Crafts
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="VOID">VOID</option>
            <option value="SETTINGS">SETTINGS</option>
          </select>

          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
          >
            <option value="">All Entities</option>
            <option value="CHALLAN">CHALLAN</option>
            <option value="ENTRY">ENTRY</option>
            <option value="USER">USER</option>
            <option value="SETTING">SETTING</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-xl border border-red-200 text-xs text-red-600">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
          No audit records found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-8"></th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Reason / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => {
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-slate-400 text-center">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {log.createdAt ? `${formatKarachiDate(log.createdAt.slice(0, 10))} ${log.createdAt.slice(11, 19)}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{log.userEmail}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {log.entity} <span className="text-[10px] text-slate-400">({log.entityId.slice(0, 12)})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {log.reason || '—'}
                      </td>
                    </tr>

                    {/* Expandable JSON Diff Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={6} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            <div className="p-3 bg-white rounded border border-slate-200">
                              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                                Old State:
                              </span>
                              <pre className="text-[10px] text-slate-700 overflow-x-auto whitespace-pre-wrap">
                                {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : 'null'}
                              </pre>
                            </div>
                            <div className="p-3 bg-white rounded border border-slate-200">
                              <span className="text-[11px] font-bold text-[#1e3a5f] block mb-1">
                                New State:
                              </span>
                              <pre className="text-[10px] text-slate-700 overflow-x-auto whitespace-pre-wrap">
                                {log.newValue ? JSON.stringify(log.newValue, null, 2) : 'null'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
