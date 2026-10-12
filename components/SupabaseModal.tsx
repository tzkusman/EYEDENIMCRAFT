'use client';

import React from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  FileCode,
  Key,
  X,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SupabaseStatusData {
  connected: boolean;
  isConfigured: boolean;
  urlConfigured: boolean;
  serviceKeyConfigured: boolean;
  anonKeyConfigured: boolean;
  databaseUrlConfigured: boolean;
  error?: string;
  details?: {
    tablesFound: string[];
    missingTables: string[];
    schemaReady: boolean;
  };
  sqlScript?: string;
  guide?: {
    steps: string[];
  };
}

export function SupabaseModal({ isOpen, onClose }: SupabaseModalProps) {
  const [data, setData] = React.useState<SupabaseStatusData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copiedSql, setCopiedSql] = React.useState(false);
  const [copiedEnv, setCopiedEnv] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'sql' | 'env'>('overview');

  const checkStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/system/supabase');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;
    const load = async () => {
      try {
        const res = await fetch('/api/v1/system/supabase');
        const json = await res.json();
        if (isSubscribed) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    if (data?.sqlScript) {
      navigator.clipboard.writeText(data.sqlScript);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const envTemplate = `# Supabase PostgreSQL Connection Pooler (Port 6543, pgbouncer=true)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection for Prisma Migrations (Port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Supabase API project endpoint
SUPABASE_URL="https://[PROJECT_REF].supabase.co"

# Supabase Anon Key (Public)
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Supabase Service Role Key (Backend Secret)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Supabase & PostgreSQL Database</h2>
              <p className="text-xs text-slate-500">Live production database connection and schema setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-white flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#1e3a5f] text-[#1e3a5f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Status & Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-[#1e3a5f] text-[#1e3a5f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Supabase SQL Script</span>
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'env'
                ? 'border-[#1e3a5f] text-[#1e3a5f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Environment Variables</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Connection Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  data?.connected
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {data?.connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {data?.connected
                        ? 'Connected to Supabase PostgreSQL'
                        : 'Awaiting Supabase Credentials'}
                    </h3>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {data?.connected
                        ? 'All DC queries and immutability triggers are actively communicating with Supabase.'
                        : 'The app is currently running on the high-speed in-memory engine. To persist your real factory data permanently to your Supabase PostgreSQL cluster, add your credentials below.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={checkStatus}
                  disabled={loading}
                  className="px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">SUPABASE_URL</span>
                    {data?.urlConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Check className="w-3.5 h-3.5" /> Configured
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">Not Set</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">API endpoint for queries</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">DATABASE_URL</span>
                    {data?.databaseUrlConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Check className="w-3.5 h-3.5" /> Configured
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">Not Set</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">PgBouncer pooler on port 6543</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">SERVICE_ROLE_KEY</span>
                    {data?.serviceKeyConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Check className="w-3.5 h-3.5" /> Configured
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">Not Set</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Backend database bypass key</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Schema & Tables</span>
                    {data?.details?.schemaReady ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Check className="w-3.5 h-3.5" /> 5 Tables Ready
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700">Pending Migration</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">challans, entries, profiles, audit, settings</p>
                </div>
              </div>

              {/* Step by Step Setup Instructions */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-[#1e3a5f]" />
                  <span>Quick Setup: 3 Steps to Connect</span>
                </h4>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pl-1">
                  <li>
                    Log in to your{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1e3a5f] font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Supabase Dashboard <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and open your project.
                  </li>
                  <li>
                    Go to <strong>Project Settings -&gt; API</strong> and <strong>Database</strong> to grab your keys.
                  </li>
                  <li>
                    Open the <strong>SQL Editor</strong> tab in Supabase, paste our prepared SQL script (click the tab above), and hit <strong>Run</strong>.
                  </li>
                </ol>
              </div>

              {/* Immutability & Security Highlight */}
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1e3a5f] shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Database-Level Security:</strong> The included migration installs the PostgreSQL trigger <code className="text-xs font-mono bg-blue-100 px-1 py-0.5 rounded text-[#1e3a5f]">prevent_dc_no_update()</code> to guarantee that once a DC number is written to Supabase, it cannot be tampered with.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Supabase DDL Migration Script</h4>
                  <p className="text-[11px] text-slate-500">Run this once in Supabase Dashboard -&gt; SQL Editor</p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy Entire SQL'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-[380px] leading-relaxed border border-slate-800">
                {data?.sqlScript || '-- Loading SQL script...'}
              </pre>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Environment Variables Template</h4>
                  <p className="text-[11px] text-slate-500">Add these to your .env or production hosting secrets</p>
                </div>
                <button
                  onClick={handleCopyEnv}
                  className="px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#152a45] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedEnv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEnv ? 'Copied to Clipboard!' : 'Copy Variables'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                {envTemplate}
              </pre>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Important:</strong> Never expose <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> or <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">DATABASE_URL</code> to client-side code. They are server secrets accessed exclusively via backend API routes.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Denim Crafts (Karachi) • Factory Floor Production Database
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
