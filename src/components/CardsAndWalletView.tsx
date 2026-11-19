import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  PiggyBank,
  Check,
  X,
  Receipt,
  Layers,
  ShoppingBag,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { CardAccountRecord, CardExpenseItem, getCardGradient } from '../types/card';
import { SubscriptionRecord, normalizeMonthlyAmount } from '../types/subscription';
import { BrandLogo } from './BrandLogos';

export interface PurchaseItem {
  id: string;
  productName: string;
  brand: string;
  price: number;
  purchaseDate: string;
  paymentCardId?: string;
  notes?: string;
}

interface CardsAndWalletViewProps {
  cards: CardAccountRecord[];
  subscriptions: SubscriptionRecord[];
  purchases: PurchaseItem[];
  monthlyIncome: number;
  onUpdateIncome: (income: number) => void;
  onOpenAddCard: () => void;
  onEditCard: (card: CardAccountRecord) => void;
  onDeleteCard: (card: CardAccountRecord) => void;
  onSaveCard: (card: Omit<CardAccountRecord, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  currencySymbol: string;
  referenceDate: string;
}

export function CardsAndWalletView({
  cards,
  subscriptions,
  purchases,
  monthlyIncome,
  onUpdateIncome,
  onOpenAddCard,
  onEditCard,
  onDeleteCard,
  onSaveCard,
  currencySymbol,
  referenceDate
}: CardsAndWalletViewProps) {
  const [hideIncome, setHideIncome] = useState(false);
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState(String(monthlyIncome || ''));
  const [filterType, setFilterType] = useState<'all' | 'credit_card' | 'debit_card' | 'savings_account'>('all');

  // Quick Log Spend Modal State
  const [activeLogCard, setActiveLogCard] = useState<CardAccountRecord | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('General');
  const [expenseDate, setExpenseDate] = useState(referenceDate);
  const [savingExpense, setSavingExpense] = useState(false);

  // Quick Adjustment Modal (Update Balance or Unbilled offset)
  const [adjustingCard, setAdjustingCard] = useState<CardAccountRecord | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const todayDay = Number(referenceDate.split('-')[2] || '1');
  const hasIncome = monthlyIncome > 0;

  // 1. Calculate Subscriptions Burn
  const monthlySubscriptionsBurn = subscriptions.reduce((sum, s) => {
    if (s.status === 'cancelled') return sum;
    return sum + normalizeMonthlyAmount(s.amount, s.billingCycle, s.customDays);
  }, 0);

  // Helper: Find linked subscriptions for a given card
  const getLinkedSubscriptions = (card: CardAccountRecord) => {
    const bankKeyword = card.bank.toLowerCase().split(' ')[0];
    const last4 = card.last4;

    return subscriptions.filter((s) => {
      const pm = (s.paymentMethod || '').toLowerCase();
      const notes = (s.notes || '').toLowerCase();
      return (
        pm.includes(last4) ||
        notes.includes(last4) ||
        (pm.includes(bankKeyword) && card.type === 'credit_card' && pm.includes('credit')) ||
        (pm.includes(bankKeyword) && card.type === 'debit_card' && pm.includes('debit'))
      );
    });
  };

  // Helper: Find linked purchases for a given card
  const getLinkedPurchases = (card: CardAccountRecord) => {
    return purchases.filter((p) => {
      if (p.paymentCardId === card.id) return true;
      if (p.notes && p.notes.includes(card.last4)) return true;
      return false;
    });
  };

  // Helper: Calculate full card financials (spends, balance, limit, utilization)
  const getCardFinancials = (card: CardAccountRecord) => {
    const linkedSubs = getLinkedSubscriptions(card);
    const subsMonthlyTotal = linkedSubs.reduce(
      (sum, s) => sum + normalizeMonthlyAmount(s.amount, s.billingCycle, s.customDays),
      0
    );

    const linkedPurch = getLinkedPurchases(card);
    const purchasesTotal = linkedPurch.reduce((sum, p) => sum + (p.price || 0), 0);

    const directExpenses = card.expenses || [];
    const directExpensesTotal = directExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Initial statement balance / offset or current balance
    const baseOffset = card.currentBalanceOrSavings || 0;

    if (card.type === 'credit_card') {
      const totalUsed = baseOffset + subsMonthlyTotal + purchasesTotal + directExpensesTotal;
      const creditLimit = card.creditLimit || 0;
      const availableCredit = Math.max(0, creditLimit - totalUsed);
      const utilizationRate = creditLimit > 0 ? (totalUsed / creditLimit) * 100 : 0;

      return {
        type: 'credit_card' as const,
        totalUsed,
        availableCredit,
        creditLimit,
        utilizationRate,
        subsMonthlyTotal,
        purchasesTotal,
        directExpensesTotal,
        linkedSubs,
        linkedPurch,
        directExpenses
      };
    } else if (card.type === 'debit_card') {
      const openingBalance = baseOffset;
      const totalDebited = subsMonthlyTotal + purchasesTotal + directExpensesTotal;
      const remainingBalance = openingBalance > 0 ? openingBalance - totalDebited : 0;
      const dailyLimit = card.dailyLimit || 50000;
      const dailyRemaining = Math.max(0, dailyLimit - directExpensesTotal);

      return {
        type: 'debit_card' as const,
        openingBalance,
        totalDebited,
        remainingBalance,
        dailyLimit,
        dailyRemaining,
        subsMonthlyTotal,
        purchasesTotal,
        directExpensesTotal,
        linkedSubs,
        linkedPurch,
        directExpenses
      };
    } else {
      // Savings Account
      const currentBalance = baseOffset;
      const savingsGoal = card.savingsGoal || 0;
      const goalProgress = savingsGoal > 0 ? Math.min(100, (currentBalance / savingsGoal) * 100) : null;

      return {
        type: 'savings_account' as const,
        currentBalance,
        savingsGoal,
        goalProgress,
        subsMonthlyTotal,
        purchasesTotal,
        directExpensesTotal,
        linkedSubs,
        linkedPurch,
        directExpenses
      };
    }
  };

  // 2. Aggregate Total Financial Numbers Across All Cards
  const totalCreditLimit = cards
    .filter((c) => c.type === 'credit_card')
    .reduce((sum, c) => sum + (c.creditLimit || 0), 0);

  const totalCreditUsed = cards
    .filter((c) => c.type === 'credit_card')
    .reduce((sum, c) => {
      const f = getCardFinancials(c);
      return sum + ('totalUsed' in f && typeof f.totalUsed === 'number' ? f.totalUsed : 0);
    }, 0);

  const overallCreditUtilization =
    totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  const totalBankSavings = cards
    .filter((c) => c.type === 'savings_account' || c.type === 'debit_card')
    .reduce((sum, c) => {
      const f = getCardFinancials(c);
      if (f.type === 'savings_account') return sum + f.currentBalance;
      if (f.type === 'debit_card') return sum + Math.max(0, f.remainingBalance);
      return sum;
    }, 0);

  const totalOneOffSpendsAcrossCards = cards.reduce((sum, c) => {
    const f = getCardFinancials(c);
    return sum + (f.directExpensesTotal || 0) + (f.purchasesTotal || 0);
  }, 0);

  // Total monthly outflow = Recurring subscriptions + All card spends logged
  const totalMonthlyOutflow = monthlySubscriptionsBurn + totalOneOffSpendsAcrossCards;
  const netSavings = hasIncome ? Math.max(0, monthlyIncome - totalMonthlyOutflow) : 0;
  const savingsRate = hasIncome ? (netSavings / monthlyIncome) * 100 : 0;

  // 50/30/20 Benchmark Standard
  const needsCap = monthlyIncome * 0.5; // 50%
  const wantsCap = monthlyIncome * 0.3; // 30%
  const targetGoldenSavings = monthlyIncome * 0.2; // 20% minimum target

  // Filtered Cards
  const creditCardsCount = cards.filter((c) => c.type === 'credit_card').length;
  const debitCardsCount = cards.filter((c) => c.type === 'debit_card').length;
  const savingsCount = cards.filter((c) => c.type === 'savings_account').length;
  const filteredCards = cards.filter((c) => {
    if (filterType === 'all') return true;
    return c.type === filterType;
  });

  // Handle Save Monthly Income
  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(incomeInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateIncome(val);
      setIsEditingIncome(false);
    }
  };

