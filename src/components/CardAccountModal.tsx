import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building,
  Calendar,
  Check,
  ShieldCheck,
  Sparkles,
  Lock,
  Wallet,
  Landmark,
  ArrowRight,
  Shield
} from 'lucide-react';
import {
  CardAccountRecord,
  AccountType,
  CardColorTheme,
  CREDIT_CARD_PRESETS,
  DEBIT_CARD_PRESETS,
  SAVINGS_ACCOUNT_PRESETS,
  BankPreset,
  getCardGradient
} from '../types/card';

interface CardAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: Omit<CardAccountRecord, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  editingCard?: CardAccountRecord | null;
  currencySymbol: string;
}

export function CardAccountModal({
  isOpen,
  onClose,
  onSave,
  editingCard,
  currencySymbol
}: CardAccountModalProps) {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('HDFC Bank');
  const [type, setType] = useState<AccountType>('credit_card');
  const [last4, setLast4] = useState('');
  const [expiryMMYY, setExpiryMMYY] = useState('');
  const [billingDueDate, setBillingDueDate] = useState<number | ''>('');
  const [statementDate, setStatementDate] = useState<number | ''>('');
  const [creditLimit, setCreditLimit] = useState<number | ''>('');
  const [dailyLimit, setDailyLimit] = useState<number | ''>('');
  const [linkedAccountType, setLinkedAccountType] = useState('Salary Account');
  const [currentBalanceOrSavings, setCurrentBalanceOrSavings] = useState<number | ''>('');
  const [savingsGoal, setSavingsGoal] = useState<number | ''>('');
  const [cardColor, setCardColor] = useState<CardColorTheme>('sapphire');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingCard) {
      setName(editingCard.name);
      setBank(editingCard.bank);
      setType(editingCard.type);
      setLast4(editingCard.last4);
      setExpiryMMYY(editingCard.expiryMMYY || '');
      setBillingDueDate(editingCard.billingDueDate || '');
      setStatementDate(editingCard.statementDate || '');
      setCreditLimit(editingCard.creditLimit || '');
      setDailyLimit(editingCard.dailyLimit || '');
      setLinkedAccountType(editingCard.linkedAccountType || 'Salary Account');
      setCurrentBalanceOrSavings(editingCard.currentBalanceOrSavings || '');
      setSavingsGoal(editingCard.savingsGoal || '');
      setCardColor(editingCard.cardColor || 'sapphire');
      setNotes(editingCard.notes || '');
    } else {
      setName('HDFC Millennia Credit Card');
      setBank('HDFC Bank');
      setType('credit_card');
      setLast4('4821');
      setExpiryMMYY('08/28');
      setBillingDueDate(5);
      setStatementDate(15);
      setCreditLimit(150000);
      setDailyLimit(50000);
      setLinkedAccountType('Salary Account');
      setCurrentBalanceOrSavings('');
      setSavingsGoal('');
      setCardColor('sapphire');
      setNotes('');
    }
  }, [isOpen, editingCard]);

  if (!isOpen) return null;

  // Smart switching between Credit Card, Debit Card, and Savings Account
  const handleTypeChange = (newType: AccountType) => {
    if (newType === type) return;
    const oldType = type;
    setType(newType);

    // Intelligently adapt the card/account label so "Credit Card" doesn't stick when switching to Debit
    setName((prevName) => {
      let updated = prevName;
      if (newType === 'debit_card') {
        if (/credit card/i.test(updated)) {
          updated = updated.replace(/credit card/gi, 'Debit Card');
        } else if (/credit/i.test(updated)) {
          updated = updated.replace(/credit/gi, 'Debit');
        } else if (/savings account/i.test(updated)) {
          updated = updated.replace(/savings account/gi, 'Debit Card');
        } else if (!/debit/i.test(updated)) {
          updated = `${updated} Debit Card`;
        }
      } else if (newType === 'credit_card') {
        if (/debit card/i.test(updated)) {
          updated = updated.replace(/debit card/gi, 'Credit Card');
        } else if (/debit/i.test(updated)) {
          updated = updated.replace(/debit/gi, 'Credit');
        } else if (/savings account/i.test(updated)) {
          updated = updated.replace(/savings account/gi, 'Credit Card');
        } else if (!/credit/i.test(updated)) {
          updated = `${updated} Credit Card`;
        }
      } else if (newType === 'savings_account') {
        if (/credit card/i.test(updated)) {
          updated = updated.replace(/credit card/gi, 'Savings Account');
        } else if (/debit card/i.test(updated)) {
          updated = updated.replace(/debit card/gi, 'Savings Account');
        } else if (!/account/i.test(updated)) {
          updated = `${updated} Savings Account`;
        }
      }
      return updated.replace(/\s+/g, ' ').trim();
    });

    // Auto-adjust default color if default was chosen
    if (!editingCard) {
      if (newType === 'debit_card') {
        setCardColor('ruby');
        if (!dailyLimit) setDailyLimit(75000);
      } else if (newType === 'savings_account') {
        setCardColor('emerald');
      } else if (newType === 'credit_card') {
        setCardColor('sapphire');
        if (!creditLimit) setCreditLimit(150000);
      }
    }
  };

  const handleApplyPreset = (preset: BankPreset) => {
    setName(preset.name);
    setBank(preset.bank);
    setType(preset.type);
    setCardColor(preset.cardColor);
    if (preset.creditLimit) setCreditLimit(preset.creditLimit);
    if (preset.dailyLimit) setDailyLimit(preset.dailyLimit);
    if (preset.linkedAccountType) setLinkedAccountType(preset.linkedAccountType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: editingCard?.id,
        name: name.trim() || (type === 'debit_card' ? 'My Debit Card' : type === 'savings_account' ? 'Savings Account' : 'My Credit Card'),
        bank: bank.trim() || 'Bank',
        type,
        last4: (last4.replace(/\D/g, '') || '0000').slice(-4).padStart(4, '0'),
        expiryMMYY: type === 'savings_account' ? '' : expiryMMYY.trim(),
        billingDueDate: type === 'credit_card' && typeof billingDueDate === 'number' ? billingDueDate : 0,
        statementDate: type === 'credit_card' && typeof statementDate === 'number' ? statementDate : 0,
        creditLimit: type === 'credit_card' && typeof creditLimit === 'number' ? creditLimit : 0,
        dailyLimit: type === 'debit_card' && typeof dailyLimit === 'number' ? dailyLimit : 0,
        linkedAccountType: type === 'debit_card' ? linkedAccountType : undefined,
        currentBalanceOrSavings: typeof currentBalanceOrSavings === 'number' ? currentBalanceOrSavings : 0,
        savingsGoal: type === 'savings_account' && typeof savingsGoal === 'number' ? savingsGoal : 0,
        expenses: editingCard?.expenses || [],
        cardColor,
        notes: notes.trim()
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const gradientClass = getCardGradient(cardColor);

  // Active presets based on selected Account Type
  const activePresets =
    type === 'debit_card'
      ? DEBIT_CARD_PRESETS
      : type === 'savings_account'
      ? SAVINGS_ACCOUNT_PRESETS
      : CREDIT_CARD_PRESETS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-hidden bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141518] border border-[#292A2F] rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#25262B] flex items-center justify-between shrink-0 bg-[#18191E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25201C] border border-[#3E3127] flex items-center justify-center">
              {type === 'debit_card' ? (
                <CreditCard className="w-5 h-5 text-[#5CE095]" />
              ) : type === 'savings_account' ? (
                <Landmark className="w-5 h-5 text-[#7FB2FF]" />
              ) : (
                <CreditCard className="w-5 h-5 text-[#F2BD91]" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#F5F3EF]">
                {editingCard
                  ? `Edit ${type === 'debit_card' ? 'Debit Card' : type === 'savings_account' ? 'Bank Account' : 'Credit Card'}`
                  : `Add ${type === 'debit_card' ? 'Debit Card' : type === 'savings_account' ? 'Bank Account' : 'Credit Card'}`}
              </h2>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Zero-credential organizer with zero PINs, passwords, or full card numbers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#25262B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {/* Prominent Account Type Segmented Switcher */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A5A5A5] mb-1.5">
              Account Category
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#191A1E] border border-[#292A2F]">
              <button
                type="button"
                onClick={() => handleTypeChange('credit_card')}
                className={`py-2 px-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all ${
                  type === 'credit_card'
                    ? 'bg-[#29221B] text-[#F2BD91] border border-[#4E3929] shadow-sm font-semibold'
                    : 'text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#202127]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Credit Card</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('debit_card')}
                className={`py-2 px-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all ${
                  type === 'debit_card'
                    ? 'bg-[#152B1E] text-[#5CE095] border border-[#234A35] shadow-sm font-semibold'
                    : 'text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#202127]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-[#5CE095]" />
                <span>Debit Card</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('savings_account')}
                className={`py-2 px-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all ${
                  type === 'savings_account'
                    ? 'bg-[#1A2536] text-[#7FB2FF] border border-[#284163] shadow-sm font-semibold'
                    : 'text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#202127]'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Savings A/C</span>
              </button>
            </div>
          </div>

          {/* Live Photorealistic Card Replica */}
          <div className="relative">
            <div
              className={`w-full aspect-[1.7/1] max-w-[340px] mx-auto rounded-2xl p-4 sm:p-5 bg-gradient-to-br border shadow-xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${gradientClass}`}
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              {/* Card Top Row: Bank & Chip/Badge */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold opacity-70">
                    {bank || 'Bank Name'}
                  </div>
                  <div className="text-xs sm:text-sm font-bold tracking-tight mt-0.5 line-clamp-1">
                    {name || (type === 'debit_card' ? 'Debit Card' : type === 'savings_account' ? 'Bank Account' : 'Credit Card')}
                  </div>
                </div>

                {/* EMV Chip & Type Foil Badge */}
                <div className="flex items-center gap-2">
                  {type !== 'savings_account' && (
                    <div className="w-6 h-4 sm:w-7 sm:h-5 rounded bg-gradient-to-r from-[#D4AF37] to-[#AA771C] border border-[#FFE082]/40 shadow-sm opacity-90" />
                  )}
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border backdrop-blur-sm ${
                      type === 'debit_card'
                        ? 'bg-emerald-500/20 text-[#72E8A6] border-emerald-400/40'
                        : type === 'savings_account'
                        ? 'bg-blue-500/20 text-[#93C5FD] border-blue-400/40'
                        : 'bg-amber-500/20 text-[#F2BD91] border-amber-400/40'
                    }`}
                  >
                    {type === 'debit_card' ? 'DEBIT' : type === 'savings_account' ? 'BANK A/C' : 'CREDIT'}
                  </span>
                </div>
              </div>

              {/* Masked Digits */}
              <div className="my-auto py-1">
                {type === 'savings_account' ? (
                  <div className="font-mono text-xs sm:text-sm tracking-wider font-semibold opacity-90">
                    A/C &nbsp;•••• &nbsp;•••• &nbsp;{last4 || '0000'}
                  </div>
                ) : (
                  <div className="font-mono text-sm sm:text-base tracking-[0.25em] font-semibold opacity-90">
                    •••• &nbsp;•••• &nbsp;•••• &nbsp;{last4 || '0000'}
                  </div>
                )}
              </div>

              {/* Card Bottom Row: Details & Expiry */}
              <div className="flex items-end justify-between text-xs">
                <div>
                  <div className="text-[8px] uppercase tracking-wider opacity-60">
                    {type === 'debit_card' ? 'Card Type' : type === 'savings_account' ? 'Account Type' : 'Account Type'}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">
                    {type.replace('_', ' ')}
                  </div>
                </div>

                {type !== 'savings_account' ? (
                  <div className="text-right">
                    <div className="text-[8px] uppercase tracking-wider opacity-60">Valid Thru</div>
                    <div className="font-mono text-xs font-semibold mt-0.5">
                      {expiryMMYY || 'MM/YY'}
                    </div>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="text-[8px] uppercase tracking-wider opacity-60">Status</div>
                    <div className="text-[11px] font-semibold text-[#5CE095]">Active</div>
                  </div>
                )}
              </div>
            </div>

            {/* Zero Credential Security Guarantee */}
            <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-[#5CE095]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-credential security: No PINs, CVVs, or full numbers requested or saved.</span>
            </div>
          </div>

          {/* Quick Contextual Presets (with clean dark scrollbar) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-[#A5A5A5]">
                Popular {type === 'debit_card' ? 'Debit Card' : type === 'savings_account' ? 'Savings Account' : 'Credit Card'} Presets
              </label>
              <span className="text-[10px] text-[#6E707A]">Tap to auto-fill</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {activePresets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-lg bg-[#191A1E] hover:bg-[#25262C] border border-[#292A2F] hover:border-[#3D3E47] text-[#C5C5CB] shrink-0 text-[11px] transition-colors"
                >
                  {p.name.replace(/credit card|debit card|savings account|account/gi, '').trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Card Label & Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1">
                {type === 'savings_account' ? 'Account Label / Name' : 'Card / Account Name'}{' '}
                <span className="text-[#F2BD91]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  type === 'debit_card'
                    ? 'e.g. HDFC Salary Platinum Debit'
                    : type === 'savings_account'
                    ? 'e.g. HDFC Classic Salary A/C'
                    : 'e.g. Axis Bank Ace Credit Card'
                }
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3 py-2 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1">
                Bank / Issuer <span className="text-[#F2BD91]">*</span>
              </label>
              <input
                type="text"
                required
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="e.g. HDFC Bank, SBI, ICICI Bank, Axis Bank"
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3 py-2 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>
          </div>

          {/* Last 4 Digits & Expiry (or Balance for Bank Account) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#A5A5A5] mb-1">
                {type === 'savings_account' ? 'Account Number (Last 4 Digits)' : 'Last 4 Digits Only'}{' '}
                <span className="text-[#F2BD91]">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4821"
                className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3 py-2 text-[#F5F3EF] font-mono tracking-widest placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>

            {type !== 'savings_account' ? (
              <div>
                <label className="block text-xs font-medium text-[#A5A5A5] mb-1">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={expiryMMYY}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d/]/g, '');
                    if (val.length === 2 && !val.includes('/')) val = `${val}/`;
                    setExpiryMMYY(val);
                  }}
                  placeholder="08/28"
                  className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3 py-2 text-[#F5F3EF] font-mono placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#A5A5A5] mb-1">
                    Current Balance ({currencySymbol}) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentBalanceOrSavings}
                    onChange={(e) => setCurrentBalanceOrSavings(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 50000"
                    className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3 py-2 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A5A5A5] mb-1">
                    Target Savings Goal ({currencySymbol}) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 500000"
                    className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl px-3 py-2 text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#7FB2FF]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC FIELD SECTION ACCORDING TO ACCOUNT TYPE */}

          {/* 1. CREDIT CARD SPECIFIC CONTROLS */}
          {type === 'credit_card' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#191A1E] border border-[#292A2F]">
              <div>
                <label className="block text-[11px] font-medium text-[#A5A5A5] mb-1">
                  Payment Due Date (Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={billingDueDate}
                  onChange={(e) => setBillingDueDate(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 5 (5th)"
                  className="w-full bg-[#141518] border border-[#292A2F] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#A5A5A5] mb-1">
                  Statement Date (Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 15 (15th)"
                  className="w-full bg-[#141518] border border-[#292A2F] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#A5A5A5] mb-1">
                  Credit Limit ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 150000"
                  className="w-full bg-[#141518] border border-[#292A2F] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>

              <div className="sm:col-span-3 pt-1 border-t border-[#25262B]">
                <label className="block text-[11px] font-medium text-[#A5A5A5] mb-1">
                  Current Billing Cycle Unbilled / Swiped Offset ({currencySymbol}) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentBalanceOrSavings}
                  onChange={(e) => setCurrentBalanceOrSavings(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 12500 (Any previous swipes in current statement)"
                  className="w-full bg-[#141518] border border-[#292A2F] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>
            </div>
          )}

          {/* 2. DEBIT CARD SPECIFIC CONTROLS */}
          {type === 'debit_card' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#15241C] border border-[#224430]">
              <div>
                <label className="block text-[11px] font-medium text-[#97D2AF] mb-1">
                  Daily POS / ATM Limit ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 50000 / 100000"
                  className="w-full bg-[#111C16] border border-[#254F37] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] placeholder-[#5A7E6A] focus:outline-none focus:border-[#5CE095]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#97D2AF] mb-1">
                  Linked Account Type
                </label>
                <select
                  aria-label="Linked Account Type"
                  value={linkedAccountType}
                  onChange={(e) => setLinkedAccountType(e.target.value)}
                  className="w-full bg-[#111C16] border border-[#254F37] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#5CE095]"
                >
                  <option value="Salary Account">Primary Salary Account</option>
                  <option value="Savings Account">Regular Savings A/C</option>
                  <option value="Privilege Account">Privilege / Premium A/C</option>
                  <option value="Current Account">Current / Business A/C</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#97D2AF] mb-1">
                  Available Balance ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentBalanceOrSavings}
                  onChange={(e) => setCurrentBalanceOrSavings(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 45000 (Optional)"
                  className="w-full bg-[#111C16] border border-[#254F37] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] placeholder-[#5A7E6A] focus:outline-none focus:border-[#5CE095]"
                />
              </div>
            </div>
          )}

          {/* Visual Card Theme Color */}
          <div>
            <label className="block text-[11px] font-medium text-[#A5A5A5] mb-1.5">
              Visual Card Color Theme
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  { id: 'sapphire', label: 'Sapphire', color: 'bg-gradient-to-r from-[#1B2C47] to-[#294670]' },
                  { id: 'ruby', label: 'Ruby Red', color: 'bg-gradient-to-r from-[#421D22] to-[#662831]' },
                  { id: 'emerald', label: 'Emerald', color: 'bg-gradient-to-r from-[#1A382B] to-[#29563E]' },
                  { id: 'gold', label: 'Amber Gold', color: 'bg-gradient-to-r from-[#3D301E] to-[#694D26]' },
                  { id: 'obsidian', label: 'Obsidian', color: 'bg-gradient-to-r from-[#202127] to-[#363842]' },
                  { id: 'silver', label: 'Titanium', color: 'bg-gradient-to-r from-[#32343D] to-[#4F5260]' }
                ] as const
              ).map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setCardColor(th.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] transition-all ${
                    cardColor === th.id
                      ? 'border-[#F2BD91] bg-[#241F1C] text-[#F5F3EF] scale-105'
                      : 'border-[#292A2F] bg-[#191A1E] text-[#A5A5A5] hover:text-[#F5F3EF]'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${th.color}`} />
                  <span>{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Perks */}
          <div>
            <label className="block text-[11px] font-medium text-[#A5A5A5] mb-1">
              Notes / Card Perks &amp; Purpose (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                type === 'debit_card'
                  ? 'e.g. Free airport lounge access, linked to primary salary, zero ATM withdrawal charges...'
                  : type === 'savings_account'
                  ? 'e.g. Emergency fund savings account, high interest rate...'
                  : 'e.g. 5% cashback on Amazon, lounge visits, used for subscription auto-debit...'
              }
              className="w-full bg-[#191A1E] border border-[#292A2F] rounded-xl p-2.5 text-xs text-[#F5F3EF] placeholder-[#6E707A] focus:outline-none focus:border-[#F2BD91] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#25262B] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#202127] hover:bg-[#282930] text-[#A5A5A5] hover:text-[#F5F3EF] text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors ${
                type === 'debit_card'
                  ? 'bg-[#5CE095] hover:bg-[#72E8A6] text-[#0C1B12]'
                  : 'bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518]'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {editingCard
                      ? `Update ${type === 'debit_card' ? 'Debit Card' : type === 'savings_account' ? 'Account' : 'Credit Card'}`
                      : `Save ${type === 'debit_card' ? 'Debit Card' : type === 'savings_account' ? 'Account' : 'Credit Card'}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
