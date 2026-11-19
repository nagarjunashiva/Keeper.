import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Smartphone,
  Mail,
  Plus,
  Search,
  Filter,
  Zap,
  Bell,
  Clock,
  Sparkles,
  ArrowUpDown,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Repeat,
  Calendar
} from 'lucide-react';
import {
  SubscriptionRecord,
  SubscriptionPreset,
  SubscriptionBillingCycle,
  SUBSCRIPTION_PRESETS,
  normalizeMonthlyAmount,
  getBillingCycleLabel
} from '../types/subscription';
import { BrandLogo } from './BrandLogos';

export function SubscriptionsView({
  subscriptions,
  referenceDate,
  currencySymbol,
  onOpenAddModal,
  onEditSubscription,
  onDeleteSubscription,
  onToggleAutoPay,
  onToggleStatus,
  onApplyPreset
}: {
  subscriptions: SubscriptionRecord[];
  referenceDate: string;
  currencySymbol: string;
  onOpenAddModal: () => void;
  onEditSubscription: (sub: SubscriptionRecord) => void;
  onDeleteSubscription: (sub: SubscriptionRecord) => void;
  onToggleAutoPay: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onApplyPreset: (preset: SubscriptionPreset) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [autoPayFilter, setAutoPayFilter] = useState<'All' | 'autopay' | 'manual'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'paused' | 'cancelled'>('All');
  const [sortBy, setSortBy] = useState<'date' | 'price_desc' | 'price_asc' | 'name'>('date');

  // Date difference helper
  const getDaysUntil = (targetDateStr: string): number => {
    if (!targetDateStr) return 0;
    const [ty, tm, td] = targetDateStr.split('-').map(Number);
    const [ry, rm, rd] = referenceDate.split('-').map(Number);
    const target = new Date(ty, tm - 1, td);
    const ref = new Date(ry, rm - 1, rd);
    return Math.round((target.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Metrics summary
  const metrics = useMemo(() => {
    let monthlyRunRate = 0;
    let activeCount = 0;
    let autoPayCount = 0;
    let upcomingDueCount = 0;

    subscriptions.forEach((sub) => {
      if (sub.status === 'active') {
        activeCount += 1;
        monthlyRunRate += normalizeMonthlyAmount(sub.amount, sub.billingCycle, sub.customDays);
        if (sub.autoPay) {
          autoPayCount += 1;
        }
        const days = getDaysUntil(sub.nextBillingDate);
        if (days >= 0 && days <= 7) {
          upcomingDueCount += 1;
        }
      }
    });

    const annualRunRate = monthlyRunRate * 12;

    return {
      monthlyRunRate: Math.round(monthlyRunRate),
      annualRunRate: Math.round(annualRunRate),
      activeCount,
      autoPayCount,
      upcomingDueCount
    };
  }, [subscriptions, referenceDate]);

  // Filtered & sorted subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = sub.name.toLowerCase().includes(q);
          const matchProvider = sub.provider.toLowerCase().includes(q);
          const matchPlan = sub.planName.toLowerCase().includes(q);
          const matchMobile = sub.mobileNumber ? sub.mobileNumber.toLowerCase().includes(q) : false;
          const matchNotes = sub.notes ? sub.notes.toLowerCase().includes(q) : false;
          if (!matchName && !matchProvider && !matchPlan && !matchMobile && !matchNotes) {
            return false;
          }
        }
        if (categoryFilter !== 'All' && sub.category !== categoryFilter) {
          return false;
        }
        if (autoPayFilter === 'autopay' && !sub.autoPay) {
          return false;
        }
        if (autoPayFilter === 'manual' && sub.autoPay) {
          return false;
        }
        if (statusFilter !== 'All' && sub.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return a.nextBillingDate.localeCompare(b.nextBillingDate);
        }
        if (sortBy === 'price_desc') {
          return b.amount - a.amount;
        }
        if (sortBy === 'price_asc') {
          return a.amount - b.amount;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [subscriptions, searchQuery, categoryFilter, autoPayFilter, statusFilter, sortBy]);

  // Format date helper
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d).padStart(2, '0')} ${months[(m || 1) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
            RECURRING BILLS & AUTO-PAY
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
            Subscriptions & Auto-Pay
          </h1>
          <p className="text-sm text-[#A5A5A5] mt-0.5">
            Manage your mobile recharges, OTT streaming, and auto-debit bills with automated payment alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-black/30 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.4]" />
          <span>New Subscription</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#2D231B] border border-[#483728] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-[#F2BD91]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#A5A5A5]">Monthly Spend</div>
            <div className="text-xl font-semibold text-[#F5F3EF] truncate">
              {currencySymbol}{metrics.monthlyRunRate.toLocaleString('en-IN')}<span className="text-xs text-[#8E8F94] font-normal">/mo</span>
            </div>
          </div>
        </div>

        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1E2522] border border-[#2F3D36] flex items-center justify-center shrink-0">
            <Repeat className="w-5 h-5 text-[#58C286]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#A5A5A5]">Annual Run-Rate</div>
            <div className="text-xl font-semibold text-[#F5F3EF] truncate">
              {currencySymbol}{metrics.annualRunRate.toLocaleString('en-IN')}<span className="text-xs text-[#8E8F94] font-normal">/yr</span>
            </div>
          </div>
        </div>

        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1A222D] border border-[#283849] flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-[#7FB2FF]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#A5A5A5]">Active Services</div>
            <div className="text-xl font-semibold text-[#F5F3EF]">
              {metrics.activeCount}
            </div>
          </div>
        </div>

        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#251F19] border border-[#3D3025] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-[#E6B58A]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#A5A5A5]">Auto-Pay Active</div>
            <div className="text-xl font-semibold text-[#F5F3EF]">
              {metrics.autoPayCount}
            </div>
          </div>
        </div>

        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${metrics.upcomingDueCount > 0 ? 'bg-[#311E1D] border-[#532E2C]' : 'bg-[#212228] border-[#303138]'}`}>
            <Bell className={`w-5 h-5 ${metrics.upcomingDueCount > 0 ? 'text-[#F27474]' : 'text-[#A5A5A5]'}`} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#A5A5A5]">Due in 7 Days</div>
            <div className="text-xl font-semibold text-[#F5F3EF]">
              {metrics.upcomingDueCount}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Presets Bar */}
      <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-[#F2BD91]" />
          <span className="text-xs font-semibold text-[#F5F3EF] uppercase tracking-wider">
            Quick Add Popular Mobile & Digital Plans
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {SUBSCRIPTION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-[#141518] hover:bg-[#2B2723] hover:border-[#F2BD91]/50 border border-[#26272D] text-[#D0CECA] hover:text-[#F2BD91] transition-all flex items-center gap-2 shadow-sm"
            >
              <BrandLogo provider={preset.provider} size="xs" />
              <span className="font-medium">{preset.provider} {preset.name.split(' ')[1] || ''}</span>
              <span className="text-[#8E8F94]">({currencySymbol}{preset.amount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#A5A5A5] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subscription, carrier, mobile number, plan..."
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#A5A5A5]" />
              <select
                aria-label="Filter by subscription category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#141518] border border-[#292A2F] rounded-xl px-2.5 py-1.5 text-xs text-[#F5F3EF] focus:outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Mobile & Telecom">Mobile & Telecom</option>
                <option value="Entertainment & OTT">Entertainment & OTT</option>
                <option value="Music & Audio">Music & Audio</option>
                <option value="Cloud & Storage">Cloud & Storage</option>
                <option value="Productivity & AI">Productivity & AI</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Auto-Pay Filter */}
            <select
              aria-label="Filter by auto-pay status"
              value={autoPayFilter}
              onChange={(e) => setAutoPayFilter(e.target.value as 'All' | 'autopay' | 'manual')}
              className="bg-[#141518] border border-[#292A2F] rounded-xl px-2.5 py-1.5 text-xs text-[#F5F3EF] focus:outline-none cursor-pointer"
            >
              <option value="All">All Payment Modes</option>
              <option value="autopay">⚡ Auto-Pay Active</option>
              <option value="manual">✋ Manual Payment</option>
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filter by active status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | 'active' | 'paused' | 'cancelled')}
              className="bg-[#141518] border border-[#292A2F] rounded-xl px-2.5 py-1.5 text-xs text-[#F5F3EF] focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#A5A5A5]" />
              <select
                aria-label="Sort subscriptions"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'price_desc' | 'price_asc' | 'name')}
                className="bg-[#141518] border border-[#292A2F] rounded-xl px-2.5 py-1.5 text-xs text-[#F5F3EF] focus:outline-none cursor-pointer"
              >
                <option value="date">Next Due Date</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="price_asc">Price (Low to High)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Cards Grid */}
      {filteredSubscriptions.length === 0 ? (
        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-[#A5A5A5] mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-[#F5F3EF]">No subscriptions found</h3>
          <p className="text-xs text-[#A5A5A5] mt-1 max-w-md mx-auto">
            {subscriptions.length === 0
              ? 'Add your mobile recharge, streaming subscriptions, and recurring utility bills to track automatic debits and avoid missed recharges.'
              : 'No subscriptions match your current filter criteria.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Subscription</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubscriptions.map((sub) => {
            const daysLeft = getDaysUntil(sub.nextBillingDate);
            const isDueSoon = daysLeft >= 0 && daysLeft <= 3;
            const isOverdue = daysLeft < 0;

            return (
              <div
                key={sub.id}
                className="bg-[#191A1E] border border-[#292A2F] hover:border-[#3D3E47] rounded-2xl p-5 flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <BrandLogo provider={sub.provider} size="md" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#F5F3EF] truncate group-hover:text-[#F2BD91] transition-colors">
                          {sub.name}
                        </div>
                        <div className="text-xs text-[#8E8F94] truncate">
                          {sub.provider} &bull; {sub.planName}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium shrink-0 border ${
                        sub.status === 'active'
                          ? 'bg-[#152B1F] text-[#58C286] border-[#224A35]'
                          : sub.status === 'paused'
                          ? 'bg-[#2E241A] text-[#E0A865] border-[#4B3926]'
                          : 'bg-[#2A1D1E] text-[#F27474] border-[#4B292B]'
                      }`}
                    >
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </div>

                  {/* Mobile number or Email ID pill if available */}
                  {sub.mobileNumber && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141518] border border-[#2B2C33] text-xs text-[#A5A5A5] mb-3">
                      {sub.mobileNumber.includes('@') ? (
                        <Mail className="w-3 h-3 text-[#F2BD91]" />
                      ) : (
                        <Smartphone className="w-3 h-3 text-[#58C286]" />
                      )}
                      <span>{sub.mobileNumber}</span>
                    </div>
                  )}

                  {/* Price Row */}
                  <div className="flex items-baseline gap-1.5 my-2">
                    <span className="text-2xl font-bold text-[#F5F3EF]">
                      {currencySymbol}{sub.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-[#A5A5A5]">
                      {getBillingCycleLabel(sub.billingCycle, sub.customDays)}
                    </span>
                    {sub.billingCycle !== 'monthly' && (
                      <span className="text-[11px] text-[#A5A5A5] ml-1 font-mono">
                        (~{currencySymbol}{Math.round(normalizeMonthlyAmount(sub.amount, sub.billingCycle, sub.customDays)).toLocaleString('en-IN')}/mo)
                      </span>
                    )}
                  </div>

                  {/* Auto-Pay & Payment Channel Badge */}
                  <div className="flex flex-wrap items-center gap-2 my-2.5">
                    <div
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${
                        sub.autoPay
                          ? 'bg-[#152B1F] text-[#58C286] border-[#204732]'
                          : 'bg-[#25262C] text-[#A5A5A5] border-[#31323B]'
                      }`}
                    >
                      <Zap className={`w-3 h-3 ${sub.autoPay ? 'text-[#58C286]' : 'text-[#8E8F94]'}`} />
                      <span>{sub.autoPay ? 'Auto-Pay Active' : 'Manual Payment'}</span>
                    </div>

                    <span className="text-[11px] text-[#8E8F94] truncate max-w-[170px]" title={sub.paymentMethod}>
                      {sub.paymentMethod}
                    </span>
                  </div>

                  {/* Next Billing Due Banner */}
                  <div
                    className={`p-3 rounded-xl border mt-3 text-xs flex items-center justify-between ${
                      isOverdue
                        ? 'bg-[#311A1C] border-[#532629] text-[#F27474]'
                        : isDueSoon
                        ? 'bg-[#2E2018] border-[#4E3224] text-[#F2BD91]'
                        : 'bg-[#141518] border-[#26272E] text-[#D0CECA]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <div>
                        <span className="font-medium">
                          {isOverdue
                            ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'}`
                            : daysLeft === 0
                            ? 'Renews / Debits Today'
                            : daysLeft === 1
                            ? 'Debits Tomorrow'
                            : `Next debit in ${daysLeft} days`}
                        </span>
                        <div className="text-[11px] opacity-75">
                          {formatDateDisplay(sub.nextBillingDate)}
                        </div>
                      </div>
                    </div>

                    {sub.autoCreateReminder && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded bg-black/30 border border-white/10 text-white/90 flex items-center gap-1"
                        title={`Alert scheduled ${sub.reminderDaysBefore} days before`}
                      >
                        <Bell className="w-2.5 h-2.5 text-[#F2BD91]" />
                        <span>-{sub.reminderDaysBefore}d</span>
                      </span>
                    )}
                  </div>

                  {/* Plan Expiry Date Badge */}
                  {sub.expiryDate && (
                    <div className="flex items-center justify-between text-[11px] mt-2 px-1 text-[#A5A5A5] bg-[#141518]/60 py-1.5 px-2.5 rounded-lg border border-[#23242A]">
                      <span className="flex items-center gap-1.5 text-[#8E8F94]">
                        <Calendar className="w-3 h-3 text-[#F2BD91]" />
                        <span>Plan Validity / Expiry:</span>
                      </span>
                      <span className="font-semibold text-[#F5F3EF]">
                        {formatDateDisplay(sub.expiryDate)}
                      </span>
                    </div>
                  )}

                  {sub.notes && (
                    <p className="text-xs text-[#8E8F94] mt-2 line-clamp-1 italic">
                      "{sub.notes}"
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#26272C]">
                  <div className="flex items-center gap-1.5">
                    {/* Toggle Auto-Pay */}
                    <button
                      type="button"
                      onClick={() => onToggleAutoPay(sub.id)}
                      title={sub.autoPay ? 'Disable Auto-Pay' : 'Enable Auto-Pay'}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                        sub.autoPay
                          ? 'bg-[#19221C] text-[#58C286] border-[#223F30] hover:bg-[#202E25]'
                          : 'bg-[#23242A] text-[#A5A5A5] border-[#31323A] hover:text-white'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{sub.autoPay ? 'Auto-Pay ON' : 'Turn Auto-Pay ON'}</span>
                    </button>

                    {/* Toggle Status (Pause / Resume) */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(sub.id)}
                      title={sub.status === 'active' ? 'Pause Subscription' : 'Resume Subscription'}
                      className="p-1.5 rounded-lg bg-[#222328] hover:bg-[#2C2D34] text-[#A5A5A5] hover:text-[#F5F3EF]"
                    >
                      {sub.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditSubscription(sub)}
                      title="Edit Subscription"
                      className="p-1.5 rounded-lg bg-[#222328] hover:bg-[#2C2D34] text-[#A5A5A5] hover:text-white"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSubscription(sub)}
                      title="Delete Subscription"
                      className="p-1.5 rounded-lg bg-[#222328] hover:bg-[#341B1E] text-[#A5A5A5] hover:text-[#F27474]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
