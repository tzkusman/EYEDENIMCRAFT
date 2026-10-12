'use client';

import React from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  FileSpreadsheet,
  FileText,
  Calendar,
  X,
  Check,
  RotateCcw,
  Layers,
  Clock,
  AlertTriangle,
  Lock,
  ChevronRight,
  SlidersHorizontal,
  Building2,
  Tag,
  Hash,
} from 'lucide-react';
import { Challan, UserProfile } from '@/lib/types';
import { formatNumber, formatKarachiDate, getTodayDateString } from '@/lib/ledger';
import { exportChallansToExcel, exportChallansToPDF } from './ExportUtils';

interface EnrichedChallan extends Challan {
  summary: {
    totalIn: number;
    totalOut: number;
    difference: number;
    currentBalance: number;
    isClosed: boolean;
    daysOpen: number;
    daysSinceLastEntry: number;
    averageGap: number;
    longestGap: number;
    isStale: boolean;
  };
}

interface ActiveDcsViewProps {
  currentUser: UserProfile | null;
  onSelectDc: (dcId: string) => void;
  onOpenNewDcModal: () => void;
}

type SortField = 'dcNo' | 'openDate' | 'party' | 'article' | 'openingQty' | 'totalIn' | 'totalOut' | 'balance' | 'status';
type SortOrder = 'asc' | 'desc';

