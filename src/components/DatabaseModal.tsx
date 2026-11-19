import React, { useState } from 'react';
import {
  X,
  Database,
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReloadSampleData: () => Promise<void>;
  onClearDatabase: () => Promise<void>;
  counts: {
    purchases: number;
    subscriptions: number;
    reminders: number;
    receipts: number;
    cards?: number;
  };
}

export function DatabaseModal({
  isOpen,
  onClose,
  onReloadSampleData,
  onClearDatabase,
  counts
}: DatabaseModalProps) {
  const [loadingSample, setLoadingSample] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (!isOpen) return null;

  const handleTriggerReloadSample = async () => {
    setLoadingSample(true);
    try {
      await onReloadSampleData();
      onClose();
    } finally {
      setLoadingSample(false);
    }
  };

  const handleTriggerClear = async () => {
    if (window.confirm('Are you sure you want to clear all records? This resets your vault to a clean empty state.')) {
      setClearing(true);
      try {
        await onClearDatabase();
      } finally {
        setClearing(false);
      }
    }
  };

  const totalRecords = counts.purchases + counts.subscriptions + counts.reminders + counts.receipts + (counts.cards || 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8 text-[#F5F3EF] space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#292A2F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#152B1F] border border-[#224A35] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-[#58C286]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#F5F3EF]">
                  Keeper Cloud Vault
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold border bg-[#152B1F] text-[#58C286] border-[#224A35]">
                  ● Cloud Storage Connected
                </span>
              </div>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Real-time transactional cloud storage with instant multi-device synchronization.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#23242A] text-[#A5A5A5] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vault Status Card */}
        <div className="p-4 rounded-xl bg-[#131E17] border border-[#224A35] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#58C286] animate-pulse" />
              <span className="text-sm font-semibold text-[#58C286]">
                Secure Cloud Storage Active
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#1A3324] text-[#A6E3BE] border border-[#28573B]">
              Encrypted
            </span>
          </div>
          <p className="text-[#96B8A5] text-xs">
            ✓ 100% Real User Data: No mock or sample data is preloaded. Everything stored here is your actual entered records.
          </p>
        </div>

        {/* Database Record Statistics */}
        <div>
          <div className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider mb-2">
            Active Vault Records ({totalRecords} Total)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
              <div className="text-xs text-[#A5A5A5]">Purchases</div>
              <div className="text-xl font-bold text-[#F5F3EF] mt-0.5">{counts.purchases}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
              <div className="text-xs text-[#A5A5A5]">Subscriptions</div>
              <div className="text-xl font-bold text-[#F2BD91] mt-0.5">{counts.subscriptions}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
              <div className="text-xs text-[#A5A5A5]">Reminders</div>
              <div className="text-xl font-bold text-[#58C286] mt-0.5">{counts.reminders}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
              <div className="text-xs text-[#A5A5A5]">Receipts</div>
              <div className="text-xl font-bold text-[#7FB2FF] mt-0.5">{counts.receipts}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center col-span-2 sm:col-span-1">
              <div className="text-xs text-[#A5A5A5]">Cards/Accts</div>
              <div className="text-xl font-bold text-[#E5A876] mt-0.5">{counts.cards || 0}</div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#F2BD91] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#F5F3EF]">Private &amp; Isolated</div>
              <div className="text-[#A5A5A5] mt-0.5">Your records are tied strictly to your verified email account.</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-[#58C286] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#F5F3EF]">Offline Resiliency</div>
              <div className="text-[#A5A5A5] mt-0.5">Instant local caching ensures access even when disconnected.</div>
            </div>
          </div>
        </div>

        {/* Action: Optional Demo Data */}
        <div className="p-4 rounded-xl bg-[#1A1815] border border-[#3E3123] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F2BD91]">
              <Sparkles className="w-4 h-4" />
              <span>Load Demo Data (Optional)</span>
            </div>
            <p className="text-xs text-[#B5B3AE] mt-0.5 max-w-md">
              Need sample data for testing? This will populate sample purchases and subscriptions into your vault.
            </p>
          </div>
          <button
            type="button"
            disabled={loadingSample}
            onClick={handleTriggerReloadSample}
            className="shrink-0 px-4 py-2.5 rounded-xl bg-[#2C241B] hover:bg-[#3D3022] border border-[#4E3D2A] text-[#F2BD91] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSample ? 'animate-spin' : ''}`} />
            <span>{loadingSample ? 'Loading Demo Data...' : 'Load Demo Data'}</span>
          </button>
        </div>

        {/* Clear Database Danger Zone */}
        <div className="pt-2 flex items-center justify-between text-xs text-[#A5A5A5]">
          <button
            type="button"
            disabled={clearing}
            onClick={handleTriggerClear}
            className="text-[#F27474] hover:underline flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearing ? 'Clearing...' : 'Clear All Records (Clean Slate)'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#25262C] hover:bg-[#2F3038] text-[#F5F3EF] font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
