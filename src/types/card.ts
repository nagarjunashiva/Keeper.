export type AccountType = 'credit_card' | 'debit_card' | 'savings_account';

export type CardColorTheme =
  | 'gold'
  | 'obsidian'
  | 'emerald'
  | 'sapphire'
  | 'ruby'
  | 'silver';

export interface CardExpenseItem {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category?: string;
}

export interface CardAccountRecord {
  id: string;
  name: string;
  bank: string;
  type: AccountType;
  last4: string; // strictly 4 digits
  expiryMMYY?: string; // e.g. "08/28"
  billingDueDate?: number; // 1-31 (Day of month payment is due for credit cards)
  statementDate?: number; // 1-31 (Day of month statement is generated)
  creditLimit?: number; // Total limit in INR (for credit cards)
  dailyLimit?: number; // Daily ATM / POS limit in INR (for debit cards)
  linkedAccountType?: string; // e.g. "Salary Account", "Savings Account"
  currentBalanceOrSavings?: number; // Optional balance tracking
  expenses?: CardExpenseItem[]; // Direct card expense transactions
  savingsGoal?: number; // Target savings goal in INR
  cardColor: CardColorTheme;
  notes?: string;
  createdAt: string;
}

export interface BankPreset {
  bank: string;
  name: string;
  type: AccountType;
  cardColor: CardColorTheme;
  creditLimit?: number;
  dailyLimit?: number;
  linkedAccountType?: string;
}

export const CREDIT_CARD_PRESETS: BankPreset[] = [
  { bank: 'HDFC Bank', name: 'HDFC Millennia Credit Card', type: 'credit_card', cardColor: 'sapphire', creditLimit: 150000 },
  { bank: 'ICICI Bank', name: 'ICICI Amazon Pay Credit Card', type: 'credit_card', cardColor: 'gold', creditLimit: 200000 },
  { bank: 'State Bank of India', name: 'SBI SimplyCLICK Credit Card', type: 'credit_card', cardColor: 'emerald', creditLimit: 100000 },
  { bank: 'Axis Bank', name: 'Axis Bank Ace Credit Card', type: 'credit_card', cardColor: 'ruby', creditLimit: 120000 },
  { bank: 'American Express', name: 'Amex SmartEarn Credit Card', type: 'credit_card', cardColor: 'sapphire', creditLimit: 250000 },
  { bank: 'Federal Bank / OneCard', name: 'OneCard Metal Credit Card', type: 'credit_card', cardColor: 'obsidian', creditLimit: 175000 },
  { bank: 'HDFC Bank', name: 'Tata Neu Infinity HDFC Card', type: 'credit_card', cardColor: 'gold', creditLimit: 180000 }
];

export const DEBIT_CARD_PRESETS: BankPreset[] = [
  { bank: 'HDFC Bank', name: 'HDFC Salary Platinum Debit Card', type: 'debit_card', cardColor: 'obsidian', dailyLimit: 100000, linkedAccountType: 'Salary Account' },
  { bank: 'ICICI Bank', name: 'ICICI Coral Debit Card', type: 'debit_card', cardColor: 'ruby', dailyLimit: 100000, linkedAccountType: 'Savings Account' },
  { bank: 'State Bank of India', name: 'SBI Global International Debit', type: 'debit_card', cardColor: 'sapphire', dailyLimit: 50000, linkedAccountType: 'Savings Account' },
  { bank: 'Axis Bank', name: 'Axis Bank Liberty Debit Card', type: 'debit_card', cardColor: 'ruby', dailyLimit: 75000, linkedAccountType: 'Salary Account' },
  { bank: 'Kotak Mahindra', name: 'Kotak Privy League Debit Card', type: 'debit_card', cardColor: 'emerald', dailyLimit: 150000, linkedAccountType: 'Privilege Savings' },
  { bank: 'Federal Bank', name: 'Federal Bank Celesta Debit Card', type: 'debit_card', cardColor: 'gold', dailyLimit: 100000, linkedAccountType: 'Savings Account' }
];

export const SAVINGS_ACCOUNT_PRESETS: BankPreset[] = [
  { bank: 'HDFC Bank', name: 'HDFC Classic Salary Account', type: 'savings_account', cardColor: 'sapphire' },
  { bank: 'ICICI Bank', name: 'ICICI Privilege Savings Account', type: 'savings_account', cardColor: 'gold' },
  { bank: 'State Bank of India', name: 'SBI Regular Savings Account', type: 'savings_account', cardColor: 'emerald' },
  { bank: 'Kotak Mahindra', name: 'Kotak 811 Zero Balance Account', type: 'savings_account', cardColor: 'silver' },
  { bank: 'Axis Bank', name: 'Axis Priority Savings Account', type: 'savings_account', cardColor: 'ruby' }
];

export const BANK_PRESETS: BankPreset[] = [
  ...CREDIT_CARD_PRESETS,
  ...DEBIT_CARD_PRESETS,
  ...SAVINGS_ACCOUNT_PRESETS
];

export function getCardGradient(color: CardColorTheme): string {
  switch (color) {
    case 'gold':
      return 'from-[#2A2318] via-[#3D301E] to-[#1F1912] border-[#5A452B] text-[#F5E6CC]';
    case 'emerald':
      return 'from-[#12241C] via-[#1A382B] to-[#0E1A14] border-[#29563E] text-[#D1F2E0]';
    case 'sapphire':
      return 'from-[#131D2D] via-[#1B2C47] to-[#0E1521] border-[#294670] text-[#D2E2F8]';
    case 'ruby':
      return 'from-[#2B1417] via-[#421D22] to-[#1E0D10] border-[#662831] text-[#FAD5D8]';
    case 'silver':
      return 'from-[#23242A] via-[#32343D] to-[#1A1B20] border-[#444754] text-[#E5E7EB]';
    case 'obsidian':
    default:
      return 'from-[#18191E] via-[#22242B] to-[#131418] border-[#363842] text-[#F5F3EF]';
  }
}
