import React, { useState, useMemo } from 'react';
import {
  X,
  CreditCard,
  Smartphone,
  Mail,
  Calendar,
  Sparkles,
  Zap,
  Bell,
  Clock,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';
import {
  SubscriptionRecord,
  SubscriptionPreset,
  SubscriptionBillingCycle,
  SubscriptionCategory,
  SUBSCRIPTION_PRESETS,
  calculateExpiryDate,
  normalizeMonthlyAmount
} from '../types/subscription';
import { CardAccountRecord } from '../types/card';
import { BrandLogo } from './BrandLogos';

export function SubscriptionModal({
  initialSubscription,
  referenceDate,
  currencySymbol,
  cards,
  onClose,
  onSave
}: {
  initialSubscription: SubscriptionRecord | null;
  referenceDate: string;
  currencySymbol: string;
  cards?: CardAccountRecord[];
  onClose: () => void;
  onSave: (data: Omit<SubscriptionRecord, 'id' | 'createdAt'>) => void;
}) {
  const [name, setName] = useState(initialSubscription?.name || '');
  const [provider, setProvider] = useState(initialSubscription?.provider || '');
  const [category, setCategory] = useState<string>(
    initialSubscription?.category || 'Mobile & Telecom'
  );
  const [planName, setPlanName] = useState(initialSubscription?.planName || '');
  const [amount, setAmount] = useState(
    initialSubscription ? String(initialSubscription.amount) : ''
  );
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>(
    initialSubscription?.billingCycle || 'monthly'
  );
  const [customDays, setCustomDays] = useState<string>(
    initialSubscription?.customDays ? String(initialSubscription.customDays) : '28'
  );
  const [startDate, setStartDate] = useState(
    initialSubscription?.startDate || referenceDate
  );
  const [nextBillingDate, setNextBillingDate] = useState(
    initialSubscription?.nextBillingDate || referenceDate
  );
  const [expiryDate, setExpiryDate] = useState<string>(
    initialSubscription?.expiryDate ||
      initialSubscription?.nextBillingDate ||
      calculateExpiryDate(referenceDate, 'monthly')
  );
  const [autoPay, setAutoPay] = useState(
    initialSubscription !== null && initialSubscription !== undefined
      ? initialSubscription.autoPay
      : true
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initialSubscription?.paymentMethod || 'UPI AutoPay (PhonePe / GPay)'
  );
  const [mobileNumber, setMobileNumber] = useState(
    initialSubscription?.mobileNumber || ''
  );
  const [status, setStatus] = useState<'active' | 'paused' | 'cancelled'>(
    initialSubscription?.status || 'active'
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(
    initialSubscription?.reminderDaysBefore !== undefined
      ? initialSubscription.reminderDaysBefore
      : 2
  );
  const [autoCreateReminder, setAutoCreateReminder] = useState(
    initialSubscription !== null && initialSubscription !== undefined
      ? initialSubscription.autoCreateReminder
      : true
  );
  const [notes, setNotes] = useState(initialSubscription?.notes || '');
  const [errorMsg, setErrorMsg] = useState('');

  // Live calculated normalized monthly run rate
  const monthlyCalculatedExpense = useMemo(() => {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return 0;
    const days = billingCycle === 'custom_days' ? (Number(customDays) || 30) : undefined;
    return normalizeMonthlyAmount(num, billingCycle, days);
  }, [amount, billingCycle, customDays]);

  const handleApplyPreset = (preset: SubscriptionPreset) => {
    setName(preset.name);
    setProvider(preset.provider);
    setCategory(preset.category);
    setPlanName(preset.planName);
    setAmount(String(preset.amount));
    setBillingCycle(preset.billingCycle);
    if (preset.customDays) {
      setCustomDays(String(preset.customDays));
    }
    setAutoPay(preset.autoPay);
    setPaymentMethod(preset.paymentMethod);
    setReminderDaysBefore(preset.reminderDaysBefore);
    setAutoCreateReminder(true);
    setNotes(preset.notes);
    const exp = calculateExpiryDate(referenceDate, preset.billingCycle, preset.customDays);
    setNextBillingDate(exp);
    setExpiryDate(exp);
    setErrorMsg('');
  };

  const handleAutoCalculateExpiry = (cycleToUse = billingCycle, daysToUse = customDays) => {
    const baseDate = startDate || referenceDate;
    const cDays = cycleToUse === 'custom_days' ? (Number(daysToUse) || 30) : undefined;
    const computedExp = calculateExpiryDate(baseDate, cycleToUse, cDays);
    setExpiryDate(computedExp);
    if (!nextBillingDate || nextBillingDate === referenceDate) {
      setNextBillingDate(computedExp);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a subscription or mobile service name.');
      return;
    }
    if (!provider.trim()) {
      setErrorMsg('Please specify the service provider or carrier (e.g. Jio, Airtel, Netflix).');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0 || amount.trim() === '') {
      setErrorMsg('Please enter a valid price/recharge amount.');
      return;
    }
    if (!nextBillingDate) {
      setErrorMsg('Please select the next billing or renewal date.');
      return;
    }
    if (billingCycle === 'custom_days') {
      const parsedDays = Number(customDays);
      if (isNaN(parsedDays) || parsedDays <= 0) {
        setErrorMsg('Please enter a valid number of days for the custom cycle.');
        return;
      }
    }

    const numCustomDays = billingCycle === 'custom_days' ? (Number(customDays) || 30) : undefined;

    onSave({
      name: name.trim(),
      provider: provider.trim(),
      category: category.trim() || 'Mobile & Telecom',
      planName: planName.trim() || 'Standard Plan',
      amount: numAmount,
      billingCycle,
      customDays: numCustomDays,
      startDate: startDate || referenceDate,
      nextBillingDate,
      expiryDate: expiryDate || nextBillingDate,
      autoPay,
      paymentMethod: paymentMethod.trim() || (autoPay ? 'UPI AutoPay' : 'Manual Payment'),
      status,
      mobileNumber: mobileNumber.trim() || undefined,
      reminderDaysBefore: Number(reminderDaysBefore) || 2,
      autoCreateReminder,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8 text-[#F5F3EF]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#292A2F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D231B] border border-[#483728] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-[#F2BD91]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F5F3EF]">
                {initialSubscription ? 'Edit Subscription & Auto-Pay' : 'Add Mobile / Recurring Subscription'}
              </h2>
              <p className="text-xs text-[#A5A5A5]">
                Track automated debits, mobile recharges, and schedule payment alerts.
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

        {/* Quick Presets for 1-Click addition */}
        {!initialSubscription && (
          <div className="mb-4 p-3 rounded-xl bg-[#141518] border border-[#26272C]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F2BD91] mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Presets (Click to autofill)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {SUBSCRIPTION_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#1A1B20] hover:bg-[#2A2622] hover:border-[#F2BD91]/60 border border-[#2B2C35] text-[#D8D6D2] hover:text-[#F2BD91] transition-all flex items-center gap-2 group shadow-sm"
                >
                  <BrandLogo provider={preset.provider} size="xs" />
                  <span className="font-medium">{preset.provider}: {preset.name.split(' ')[1] || preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#341B1E] border border-[#4D262A] text-xs text-[#F27474]">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subscription Name */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">
                Subscription / Plan Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jio 5G Unlimited, Netflix Premium"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            {/* Provider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#A5A5A5]">
                  Service Provider / Carrier *
                </label>
                {provider.trim() && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#A5A5A5]">
                    <BrandLogo provider={provider} size="xs" />
                    <span className="capitalize">{provider}</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                required
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Jio, Airtel, Apple, Netflix, Google"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                <option value="Mobile & Telecom">📱 Mobile & Telecom (SIM / 5G / Fiber)</option>
                <option value="Entertainment & OTT">🎬 Entertainment & OTT (Streaming / Movies)</option>
                <option value="Music & Audio">🎵 Music & Audio (Spotify / Apple Music)</option>
                <option value="Cloud & Storage">☁️ Cloud & Storage (Google One / iCloud)</option>
                <option value="Productivity & AI">⚡ Productivity & AI (ChatGPT / Software)</option>
                <option value="Utilities">💡 Utilities & Household Bills</option>
                <option value="Other">📦 Other Recurring Services</option>
              </select>
            </div>

            {/* Plan / Pack Name */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Plan Details / Pack</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. 28-Day Unlimited 2GB/Day, 4K UHD"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            {/* Mobile / Email ID */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">
                Registered Mobile Number / Email ID (Optional)
              </label>
              <div className="relative">
                {mobileNumber.includes('@') ? (
                  <Mail className="w-4 h-4 text-[#F2BD91] absolute left-3 top-2.5" />
                ) : (
                  <Smartphone className="w-4 h-4 text-[#A5A5A5] absolute left-3 top-2.5" />
                )}
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210 or user@example.com"
                  className="w-full bg-[#141518] border border-[#292A2F] rounded-xl pl-9 pr-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">
                Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 349"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            {/* Billing Cycle */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Billing / Recharge Cycle *</label>
              <select
                value={billingCycle}
                onChange={(e) => {
                  const newCycle = e.target.value as SubscriptionBillingCycle;
                  setBillingCycle(newCycle);
                  handleAutoCalculateExpiry(newCycle, customDays);
                }}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                <option value="monthly">Monthly (Every month)</option>
                <option value="28_days">28 Days (Prepaid Mobile Recharge Cycle)</option>
                <option value="quarterly">Quarterly (Every 3 months / 84 days)</option>
                <option value="yearly">Yearly (Annual plan)</option>
                <option value="weekly">Weekly</option>
                <option value="custom_days">Custom Days (Enter exact days)</option>
              </select>
            </div>

            {/* Custom Days Input (shown when Custom Days is selected) */}
            {billingCycle === 'custom_days' && (
              <div>
                <label className="block text-xs text-[#A5A5A5] mb-1">
                  Custom Cycle (Number of Days) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    required
                    value={customDays}
                    onChange={(e) => {
                      setCustomDays(e.target.value);
                      handleAutoCalculateExpiry('custom_days', e.target.value);
                    }}
                    placeholder="e.g. 56, 84, 180"
                    className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#A5A5A5]">
                    Days
                  </span>
                </div>
              </div>
            )}

            {/* Next Billing Date */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">
                Next Billing / Renewal Date *
              </label>
              <input
                type="date"
                required
                value={nextBillingDate}
                onChange={(e) => {
                  setNextBillingDate(e.target.value);
                  if (!expiryDate || expiryDate === nextBillingDate) {
                    setExpiryDate(e.target.value);
                  }
                }}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            {/* Expiry Date Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#A5A5A5] flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#F2BD91]" />
                  <span>Plan Expiry Date</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleAutoCalculateExpiry()}
                  className="text-[10px] text-[#F2BD91] hover:underline"
                  title="Auto-calculate expiry date from cycle duration"
                >
                  Auto Calc (+{billingCycle === 'custom_days' ? `${Number(customDays) || 30}d` : billingCycle === '28_days' ? '28d' : billingCycle === 'quarterly' ? '90d' : billingCycle === 'yearly' ? '365d' : '30d'})
                </button>
              </div>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            {/* Calculated Expense Run-Rate Callout */}
            {Number(amount) > 0 && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-[#17181D] border border-[#2A2B34] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#F2BD91] shrink-0" />
                  <span className="text-[#A5A5A5]">
                    Calculated Expense Impact:
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F2BD91]">
                    {currencySymbol}{Math.round(monthlyCalculatedExpense).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-[#A5A5A5] ml-1 font-normal">/ month</span>
                  <span className="text-[10px] text-[#717278] ml-2 font-mono">
                    ({currencySymbol}{Math.round(monthlyCalculatedExpense * 12).toLocaleString('en-IN')} / year)
                  </span>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Payment Method / Channel</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                {cards && cards.length > 0 && (
                  <optgroup label="Your Saved Cards & Accounts">
                    {cards.map((c) => (
                      <option key={c.id} value={`${c.name} (•••• ${c.last4})`}>
                        {c.type === 'debit_card' ? '🏧 ' : c.type === 'savings_account' ? '🏦 ' : '💳 '}
                        {c.name} ({c.type === 'debit_card' ? 'Debit' : c.type === 'savings_account' ? 'Savings' : 'Credit'} •••• {c.last4})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="General Channels">
                  <option value="UPI AutoPay (PhonePe / GPay / Paytm)">UPI AutoPay (PhonePe / GPay / Paytm)</option>
                  <option value="Credit Card Auto-Debit">Credit Card Auto-Debit</option>
                  <option value="Debit Card Auto-Debit">Debit Card Auto-Debit</option>
                  <option value="Apple ID / App Store">Apple ID / App Store</option>
                  <option value="Google Play AutoPay">Google Play AutoPay</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Manual UPI / Payment">Manual UPI / Recharge</option>
                </optgroup>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Subscription Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'paused' | 'cancelled')}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                <option value="active">Active (Ongoing)</option>
                <option value="paused">Paused (Temporarily halted)</option>
                <option value="cancelled">Cancelled (Do not renew)</option>
              </select>
            </div>
          </div>

          {/* Auto-Pay & Automated Reminders Section */}
          <div className="p-4 rounded-xl bg-[#141518] border border-[#2A2B32] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoPay ? 'bg-[#152B1F] text-[#58C286]' : 'bg-[#29241B] text-[#E08B6B]'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#F5F3EF]">
                    Auto-Pay / Auto-Debit Enabled
                  </div>
                  <div className="text-xs text-[#A5A5A5]">
                    {autoPay
                      ? 'Payment will be charged automatically on renewal date'
                      : 'Requires manual recharge or payment action'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPay}
                onChange={(e) => setAutoPay(e.target.checked)}
                className="w-5 h-5 accent-[#F2BD91] rounded cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-[#24252B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-[#D8D6D2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateReminder}
                  onChange={(e) => setAutoCreateReminder(e.target.checked)}
                  className="w-4 h-4 accent-[#F2BD91] rounded"
                />
                <Bell className="w-3.5 h-3.5 text-[#F2BD91]" />
                <span>Create automated alert in Reminders tab</span>
              </label>

              {autoCreateReminder && (
                <div className="flex items-center gap-2 text-xs text-[#A5A5A5]">
                  <span>Remind me:</span>
                  <select
                    value={reminderDaysBefore}
                    onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                    className="bg-[#1B1D22] border border-[#30313A] rounded-lg px-2.5 py-1 text-xs text-[#F5F3EF] focus:outline-none"
                  >
                    <option value={1}>1 day before</option>
                    <option value={2}>2 days before</option>
                    <option value={3}>3 days before</option>
                    <option value={5}>5 days before</option>
                    <option value={7}>7 days before</option>
                    <option value={0}>On the renewal date</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1">Notes / Account Reference</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Card ending 4821, cancel before trial ends, SIM slot 1..."
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#292A2F]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#25262C] hover:bg-[#303138] text-xs font-semibold text-[#F5F3EF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] text-xs font-semibold shadow-lg shadow-black/20 transition-all active:scale-[0.98]"
            >
              {initialSubscription ? 'Update Subscription' : 'Add Subscription & Auto-Pay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