  // Handle Adding Expense to Card
  const handleAddCardExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLogCard) return;
    const amount = Number(expenseAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSavingExpense(true);
    try {
      const newExpense: CardExpenseItem = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: expenseTitle.trim() || 'Card Spend',
        amount,
        date: expenseDate || referenceDate,
        category: expenseCategory
      };

      const updatedExpenses = [newExpense, ...(activeLogCard.expenses || [])];
      await onSaveCard({
        ...activeLogCard,
        expenses: updatedExpenses
      });

      setExpenseTitle('');
      setExpenseAmount('');
      setActiveLogCard(null);
    } finally {
      setSavingExpense(false);
    }
  };

  // Handle Deleting Expense from Card
  const handleDeleteCardExpense = async (card: CardAccountRecord, expenseId: string) => {
    const updated = (card.expenses || []).filter((e) => e.id !== expenseId);
    await onSaveCard({
      ...card,
      expenses: updated
    });
  };

  // Handle Quick Adjust Balance / Offset
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingCard) return;
    const val = Number(adjustAmount);
    if (isNaN(val) || val < 0) return;

    await onSaveCard({
      ...adjustingCard,
      currentBalanceOrSavings: val
    });
    setAdjustingCard(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
            WEALTH &amp; SPEND INTELLIGENCE
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
            Wallet, Card Expenses &amp; Savings
          </h1>
          <p className="text-sm text-[#A5A5A5] mt-0.5">
            Real-time card expense tracking, available balance calculations, and golden 50/30/20 savings discipline.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIncomeInput(String(monthlyIncome || ''));
              setIsEditingIncome(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#191A1E] border border-[#292A2F] hover:border-[#3D3E47] text-xs font-medium text-[#F5F3EF] flex items-center gap-2 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#5CE095]" />
            <span>{hasIncome ? 'Edit Income' : 'Set Monthly Salary'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddCard}
            className="px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.4]" />
            Add Card / Account
          </button>
        </div>
      </div>

      {/* 2. Monthly Income Inline Setting Modal / Bar */}
      {isEditingIncome && (
        <form
          onSubmit={handleSaveIncome}
          className="p-4 sm:p-5 rounded-2xl bg-[#18191E] border border-[#3A3228] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-fadeIn"
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-[#28211C] border border-[#443325] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#F2BD91]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#F2BD91]">
                Baseline Monthly Take-Home Salary
              </div>
              <p className="text-[11px] text-[#A5A5A5]">
                Used to compute card spend burn rate, net savings buffer, and the 20% savings rule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#A5A5A5]">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                placeholder="100000"
                className="w-full bg-[#141518] border border-[#3A3228] rounded-xl pl-8 pr-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] font-semibold text-xs hover:bg-[#F5C8A2] transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditingIncome(false)}
              className="px-3 py-2 rounded-xl bg-[#22242A] text-[#A5A5A5] text-xs hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* 3. CORE FINANCIAL HEALTH & SAVINGS INTELLIGENCE HERO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Take-Home Monthly Salary */}
        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
            <span className="font-medium">Monthly Take-Home</span>
            <button
              type="button"
              onClick={() => setHideIncome(!hideIncome)}
              className="p-1 rounded hover:bg-[#25262B] text-[#A5A5A5] hover:text-[#F5F3EF] transition-colors"
              title={hideIncome ? 'Show salary' : 'Hide salary'}
            >
              {hideIncome ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-2xl font-bold text-[#F2BD91] mt-1 font-mono">
            {hideIncome ? (
              '••••••••'
            ) : hasIncome ? (
              `${currencySymbol}${monthlyIncome.toLocaleString('en-IN')}`
            ) : (
              <span className="text-base text-[#7A7C85] font-normal">Not configured</span>
            )}
          </div>
          <div className="text-[11px] text-[#8E8F94] mt-1 flex items-center justify-between">
            <span>Verified income base</span>
            {!hasIncome && (
              <button
                type="button"
                onClick={() => setIsEditingIncome(true)}
                className="text-[#F2BD91] hover:underline"
              >
                + Set salary
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Total Outflows (Card Spends + Subscriptions) */}
        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
            <span className="font-medium">Total Monthly Outflows</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#262832] text-[#C5C5CB]">
              Spends + Subs
            </span>
          </div>
          <div className="text-2xl font-bold text-[#F5F3EF] mt-1 font-mono">
            {currencySymbol}
            {Math.round(totalMonthlyOutflow).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#8E8F94] mt-1 flex items-center justify-between">
            <span>
              ~{currencySymbol}{Math.round(monthlySubscriptionsBurn).toLocaleString('en-IN')} subs + ~{currencySymbol}{Math.round(totalOneOffSpendsAcrossCards).toLocaleString('en-IN')} card spends
            </span>
          </div>
        </div>

        {/* Card 3: Net Monthly Savings Retained & Savings Rate */}
        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
            <span className="font-medium">Net Monthly Savings</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                !hasIncome
                  ? 'bg-[#22242A] text-[#A5A5A5]'
                  : savingsRate >= 35
                  ? 'bg-[#152B1E] text-[#5CE095]'
                  : savingsRate >= 20
                  ? 'bg-[#1A2E20] text-[#72E8A6]'
                  : savingsRate >= 10
                  ? 'bg-[#312517] text-[#F2B354]'
                  : 'bg-[#361A1D] text-[#F27474]'
              }`}
            >
              {!hasIncome
                ? 'Uncalculated'
                : savingsRate >= 35
                ? 'Super Saver (>35%)'
                : savingsRate >= 20
                ? 'Healthy (≥20%)'
                : savingsRate >= 10
                ? 'Borderline Buffer'
                : 'Overspending Alert'}
            </span>
          </div>
          <div className="text-2xl font-bold text-[#5CE095] mt-1 font-mono">
            {hideIncome ? (
              '••••••••'
            ) : hasIncome ? (
              `${currencySymbol}${Math.round(netSavings).toLocaleString('en-IN')}`
            ) : (
              <span className="text-base text-[#7A7C85] font-normal">—</span>
            )}
          </div>
          <div className="text-[11px] text-[#8E8F94] mt-1">
            {hasIncome
              ? `${savingsRate.toFixed(1)}% of income saved for future`
              : 'Add salary to calculate savings'}
          </div>
        </div>

        {/* Card 4: Total Credit Limit & Utilization */}
        <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
            <span className="font-medium">Credit Limit &amp; Utilization</span>
            <CreditCard className="w-4 h-4 text-[#F2BD91]" />
          </div>
          <div className="text-2xl font-bold text-[#F2BD91] mt-1 font-mono">
            {totalCreditLimit > 0
              ? `${currencySymbol}${totalCreditLimit.toLocaleString('en-IN')}`
              : `${cards.length} Cards`}
          </div>
          <div className="text-[11px] text-[#8E8F94] mt-1 flex items-center justify-between">
            <span>
              {totalCreditLimit > 0
                ? `${overallCreditUtilization.toFixed(1)}% utilized (${currencySymbol}${Math.round(totalCreditUsed).toLocaleString('en-IN')} used)`
                : `Across ${creditCardsCount} credit cards`}
            </span>
            {totalCreditLimit > 0 && (
              <span
                className={`text-[10px] font-semibold ${
                  overallCreditUtilization <= 30 ? 'text-[#5CE095]' : 'text-[#F2B354]'
                }`}
              >
                {overallCreditUtilization <= 30 ? '✓ CIBIL Safe (<30%)' : '⚠ Caution'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. THE 50/30/20 SAVINGS RULE & ADVISOR BAR */}
      {hasIncome && (
        <div className="p-5 rounded-2xl bg-[#16171B] border border-[#2B2C35] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-[#F2BD91]" />
              <h3 className="text-sm font-semibold text-[#F5F3EF]">
                50/30/20 Savings Rule Health Meter
              </h3>
            </div>
            <div className="text-xs text-[#A5A5A5]">
              Target Golden Savings: <span className="text-[#5CE095] font-semibold">{currencySymbol}{Math.round(targetGoldenSavings).toLocaleString('en-IN')} (20%)</span>
            </div>
          </div>

          {/* Progress Bar of Savings vs Target */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#202127] rounded-full h-3 overflow-hidden flex">
              {/* Needs Portion (Subscriptions) */}
              <div
                style={{
                  width: `${Math.min(100, (monthlySubscriptionsBurn / monthlyIncome) * 100)}%`
                }}
                className="bg-[#F2BD91] h-full"
                title={`Subscriptions: ${currencySymbol}${Math.round(monthlySubscriptionsBurn)}`}
              />
              {/* Wants / Card Spends */}
              <div
                style={{
                  width: `${Math.min(100, (totalOneOffSpendsAcrossCards / monthlyIncome) * 100)}%`
                }}
                className="bg-[#E08A5C] h-full"
                title={`Card Expenses: ${currencySymbol}${Math.round(totalOneOffSpendsAcrossCards)}`}
              />
              {/* Retained Net Savings */}
              <div
                style={{ width: `${Math.max(0, savingsRate)}%` }}
                className="bg-[#5CE095] h-full"
                title={`Net Savings: ${currencySymbol}${Math.round(netSavings)}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8E8F94] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F2BD91]" />
                <span>Fixed Subs: {((monthlySubscriptionsBurn / monthlyIncome) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E08A5C]" />
                <span>Card Spends: {((totalOneOffSpendsAcrossCards / monthlyIncome) * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5CE095]" />
                <span className="font-semibold text-[#5CE095]">
                  Net Retained: {savingsRate.toFixed(0)}% ({savingsRate >= 20 ? 'Goal Met ✓' : 'Below 20%'})
                </span>
              </div>
            </div>
          </div>

          {/* Smart Savings Actionable Tips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[#1B1D22] border border-[#2A2B33] flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-[#F2BD91] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#F5F3EF]">Maintain 30% Card Utilization</div>
                <p className="text-[11px] text-[#A5A5A5] mt-0.5">
                  Never swipe more than 30% of any credit card limit to maximize your credit score.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1B1D22] border border-[#2A2B33] flex items-start gap-2.5">
              <PiggyBank className="w-4 h-4 text-[#5CE095] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#F5F3EF]">Auto-Transfer 20% to Savings</div>
                <p className="text-[11px] text-[#A5A5A5] mt-0.5">
                  Transfer {currencySymbol}{Math.round(targetGoldenSavings).toLocaleString('en-IN')} to your savings account on payday before card billing starts.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1B1D22] border border-[#2A2B33] flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#7FB2FF] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#F5F3EF]">Emergency Buffer Runway</div>
                <p className="text-[11px] text-[#A5A5A5] mt-0.5">
                  Total bank savings tracked: {currencySymbol}{Math.round(totalBankSavings).toLocaleString('en-IN')} (~
                  {totalMonthlyOutflow > 0
                    ? `${(totalBankSavings / totalMonthlyOutflow).toFixed(1)} months of expenses`
                    : 'Uncalculated'}
                  ).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SAVED CARDS & ACCOUNTS SECTION */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#F5F3EF]">
              Your Cards &amp; Accounts ({cards.length})
            </h2>
            <span className="text-xs text-[#5CE095] bg-[#16291F] px-2 py-0.5 rounded border border-[#204933] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Zero Credentials
            </span>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#141518] border border-[#292A2F] rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                filterType === 'all'
                  ? 'bg-[#25262B] text-[#F5F3EF] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
              }`}
            >
              All ({cards.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('credit_card')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                filterType === 'credit_card'
                  ? 'bg-[#2E241B] text-[#F2BD91] border border-[#483726] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
              }`}
            >
              Credit ({creditCardsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('debit_card')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                filterType === 'debit_card'
                  ? 'bg-[#152B1E] text-[#5CE095] border border-[#234A35] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
              }`}
            >
              Debit ({debitCardsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('savings_account')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                filterType === 'savings_account'
                  ? 'bg-[#1A2536] text-[#7FB2FF] border border-[#284163] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
              }`}
            >
              Savings ({savingsCount})
            </button>
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-12 text-center">
            <CreditCard className="w-12 h-12 text-[#A5A5A5] mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-[#F5F3EF]">No cards or accounts added yet</h3>
            <p className="text-xs text-[#A5A5A5] mt-1 max-w-md mx-auto">
              Add your credit cards, debit cards, or bank accounts to track statement due dates,
              daily ATM limits, and recurring subscription auto-pays with 100% security.
            </p>
            <button
              type="button"
              onClick={onOpenAddCard}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold shadow-md inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Your First Card
            </button>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-8 text-center text-[#A5A5A5] text-xs">
            No {filterType.replace('_', ' ')}s found in your vault.
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className="block mx-auto mt-2 text-[#F2BD91] hover:underline"
            >
              Show all cards ({cards.length})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCards.map((card) => {
              const financials = getCardFinancials(card);
              const gradient = getCardGradient(card.cardColor);

              // Calculate credit card due date countdown
              let dueDays = null;
              let isDueSoon = false;
              if (card.type === 'credit_card' && card.billingDueDate && card.billingDueDate > 0) {
                if (card.billingDueDate >= todayDay) {
                  dueDays = card.billingDueDate - todayDay;
                } else {
                  dueDays = 30 - todayDay + card.billingDueDate;
                }
                isDueSoon = dueDays <= 5;
              }

              return (
                <div
                  key={card.id}
                  className="bg-[#191A1E] border border-[#292A2F] hover:border-[#383A44] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
                >
                  {/* Visual Card Replica */}
                  <div
                    className={`w-full aspect-[1.586/1] rounded-2xl p-4 sm:p-5 bg-gradient-to-br border shadow-lg flex flex-col justify-between relative overflow-hidden ${gradient}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
                          {card.bank}
                        </div>
                        <div className="text-sm font-bold tracking-tight mt-0.5 line-clamp-1">
                          {card.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {card.type !== 'savings_account' && (
                          <div className="w-6 h-4 rounded bg-gradient-to-r from-[#D4AF37] to-[#AA771C] border border-[#FFE082]/40 opacity-80" />
                        )}
                        <span
                          className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border backdrop-blur-sm ${
                            card.type === 'debit_card'
                              ? 'bg-emerald-500/20 text-[#72E8A6] border-emerald-400/40'
                              : card.type === 'savings_account'
                              ? 'bg-blue-500/20 text-[#93C5FD] border-blue-400/40'
                              : 'bg-amber-500/20 text-[#F2BD91] border-amber-400/40'
                          }`}
                        >
                          {card.type === 'debit_card' ? 'DEBIT' : card.type === 'savings_account' ? 'BANK A/C' : 'CREDIT'}
                        </span>
                      </div>
                    </div>

                    <div className="my-auto py-1">
                      <div className="font-mono text-sm sm:text-base tracking-[0.25em] font-semibold opacity-90">
                        {card.type === 'savings_account' ? (
                          <span>A/C &nbsp;•••• &nbsp;•••• &nbsp;{card.last4}</span>
                        ) : (
                          <span>•••• &nbsp;•••• &nbsp;•••• &nbsp;{card.last4}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between text-xs">
                      <div>
                        <div className="text-[8px] uppercase tracking-wider opacity-60">Type</div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">
                          {card.type.replace('_', ' ')}
                        </div>
                      </div>

                      {card.type !== 'savings_account' ? (
                        <div className="text-right">
                          <div className="text-[8px] uppercase tracking-wider opacity-60">Valid Thru</div>
                          <div className="font-mono text-[11px] font-semibold mt-0.5">
                            {card.expiryMMYY || 'MM/YY'}
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

                  {/* REAL-TIME EXPENSE USE & LIVE BALANCE DISPLAY */}
                  <div className="space-y-2.5 text-xs">
                    {/* A. CREDIT CARD METRICS */}
                    {financials.type === 'credit_card' && (
                      <div className="p-3 rounded-xl bg-[#141518] border border-[#25262B] space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-[#A5A5A5]">Used / Spent This Cycle</div>
                            <div className="text-base font-bold text-[#F2BD91] font-mono">
                              {currencySymbol}{Math.round(financials.totalUsed).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-[#A5A5A5]">Available Credit</div>
                            <div className="text-base font-bold text-[#5CE095] font-mono">
                              {currencySymbol}{Math.round(financials.availableCredit).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Utilization Bar */}
                        <div className="space-y-1 pt-1 border-t border-[#22242B]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#A5A5A5]">
                              Limit: {currencySymbol}{financials.creditLimit.toLocaleString('en-IN')}
                            </span>
                            <span
                              className={`font-semibold ${
                                financials.utilizationRate <= 30
                                  ? 'text-[#5CE095]'
                                  : financials.utilizationRate <= 50
                                  ? 'text-[#F2B354]'
                                  : 'text-[#F27474]'
                              }`}
                            >
                              {financials.utilizationRate.toFixed(1)}% Used (
                              {financials.utilizationRate <= 30 ? 'Safe for CIBIL' : 'High Usage'}
                              )
                            </span>
                          </div>
                          <div className="w-full bg-[#202127] rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, financials.utilizationRate)}%` }}
                              className={`h-full rounded-full transition-all ${
                                financials.utilizationRate <= 30
                                  ? 'bg-[#5CE095]'
                                  : financials.utilizationRate <= 50
                                  ? 'bg-[#F2B354]'
                                  : 'bg-[#F27474]'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Payment Due Date */}
                        {card.billingDueDate && card.billingDueDate > 0 && (
                          <div className="flex items-center justify-between text-[11px] pt-1 text-[#A5A5A5]">
                            <span>Bill Payment Due</span>
                            <span
                              className={`font-semibold flex items-center gap-1 ${
                                isDueSoon ? 'text-[#F2B354]' : 'text-[#5CE095]'
                              }`}
                            >
                              {isDueSoon && <AlertTriangle className="w-3 h-3" />}
                              <span>
                                {card.billingDueDate}th of month ({dueDays}d left)
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* B. DEBIT CARD METRICS */}
                    {financials.type === 'debit_card' && (
                      <div className="p-3 rounded-xl bg-[#131E18] border border-[#203D2B] space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-[#86B898]">Total Debited Spends</div>
                            <div className="text-base font-bold text-[#E5A876] font-mono">
                              {currencySymbol}{Math.round(financials.totalDebited).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-[#86B898]">Remaining Balance</div>
                            <div className="text-base font-bold text-[#5CE095] font-mono">
                              {financials.openingBalance > 0
                                ? `${currencySymbol}${Math.round(financials.remainingBalance).toLocaleString('en-IN')}`
                                : 'Tracking active'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1C3325] text-[#86B898]">
                          <span>Daily Limit: {currencySymbol}{financials.dailyLimit.toLocaleString('en-IN')}</span>
                          <span className="text-[#E1F3EA]">Linked: {card.linkedAccountType || 'Salary A/C'}</span>
                        </div>
                      </div>
                    )}

                    {/* C. SAVINGS ACCOUNT METRICS */}
                    {financials.type === 'savings_account' && (
                      <div className="p-3 rounded-xl bg-[#151D2A] border border-[#24344D] space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-[#87A4D4]">Account Balance</div>
                            <div className="text-base font-bold text-[#7FB2FF] font-mono">
                              {currencySymbol}{Math.round(financials.currentBalance).toLocaleString('en-IN')}
                            </div>
                          </div>
                          {financials.savingsGoal > 0 && (
                            <div className="text-right">
                              <div className="text-[10px] text-[#87A4D4]">Goal Progress</div>
                              <div className="text-sm font-bold text-[#5CE095] font-mono">
                                {financials.goalProgress?.toFixed(0)}%
                              </div>
                            </div>
                          )}
                        </div>

                        {financials.savingsGoal > 0 && (
                          <div className="space-y-1 pt-1 border-t border-[#1E2E44]">
                            <div className="flex items-center justify-between text-[10px] text-[#87A4D4]">
                              <span>Target: {currencySymbol}{financials.savingsGoal.toLocaleString('en-IN')}</span>
                              <span>{currencySymbol}{Math.round(financials.currentBalance).toLocaleString('en-IN')} reached</span>
                            </div>
                            <div className="w-full bg-[#1C2636] rounded-full h-2 overflow-hidden">
                              <div
                                style={{ width: `${financials.goalProgress || 0}%` }}
                                className="bg-[#7FB2FF] h-full rounded-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* D. BILLED SUBSCRIPTIONS ON THIS CARD */}
                    <div className="p-2.5 rounded-xl bg-[#141518] border border-[#25262B]">
                      <div className="flex items-center justify-between mb-1.5 text-[11px]">
                        <span className="text-[#A5A5A5] font-medium">Billed Subscriptions</span>
                        {financials.linkedSubs.length > 0 && (
                          <span className="text-[#5CE095] font-semibold">
                            ~{currencySymbol}{Math.round(financials.subsMonthlyTotal).toLocaleString('en-IN')}/mo
                          </span>
                        )}
                      </div>

                      {financials.linkedSubs.length === 0 ? (
                        <div className="text-[11px] text-[#6E707A]">
                          No subscriptions mapped to this card yet.
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {financials.linkedSubs.map((sub) => (
                            <span
                              key={sub.id}
                              className="px-2 py-0.5 rounded-md bg-[#1E2026] text-[#C5C5CB] border border-[#2B2D36] text-[10px] flex items-center gap-1"
                            >
                              <BrandLogo provider={sub.provider} size="xs" />
                              <span className="truncate max-w-[80px]">{sub.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* E. RECENT LOGGED EXPENSES ON THIS CARD */}
                    {financials.directExpenses && financials.directExpenses.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-[#141518] border border-[#25262B] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#A5A5A5] font-medium">
                            Logged Card Swipes ({financials.directExpenses.length})
                          </span>
                          <span className="text-[#F2BD91] font-semibold">
                            {currencySymbol}{Math.round(financials.directExpensesTotal).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {financials.directExpenses.slice(0, 3).map((exp) => (
                            <div
                              key={exp.id}
                              className="flex items-center justify-between text-[10px] bg-[#191A1E] px-2 py-1 rounded border border-[#262830]"
                            >
                              <div className="truncate pr-2">
                                <span className="text-[#F5F3EF] font-medium">{exp.title}</span>
                                <span className="text-[#7A7C85] ml-1">({exp.date})</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="font-mono text-[#F2BD91]">
                                  {currencySymbol}{exp.amount.toLocaleString('en-IN')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCardExpense(card, exp.id)}
                                  className="text-[#7A7C85] hover:text-[#F27474] ml-1"
                                  title="Delete transaction"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[#25262B] flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveLogCard(card)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#241E19] hover:bg-[#34281E] border border-[#443224] text-[#F2BD91] flex items-center gap-1.5 font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Spend</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditCard(card)}
                        className="px-3 py-1.5 rounded-lg bg-[#222328] hover:bg-[#2C2D34] text-[#F5F3EF] flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#F2BD91]" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCard(card)}
                        className="p-1.5 rounded-lg bg-[#222328] hover:bg-[#341B1E] text-[#A5A5A5] hover:text-[#F27474] transition-colors"
                        title="Delete card"
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

      {/* MODAL: LOG CARD EXPENSE / SWIPE */}
      {activeLogCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveLogCard(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-[#F5F3EF] space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292A2F]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#29211C] border border-[#443325] flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#F2BD91]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#F5F3EF]">
                    Log Card Expense / Swipe
                  </h3>
                  <p className="text-[11px] text-[#A5A5A5]">
                    {activeLogCard.name} (•••• {activeLogCard.last4})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogCard(null)}
                className="p-1.5 rounded-lg bg-[#23242A] text-[#A5A5A5] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCardExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#A5A5A5] mb-1">
                  Spend Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 2400"
                  className="w-full bg-[#141518] border border-[#2E2F36] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>

              <div>
                <label className="block text-[#A5A5A5] mb-1">Spend Description *</label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. Dinner with team, Blinkit Groceries, Fuel"
                  className="w-full bg-[#141518] border border-[#2E2F36] rounded-xl px-3.5 py-2 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A5A5A5] mb-1">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-[#141518] border border-[#2E2F36] rounded-xl px-3 py-2 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
                  >
                    <option value="Dining & Food">Dining &amp; Food</option>
                    <option value="Groceries">Groceries &amp; Daily</option>
                    <option value="Shopping & Gadgets">Shopping &amp; Retail</option>
                    <option value="Fuel & Travel">Fuel &amp; Travel</option>
                    <option value="Healthcare">Healthcare &amp; Meds</option>
                    <option value="General">General Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A5A5A5] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-[#141518] border border-[#2E2F36] rounded-xl px-3 py-2 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#292A2F] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLogCard(null)}
                  className="px-3 py-2 rounded-xl bg-[#23242A] text-[#A5A5A5] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] font-semibold flex items-center gap-1.5 shadow-md hover:bg-[#F5C8A2] transition-colors"
                >
                  {savingExpense ? 'Logging...' : 'Log Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
