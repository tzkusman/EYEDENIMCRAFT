'use client';

import React from 'react';
import { X, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { getTodayDateString } from '@/lib/ledger';
import { Challan } from '@/lib/types';

interface OpenDcModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (challan: Challan) => void;
  onJumpToExistingDc?: (dcId: string) => void;
}

export function OpenDcModal({
  isOpen,
  onClose,
  onSuccess,
  onJumpToExistingDc,
}: OpenDcModalProps) {
  const [date, setDate] = React.useState(getTodayDateString());
  const [dcNo, setDcNo] = React.useState('');
  const [openingQty, setOpeningQty] = React.useState<string>('');
  const [party, setParty] = React.useState('');
  const [article, setArticle] = React.useState('');
  const [remarks, setRemarks] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [existingId, setExistingId] = React.useState<string | null>(null);

  const handleClose = () => {
    setDate(getTodayDateString());
    setDcNo('');
    setOpeningQty('');
    setParty('');
    setArticle('');
    setRemarks('');
    setErrorMsg(null);
    setExistingId(null);
    onClose();
  };

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setExistingId(null);

    const cleanDcNo = dcNo.trim().toUpperCase();
    if (!cleanDcNo) {
      setErrorMsg('Please enter a DC No.');
      return;
    }

    const qty = parseInt(openingQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Opening quantity must be a positive number greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dcNo: cleanDcNo,
          openDate: date,
          openingQty: qty,
          party: party.trim() || undefined,
          article: article.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error?.code === 'DC_ALREADY_OPEN') {
          setErrorMsg(data.error.message || 'This DC No is already open');
          setExistingId(data.error.existingId || null);
        } else {
          setErrorMsg(data.error?.message || 'Failed to open DC');
        }
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.challan);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e3a5f] text-white">
          <div>
            <h3 className="text-base font-semibold">Open DC</h3>
            <p className="text-xs text-blue-200">Denim Crafts · Floor Ledger Entry</p>
          </div>
          <button
            onClick={handleClose}
            className="text-blue-200 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner: Immutability */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-3 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            <span className="font-bold">Strict Rule:</span> DC No cannot be changed after saving. Ensure the DC No matches the physical document.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {existingId && onJumpToExistingDc && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToExistingDc(existingId);
                  }}
                  className="font-bold underline flex items-center gap-1 text-red-900 shrink-0 hover:text-red-950"
                >
                  View Open DC <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date (default today) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Open Date (dd-mm-yyyy) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-[#1e3a5f] focus:outline-hidden"
              />
            </div>

            {/* DC No (manual typed, uppercase) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                DC No * <span className="text-[10px] text-slate-400 font-normal">(Immutable)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DC-ST-9050"
                value={dcNo}
                onChange={e => setDcNo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md uppercase font-mono tracking-wider focus:ring-2 focus:ring-[#1e3a5f] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Opening Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Opening Quantity (Pieces) *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 5000"
              value={openingQty}
              onChange={e => setOpeningQty(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono tabular-nums focus:ring-2 focus:ring-[#1e3a5f] focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              First row in diary ledger. Automatically placed in the In column.
            </p>
          </div>

          {/* Party (Factory / Stitching Line / Vendor) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Party / Stitching Line <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Line 1 - Front Stitching / Artistic Milliners"
              value={party}
              onChange={e => setParty(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-[#1e3a5f] focus:outline-hidden"
            />
          </div>

          {/* Article / Style */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Article / Fabric Style <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Indigo Selvedge 13.5oz Jeans"
              value={article}
              onChange={e => setArticle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-[#1e3a5f] focus:outline-hidden"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Cutting to Stitching Line 1 - Assembly Lot #44"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-[#1e3a5f] focus:outline-hidden resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#152a45] rounded-md transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Opening DC...' : 'Save & Open Ledger'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