export function ActiveDcsView({ currentUser, onSelectDc, onOpenNewDcModal }: ActiveDcsViewProps) {
  const [challans, setChallans] = React.useState<EnrichedChallan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Global search
  const [searchQuery, setSearchQuery] = React.useState('');

  // Excel-style Column Filters
  const [statusFilter, setStatusFilter] = React.useState<string[]>(['OPEN']); // Default to active OPEN DCs
  const [partyFilter, setPartyFilter] = React.useState<string[]>([]);
  const [articleFilter, setArticleFilter] = React.useState<string[]>([]);
  const [datePreset, setDatePreset] = React.useState<string>('all'); // all, today, last7, last30, thisMonth, custom
  const [customStartDate, setCustomStartDate] = React.useState<string>('');
  const [customEndDate, setCustomEndDate] = React.useState<string>('');

  // Active open filter dropdown ('status' | 'party' | 'article' | 'date' | null)
  const [activeFilterDropdown, setActiveFilterDropdown] = React.useState<string | null>(null);
  const [filterSearchTerm, setFilterSearchTerm] = React.useState<string>('');

  // Sort State: Default to latest date first!
  const [sortField, setSortField] = React.useState<SortField>('openDate');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  // View Mode: 'flat' (standard Excel table) vs 'date-grouped' (grouped by date with date subtotals)
  const [viewMode, setViewMode] = React.useState<'flat' | 'date-grouped'>('flat');

  const filterRef = React.useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setActiveFilterDropdown(null);
        setFilterSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/challans');
      if (!res.ok) throw new Error('Failed to load challans');
      const json = await res.json();
      setChallans(json.challans || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isSubscribed = true;
    const fetchChallans = async () => {
      try {
        const res = await fetch('/api/v1/challans');
        if (!res.ok) throw new Error('Failed to load challans');
        const json = await res.json();
        if (isSubscribed) {
          setChallans(json.challans || []);
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          setError((err as Error).message);
          setLoading(false);
        }
      }
    };
    fetchChallans();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Distinct values for Excel filter dropdowns
  const uniqueParties = React.useMemo(() => {
    const set = new Set<string>();
    challans.forEach(c => {
      if (c.party && c.party.trim()) set.add(c.party.trim());
    });
    return Array.from(set).sort();
  }, [challans]);

  const uniqueArticles = React.useMemo(() => {
    const set = new Set<string>();
    challans.forEach(c => {
      if (c.article && c.article.trim()) set.add(c.article.trim());
    });
    return Array.from(set).sort();
  }, [challans]);

  // Apply Filtering
  const filteredChallans = React.useMemo(() => {
    return challans.filter(c => {
      // 1. Text Search across DC No, Party, Article, Remarks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDc = c.dcNo.toLowerCase().includes(q);
        const matchesParty = c.party?.toLowerCase().includes(q) ?? false;
        const matchesArticle = c.article?.toLowerCase().includes(q) ?? false;
        const matchesRemarks = c.remarks?.toLowerCase().includes(q) ?? false;
        if (!matchesDc && !matchesParty && !matchesArticle && !matchesRemarks) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter.length > 0) {
        if (!statusFilter.includes(c.status)) {
          return false;
        }
      }

      // 3. Party Filter
      if (partyFilter.length > 0) {
        const partyName = c.party ? c.party.trim() : 'Unassigned';
        if (!partyFilter.includes(partyName)) {
          return false;
        }
      }

      // 4. Article Filter
      if (articleFilter.length > 0) {
        const articleName = c.article ? c.article.trim() : 'Unassigned';
        if (!articleFilter.includes(articleName)) {
          return false;
        }
      }

      // 5. Date Filter
      if (datePreset !== 'all') {
        const today = getTodayDateString();
        const itemDate = c.openDate;

        if (datePreset === 'today') {
          if (itemDate !== today) return false;
        } else if (datePreset === 'last7') {
          const d = new Date(today);
          d.setDate(d.getDate() - 7);
          const limit = d.toISOString().slice(0, 10);
          if (itemDate < limit || itemDate > today) return false;
        } else if (datePreset === 'last30') {
          const d = new Date(today);
          d.setDate(d.getDate() - 30);
          const limit = d.toISOString().slice(0, 10);
          if (itemDate < limit || itemDate > today) return false;
        } else if (datePreset === 'thisMonth') {
          const firstDay = `${today.slice(0, 7)}-01`;
          if (itemDate < firstDay || itemDate > today) return false;
        } else if (datePreset === 'custom') {
          if (customStartDate && itemDate < customStartDate) return false;
          if (customEndDate && itemDate > customEndDate) return false;
        }
      }

      return true;
    });
  }, [
    challans,
    searchQuery,
    statusFilter,
    partyFilter,
    articleFilter,
    datePreset,
    customStartDate,
    customEndDate,
  ]);

  // Apply Sorting (Default: Latest date first)
  const sortedChallans = React.useMemo(() => {
    return [...filteredChallans].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'dcNo':
          valA = a.dcNo.toLowerCase();
          valB = b.dcNo.toLowerCase();
          break;
        case 'openDate':
          valA = a.openDate;
          valB = b.openDate;
          break;
        case 'party':
          valA = (a.party || '').toLowerCase();
          valB = (b.party || '').toLowerCase();
          break;
        case 'article':
          valA = (a.article || '').toLowerCase();
          valB = (b.article || '').toLowerCase();
          break;
        case 'openingQty':
          valA = a.openingQty;
          valB = b.openingQty;
          break;
        case 'totalIn':
          valA = a.summary.totalIn;
          valB = b.summary.totalIn;
          break;
        case 'totalOut':
          valA = a.summary.totalOut;
          valB = b.summary.totalOut;
          break;
        case 'balance':
          valA = a.summary.currentBalance;
          valB = b.summary.currentBalance;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }

      // Primary comparison
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;

      // Secondary tiebreaker: Open date descending (latest first)
      if (sortField !== 'openDate') {
        if (a.openDate < b.openDate) return 1;
        if (a.openDate > b.openDate) return -1;
      }

      return 0;
    });
  }, [filteredChallans, sortField, sortOrder]);

  // Grand Totals across currently filtered rows
  const totals = React.useMemo(() => {
    return sortedChallans.reduce(
      (acc, c) => {
        acc.openingQty += c.openingQty;
        acc.totalIn += c.summary.totalIn;
        acc.totalOut += c.summary.totalOut;
        acc.balance += c.summary.currentBalance;
        if (c.status === 'OPEN') acc.openCount += 1;
        if (c.status === 'CLOSED') acc.closedCount += 1;
        return acc;
      },
      {
        openingQty: 0,
        totalIn: 0,
        totalOut: 0,
        balance: 0,
        openCount: 0,
        closedCount: 0,
      }
    );
  }, [sortedChallans]);

  // Date-wise grouping (latest date first)
  const dateGroups = React.useMemo(() => {
    const map = new Map<string, {
      date: string;
      items: EnrichedChallan[];
      subtotalOpening: number;
      subtotalIn: number;
      subtotalOut: number;
      subtotalBalance: number;
    }>();

    sortedChallans.forEach(c => {
      const d = c.openDate;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          items: [],
          subtotalOpening: 0,
          subtotalIn: 0,
          subtotalOut: 0,
          subtotalBalance: 0,
        });
      }
      const grp = map.get(d)!;
      grp.items.push(c);
      grp.subtotalOpening += c.openingQty;
      grp.subtotalIn += c.summary.totalIn;
      grp.subtotalOut += c.summary.totalOut;
      grp.subtotalBalance += c.summary.currentBalance;
    });

    // Sort date groups descending (latest comes first date wise)
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [sortedChallans]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For dates and numbers, default to desc (latest/largest first)
      if (['openDate', 'openingQty', 'totalIn', 'totalOut', 'balance'].includes(field)) {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  // Clear all filters
  const resetFilters = () => {
    setStatusFilter(['OPEN']);
    setPartyFilter([]);
    setArticleFilter([]);
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
    setSortField('openDate');
    setSortOrder('desc');
  };

  const hasActiveFilters =
    statusFilter.length !== 1 ||
    statusFilter[0] !== 'OPEN' ||
    partyFilter.length > 0 ||
    articleFilter.length > 0 ||
    datePreset !== 'all' ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      
      {/* Top Header & Factory Production Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Active DCs (DC Register)
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-[#1e3a5f] text-white rounded-full">
              {sortedChallans.length} {sortedChallans.length === 1 ? 'DC' : 'DCs'}
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              • Sorted latest first by date
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time movement ledger tracking Opening Qty, Total IN, Total OUT, and Remaining Floor Balance
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Excel Export */}
          <button
            onClick={() => exportChallansToExcel(sortedChallans)}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export filtered records to Microsoft Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={() => exportChallansToPDF(sortedChallans)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download printable PDF report"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>PDF</span>
          </button>

          {/* Open DC Primary Button */}
          <button
            onClick={onOpenNewDcModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open DC</span>
          </button>
        </div>
      </div>

      {/* Production Live Ledger Totals Strip (Replaces bulky dashboard charts with crisp numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Opening Qty
          </span>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {formatNumber(totals.openingQty)} <span className="text-xs font-normal text-slate-500">pcs</span>
          </div>
          <span className="text-[10px] text-slate-400">Total received in active batches</span>
        </div>

        <div className="px-3 py-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Total IN (Received)
          </span>
          <div className="text-base font-bold text-emerald-700 mt-0.5">
            +{formatNumber(totals.totalIn)} <span className="text-xs font-normal text-emerald-600">pcs</span>
          </div>
          <span className="text-[10px] text-emerald-600/80">Garments checked back IN</span>
        </div>

        <div className="px-3 py-2 bg-blue-50/60 rounded-lg border border-blue-100">
          <span className="text-[11px] font-semibold text-[#1e3a5f] uppercase tracking-wider block">
            Total OUT (Sent)
          </span>
          <div className="text-base font-bold text-[#1e3a5f] mt-0.5">
            -{formatNumber(totals.totalOut)} <span className="text-xs font-normal text-blue-600">pcs</span>
          </div>
          <span className="text-[10px] text-blue-600/80">Garments dispatched OUT</span>
        </div>

        <div className="px-3 py-2 bg-amber-50/70 rounded-lg border border-amber-200/80">
          <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
            Current Floor Balance
          </span>
          <div className="text-base font-bold text-amber-700 mt-0.5">
            {formatNumber(totals.balance)} <span className="text-xs font-normal text-amber-600">pcs</span>
          </div>
          <span className="text-[10px] text-amber-700/80">Pending in factory circulation</span>
        </div>
      </div>

      {/* Excel Filter Toolbar & View Mode Switcher */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by DC No, Party, Article, or Remarks..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#1e3a5f] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Presets & Date Selector */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Date Range Preset Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2" />
              <button
                onClick={() => setDatePreset('all')}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  datePreset === 'all' ? 'bg-white text-[#1e3a5f] shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Dates
              </button>
              <button
                onClick={() => setDatePreset('today')}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  datePreset === 'today' ? 'bg-white text-[#1e3a5f] shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDatePreset('last7')}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  datePreset === 'last7' ? 'bg-white text-[#1e3a5f] shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDatePreset('thisMonth')}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  datePreset === 'thisMonth' ? 'bg-white text-[#1e3a5f] shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
            </div>

            {/* View Mode: Flat vs Date-Grouped */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('flat')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'flat' ? 'bg-white text-[#1e3a5f] shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Single Excel table sorted newest date first"
              >
                Excel Table
              </button>
              <button
                onClick={() => setViewMode('date-grouped')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'date-grouped' ? 'bg-white text-[#1e3a5f] shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Grouped by date with individual date subtotals"
              >
                Date Subtotals
              </button>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset all active column and search filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}

          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            <span className="font-semibold text-slate-500">Active Excel Filters:</span>
            
            {statusFilter.map(s => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#1e3a5f] border border-blue-200 rounded-md font-medium"
              >
                Status: {s}
                <button
                  onClick={() => setStatusFilter(prev => prev.filter(x => x !== s))}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {partyFilter.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md font-medium"
              >
                Party: {p}
                <button
                  onClick={() => setPartyFilter(prev => prev.filter(x => x !== p))}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {articleFilter.map(a => (
              <span
                key={a}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-medium"
              >
                Article: {a}
                <button
                  onClick={() => setArticleFilter(prev => prev.filter(x => x !== a))}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {datePreset !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-medium">
                Date: {datePreset}
                <button
                  onClick={() => setDatePreset('all')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-md font-medium">
                Keyword: &quot;{searchQuery}&quot;
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Excel-Type Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden relative" ref={filterRef}>
        
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Loading factory floor challans...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-xs">
            <p className="font-bold">Error loading records: {error}</p>
            <button
              onClick={loadData}
              className="mt-2 px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-700 font-semibold"
            >
              Retry
            </button>
          </div>
        ) : sortedChallans.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No DCs Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No DCs match the selected Excel filters. Try clearing or relaxing your filter parameters.'
                : 'No DCs have been created yet. Click "Open DC" to start tracking production batches.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#1e3a5f] bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={onOpenNewDcModal}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-md transition-colors"
              >
                + Open First DC
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Excel Table Header with Column Filters & Sorting */}
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                  
                  {/* DC No Column Header */}
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleSort('dcNo')}
                        className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                        <span>DC NO</span>
                        {sortField === 'dcNo' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1e3a5f]" /> : <ArrowDown className="w-3 h-3 text-[#1e3a5f]" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* Open Date Column Header (Default latest first) */}
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleSort('openDate')}
                        className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                        title="Click to sort by Date (Latest / Oldest)"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>DATE</span>
                        {sortField === 'openDate' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#1e3a5f] font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#1e3a5f] font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </button>
                    </div>
                  </th>

                  {/* Party Column Header with Excel Filter Dropdown */}
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleSort('party')}
                        className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>PARTY</span>
                        {sortField === 'party' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1e3a5f]" /> : <ArrowDown className="w-3 h-3 text-[#1e3a5f]" />
                        )}
                      </button>

                      {/* Excel Filter Button */}
                      <button
                        onClick={() => {
                          setActiveFilterDropdown(activeFilterDropdown === 'party' ? null : 'party');
                          setFilterSearchTerm('');
                        }}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          partyFilter.length > 0
                            ? 'bg-[#1e3a5f] text-white'
                            : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title="Excel Filter by Party"
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                  </th>

                  {/* Article Column Header with Excel Filter Dropdown */}
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleSort('article')}
                        className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span>ARTICLE</span>
                        {sortField === 'article' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1e3a5f]" /> : <ArrowDown className="w-3 h-3 text-[#1e3a5f]" />
                        )}
                      </button>

                      {/* Excel Filter Button */}
                      <button
                        onClick={() => {
                          setActiveFilterDropdown(activeFilterDropdown === 'article' ? null : 'article');
                          setFilterSearchTerm('');
                        }}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          articleFilter.length > 0
                            ? 'bg-[#1e3a5f] text-white'
                            : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title="Excel Filter by Article"
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                  </th>

                  {/* Opening Qty Header */}
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleSort('openingQty')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                    >
                      <span>OPENING QTY</span>
                      {sortField === 'openingQty' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1e3a5f]" /> : <ArrowDown className="w-3 h-3 text-[#1e3a5f]" />
                      )}
                    </button>
                  </th>

                  {/* Total IN Header */}
                  <th className="py-2.5 px-3 text-right whitespace-nowrap bg-emerald-50/50">
                    <button
                      onClick={() => handleSort('totalIn')}
                      className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 cursor-pointer ml-auto"
                      title="Total garment pieces received IN"
                    >
                      <span>TOTAL IN</span>
                      {sortField === 'totalIn' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-700" /> : <ArrowDown className="w-3 h-3 text-emerald-700" />
                      )}
                    </button>
                  </th>

                  {/* Total OUT Header */}
                  <th className="py-2.5 px-3 text-right whitespace-nowrap bg-blue-50/50">
                    <button
                      onClick={() => handleSort('totalOut')}
                      className="inline-flex items-center gap-1 text-[#1e3a5f] hover:text-[#152a45] cursor-pointer ml-auto"
                      title="Total garment pieces dispatched OUT"
                    >
                      <span>TOTAL OUT</span>
                      {sortField === 'totalOut' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1e3a5f]" /> : <ArrowDown className="w-3 h-3 text-[#1e3a5f]" />
                      )}
                    </button>
                  </th>

                  {/* Current Balance Header */}
                  <th className="py-2.5 px-3 text-right whitespace-nowrap bg-amber-50/40">
                    <button
                      onClick={() => handleSort('balance')}
                      className="inline-flex items-center gap-1 text-amber-900 hover:text-amber-950 cursor-pointer ml-auto font-bold"
                      title="Current balance pending on floor"
                    >
                      <span>BALANCE</span>
                      {sortField === 'balance' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-700" /> : <ArrowDown className="w-3 h-3 text-amber-700" />
                      )}
                    </button>
                  </th>

                  {/* Status Header with Excel Filter Dropdown */}
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        <span>STATUS</span>
                        {sortField === 'status' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-[#1e3a5f]" /> : <ArrowDown className="w-3 h-3 text-[#1e3a5f]" />
                        )}
                      </button>

                      {/* Excel Filter Button */}
                      <button
                        onClick={() => {
                          setActiveFilterDropdown(activeFilterDropdown === 'status' ? null : 'status');
                          setFilterSearchTerm('');
                        }}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          statusFilter.length !== 1 || statusFilter[0] !== 'OPEN'
                            ? 'bg-[#1e3a5f] text-white'
                            : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title="Excel Filter by Status"
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                  </th>

                  {/* Inactivity / Floor Health Header */}
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    <span>FLOOR ACTIVITY</span>
                  </th>

                  {/* Action Link Header */}
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span>VIEW</span>
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100">
                {viewMode === 'flat' ? (
                  // Flat Excel Table View (latest comes first date wise)
                  sortedChallans.map(challan => (
                    <tr
                      key={challan.id}
                      onClick={() => onSelectDc(challan.id)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                        challan.summary.isStale && challan.status === 'OPEN'
                          ? 'bg-red-50/30'
                          : challan.status === 'CLOSED'
                          ? 'bg-slate-50/40 opacity-80'
                          : ''
                      }`}
                    >
                      {/* DC No */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-[#1e3a5f]">
                            {challan.dcNo}
                          </span>
                          <span title="DC No is strictly immutable">
                            <Lock className="w-3 h-3 text-slate-300" />
                          </span>
                        </div>
                      </td>

                      {/* Open Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                        {formatKarachiDate(challan.openDate)}
                      </td>

                      {/* Party */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {challan.party || <span className="text-slate-400 italic font-normal">—</span>}
                        </span>
                      </td>

                      {/* Article */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-slate-700 font-medium">
                          {challan.article || <span className="text-slate-400 italic font-normal">—</span>}
                        </span>
                      </td>

                      {/* Opening Qty */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-800">
                        {formatNumber(challan.openingQty)}
                      </td>

                      {/* Total IN */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-700 bg-emerald-50/20">
                        {challan.summary.totalIn > 0 ? (
                          `+${formatNumber(challan.summary.totalIn)}`
                        ) : (
                          <span className="text-slate-300 font-normal">0</span>
                        )}
                      </td>

                      {/* Total OUT */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-[#1e3a5f] bg-blue-50/20">
                        {challan.summary.totalOut > 0 ? (
                          `-${formatNumber(challan.summary.totalOut)}`
                        ) : (
                          <span className="text-slate-300 font-normal">0</span>
                        )}
                      </td>

                      {/* Current Balance */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold bg-amber-50/20">
                        {challan.status === 'CLOSED' || challan.summary.currentBalance === 0 ? (
                          <span className="text-slate-400 font-semibold">—</span>
                        ) : (
                          <span className="text-slate-900 bg-amber-100/70 px-1.5 py-0.5 rounded text-xs">
                            {formatNumber(challan.summary.currentBalance)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {challan.status === 'OPEN' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            OPEN
                          </span>
                        )}
                        {challan.status === 'CLOSED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Check className="w-2.5 h-2.5 text-slate-500" />
                            CLOSED
                          </span>
                        )}
                        {challan.status === 'VOID' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            VOID
                          </span>
                        )}
                      </td>

                      {/* Floor Health / Inactivity Gap */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {challan.status === 'OPEN' ? (
                          challan.summary.isStale ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                              <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                              <span>{challan.summary.daysSinceLastEntry}d inactive</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {challan.summary.daysSinceLastEntry === 0
                                  ? 'Active today'
                                  : `${challan.summary.daysSinceLastEntry}d ago`}
                              </span>
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400">Completed</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-semibold text-[#1e3a5f] group-hover:translate-x-0.5 transition-transform">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  // Date-Grouped View (Each date has its own subtotal header and rows)
                  dateGroups.map(group => (
                    <React.Fragment key={group.date}>
                      {/* Date Section Subtotal Header */}
                      <tr className="bg-slate-200/70 border-y border-slate-300 text-slate-800 font-bold">
                        <td colSpan={4} className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#1e3a5f]" />
                            <span className="text-xs uppercase tracking-wide">
                              {formatKarachiDate(group.date)}
                            </span>
                            <span className="text-[11px] font-normal text-slate-600">
                              ({group.items.length} {group.items.length === 1 ? 'challan' : 'challans'})
                            </span>
                          </div>
                        </td>
                        {/* Date Opening Subtotal */}
                        <td className="py-2 px-3 text-right font-mono text-xs">
                          {formatNumber(group.subtotalOpening)}
                        </td>
                        {/* Date Total IN Subtotal */}
                        <td className="py-2 px-3 text-right font-mono text-xs text-emerald-800 bg-emerald-100/50">
                          +{formatNumber(group.subtotalIn)}
                        </td>
                        {/* Date Total OUT Subtotal */}
                        <td className="py-2 px-3 text-right font-mono text-xs text-[#1e3a5f] bg-blue-100/50">
                          -{formatNumber(group.subtotalOut)}
                        </td>
                        {/* Date Balance Subtotal */}
                        <td className="py-2 px-3 text-right font-mono text-xs text-amber-900 bg-amber-100/60 font-bold">
                          {formatNumber(group.subtotalBalance)}
                        </td>
                        <td colSpan={3} className="py-2 px-3 text-right text-[11px] text-slate-500 font-normal">
                          Date Subtotal
                        </td>
                      </tr>

                      {/* Rows for this date */}
                      {group.items.map(challan => (
                        <tr
                          key={challan.id}
                          onClick={() => onSelectDc(challan.id)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer group bg-white"
                        >
                          <td className="py-2 px-3 whitespace-nowrap pl-6">
                            <span className="font-mono font-bold text-slate-900 group-hover:text-[#1e3a5f]">
                              {challan.dcNo}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                            {formatKarachiDate(challan.openDate)}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800">
                            {challan.party || '—'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-700">
                            {challan.article || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {formatNumber(challan.openingQty)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            {challan.summary.totalIn > 0 ? `+${formatNumber(challan.summary.totalIn)}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#1e3a5f]">
                            {challan.summary.totalOut > 0 ? `-${formatNumber(challan.summary.totalOut)}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {challan.status === 'CLOSED' ? '—' : formatNumber(challan.summary.currentBalance)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase">
                              {challan.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-500">
                            {challan.summary.daysSinceLastEntry === 0 ? 'Today' : `${challan.summary.daysSinceLastEntry}d ago`}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1e3a5f] inline" />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>

              {/* Excel Sticky Bottom Total Row */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                  <td colSpan={4} className="py-3 px-3 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>GRAND TOTAL ({sortedChallans.length} DCS)</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-slate-100">
                    {formatNumber(totals.openingQty)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-400 bg-slate-800/80">
                    +{formatNumber(totals.totalIn)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-blue-300 bg-slate-800/80">
                    -{formatNumber(totals.totalOut)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-amber-300 bg-slate-800 font-black">
                    {formatNumber(totals.balance)}
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-right text-slate-400 font-normal">
                    Active Floor Balance Total
                  </td>
                </tr>
              </tfoot>

            </table>
          </div>
        )}

        {/* Excel Filter Dropdown Popup (Positioned dynamically) */}
        {activeFilterDropdown && (
          <div className="absolute top-12 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-64 animate-in fade-in zoom-in-95 duration-100 text-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#1e3a5f]" />
                Filter by {activeFilterDropdown}
              </span>
              <button
                onClick={() => setActiveFilterDropdown(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Sort Links */}
            <div className="py-1 mb-2 border-b border-slate-100 space-y-1">
              <button
                onClick={() => {
                  handleSort(activeFilterDropdown as SortField);
                  setActiveFilterDropdown(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-slate-50 text-slate-700 rounded flex items-center justify-between cursor-pointer"
              >
                <span>Sort A to Z</span>
                <ArrowUp className="w-3 h-3 text-slate-400" />
              </button>
              <button
                onClick={() => {
                  setSortField(activeFilterDropdown as SortField);
                  setSortOrder('desc');
                  setActiveFilterDropdown(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-slate-50 text-slate-700 rounded flex items-center justify-between cursor-pointer"
              >
                <span>Sort Z to A</span>
                <ArrowDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Filter Content */}
            {activeFilterDropdown === 'status' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <button
                    onClick={() => setStatusFilter(['OPEN', 'CLOSED', 'VOID'])}
                    className="text-[#1e3a5f] font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setStatusFilter([])}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                  {['OPEN', 'CLOSED', 'VOID'].map(st => {
                    const checked = statusFilter.includes(st);
                    const count = challans.filter(c => c.status === st).length;
                    return (
                      <label
                        key={st}
                        className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setStatusFilter(prev => prev.filter(x => x !== st));
                            } else {
                              setStatusFilter(prev => [...prev, st]);
                            }
                          }}
                          className="rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                        />
                        <span className="font-semibold text-xs">{st}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {activeFilterDropdown === 'party' && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search party..."
                  value={filterSearchTerm}
                  onChange={e => setFilterSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-[#1e3a5f]"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <button
                    onClick={() => setPartyFilter(uniqueParties)}
                    className="text-[#1e3a5f] font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setPartyFilter([])}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto pt-1">
                  {uniqueParties
                    .filter(p => p.toLowerCase().includes(filterSearchTerm.toLowerCase()))
                    .map(party => {
                      const checked = partyFilter.includes(party);
                      const count = challans.filter(c => c.party === party).length;
                      return (
                        <label
                          key={party}
                          className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded cursor-pointer text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setPartyFilter(prev => prev.filter(x => x !== party));
                              } else {
                                setPartyFilter(prev => [...prev, party]);
                              }
                            }}
                            className="rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                          />
                          <span className="text-xs truncate">{party}</span>
                          <span className="text-[10px] text-slate-400 ml-auto">({count})</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            {activeFilterDropdown === 'article' && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search article..."
                  value={filterSearchTerm}
                  onChange={e => setFilterSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-[#1e3a5f]"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <button
                    onClick={() => setArticleFilter(uniqueArticles)}
                    className="text-[#1e3a5f] font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setArticleFilter([])}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto pt-1">
                  {uniqueArticles
                    .filter(a => a.toLowerCase().includes(filterSearchTerm.toLowerCase()))
                    .map(article => {
                      const checked = articleFilter.includes(article);
                      const count = challans.filter(c => c.article === article).length;
                      return (
                        <label
                          key={article}
                          className="flex items-center gap-2 px-1.5 py-1 hover:bg-slate-50 rounded cursor-pointer text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setArticleFilter(prev => prev.filter(x => x !== article));
                              } else {
                                setArticleFilter(prev => [...prev, article]);
                              }
                            }}
                            className="rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                          />
                          <span className="text-xs truncate">{article}</span>
                          <span className="text-[10px] text-slate-400 ml-auto">({count})</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-2 border-t border-slate-100 mt-2 flex justify-end">
              <button
                onClick={() => setActiveFilterDropdown(null)}
                className="px-3 py-1 bg-[#1e3a5f] text-white rounded text-xs font-semibold cursor-pointer"
              >
                Apply
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
