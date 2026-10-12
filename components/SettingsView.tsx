'use client';

import React from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { AppSettings } from '@/lib/types';
import { SupabaseModal } from './SupabaseModal';

export function SettingsView() {
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [staleDays, setStaleDays] = React.useState('5');
  const [companyName, setCompanyName] = React.useState('Denim Crafts');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<{ text: string; isError: boolean } | null>(null);
  const [supabaseModalOpen, setSupabaseModalOpen] = React.useState(false);

  React.useEffect(() => {
    let isSubscribed = true;
    const load = async () => {
      try {
        const res = await fetch('/api/v1/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const json = await res.json();
        if (isSubscribed) {
          setSettings(json.settings);
          setStaleDays(String(json.settings.staleDays || 5));
          setCompanyName(json.settings.companyName || 'Denim Crafts');
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          setStatusMsg({ text: (err as Error).message, isError: true });
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isSubscribed = false;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    const parsedDays = parseInt(staleDays, 10);
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 60) {
      setStatusMsg({ text: 'Stale days must be between 1 and 60 days.', isError: true });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staleDays: parsedDays,
          companyName: companyName.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setStatusMsg({ text: json.error?.message || 'Failed to update settings', isError: true });
        return;
      }

      setSettings(json.settings);
      setStatusMsg({ text: 'Settings successfully updated and audit logged.', isError: false });
    } catch (err) {
      setStatusMsg({ text: (err as Error).message, isError: true });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">System Configuration</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Admin settings: customize factory alert thresholds and company metadata
        </p>

        {statusMsg && (
          <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
            statusMsg.isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            {statusMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-[#1e3a5f] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Stale DC Threshold (Days)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              required
              value={staleDays}
              onChange={e => setStaleDays(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono focus:ring-1 focus:ring-[#1e3a5f] focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Any OPEN Delivery Challan without a recorded entry for more than this threshold will be flagged in red on the dashboard and register.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operating Factory Timezone
            </label>
            <input
              type="text"
              disabled
              value="Asia/Karachi (PKT / UTC+5)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-100 text-slate-500 font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-md transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Supabase & PostgreSQL Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Supabase & PostgreSQL Database</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Connect to your live Supabase cluster, test table connections, and view or copy the SQL schema.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSupabaseModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Manage Supabase</span>
          </button>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white p-5 rounded-xl border border-red-200/80 shadow-2xs">
        <h2 className="text-sm font-bold text-red-900">Factory Floor Data Management</h2>
        <p className="text-xs text-slate-500 mt-1">
          Wipe all DCs and movement rows to start with an entirely clean ledger for real batches.
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">Reset All DCs and Entries</span>
          <button
            type="button"
            onClick={async () => {
              if (!confirm('Are you sure you want to delete all production DCs and entries? This cannot be undone.')) return;
              try {
                const res = await fetch('/api/v1/system/reset', { method: 'POST' });
                const json = await res.json();
                if (res.ok) {
                  alert(json.message || 'All production data cleared successfully.');
                  window.location.reload();
                } else {
                  alert(json.error?.message || 'Failed to clear data.');
                }
              } catch (e) {
                alert((e as Error).message);
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors cursor-pointer"
          >
            Clear All Data
          </button>
        </div>
      </div>

      <SupabaseModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />
    </div>
  );
}
