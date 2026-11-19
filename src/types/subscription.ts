export type SubscriptionBillingCycle =
  | 'monthly'
  | 'yearly'
  | 'quarterly'
  | '28_days'
  | 'weekly'
  | 'custom_days';

export type SubscriptionCategory =
  | 'Mobile & Telecom'
  | 'Entertainment & OTT'
  | 'Music & Audio'
  | 'Cloud & Storage'
  | 'Productivity & AI'
  | 'Utilities'
  | 'Other';

export interface SubscriptionRecord {
  id: string;
  name: string;
  provider: string; // e.g. Jio, Airtel, Apple, Netflix, Spotify, Google, Amazon, OpenAI
  category: SubscriptionCategory | string;
  planName: string; // e.g. "True 5G Unlimited", "Family 4K", "2TB Cloud"
  amount: number;
  billingCycle: SubscriptionBillingCycle;
  customDays?: number; // e.g. 56, 84, 90, 180, 365, etc.
  startDate: string; // YYYY-MM-DD
  nextBillingDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD plan expiry date
  autoPay: boolean; // Auto-debit / auto-paying enabled
  paymentMethod: string; // e.g. "UPI AutoPay (PhonePe/GPay)", "HDFC Credit Card", "Apple Pay", "Debit Card", "Net Banking", "Manual"
  status: 'active' | 'paused' | 'cancelled';
  mobileNumber?: string; // e.g. "+91 98765 43210" or "user@example.com"
  reminderDaysBefore: number; // 1, 2, 3, 5, 7 days before auto-debit
  autoCreateReminder: boolean;
  notes?: string;
  createdAt: string;
}

export interface SubscriptionPreset {
  name: string;
  provider: string;
  category: SubscriptionCategory;
  planName: string;
  amount: number;
  billingCycle: SubscriptionBillingCycle;
  customDays?: number;
  autoPay: boolean;
  paymentMethod: string;
  reminderDaysBefore: number;
  notes: string;
}

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  {
    name: 'Jio 5G Unlimited Prepaid',
    provider: 'Jio',
    category: 'Mobile & Telecom',
    planName: 'True 5G Unlimited (28 Days) 2GB/Day',
    amount: 349,
    billingCycle: '28_days',
    autoPay: true,
    paymentMethod: 'UPI AutoPay (PhonePe / GPay)',
    reminderDaysBefore: 2,
    notes: 'Jio 5G Unlimited mobile plan with free national calling & SMS.'
  },
  {
    name: 'Airtel Postpaid Family Plan',
    provider: 'Airtel',
    category: 'Mobile & Telecom',
    planName: 'Infinity Postpaid 5G Unlimited',
    amount: 599,
    billingCycle: 'monthly',
    autoPay: true,
    paymentMethod: 'UPI AutoPay (Airtel Thanks)',
    reminderDaysBefore: 3,
    notes: 'Primary postpaid line with data rollover and Disney+ Hotstar included.'
  },
  {
    name: 'Vi Hero Unlimited 5G',
    provider: 'Vi',
    category: 'Mobile & Telecom',
    planName: 'Hero Unlimited 1.5GB/Day (28 Days)',
    amount: 299,
    billingCycle: '28_days',
    autoPay: true,
    paymentMethod: 'UPI AutoPay',
    reminderDaysBefore: 2,
    notes: 'Binge-all-night free data from 12 AM to 6 AM.'
  },
  {
    name: 'Apple One Individual',
    provider: 'Apple',
    category: 'Cloud & Storage',
    planName: 'Apple One (Music, TV+, Arcade, 50GB iCloud+)',
    amount: 195,
    billingCycle: 'monthly',
    autoPay: true,
    paymentMethod: 'Apple ID Auto-Debit (Credit Card)',
    reminderDaysBefore: 2,
    notes: 'Bundled Apple services across all iOS/Mac devices.'
  },
  {
    name: 'Netflix Premium 4K',
    provider: 'Netflix',
    category: 'Entertainment & OTT',
    planName: 'Ultra HD 4K (4 Screens + Spatial Audio)',
    amount: 649,
    billingCycle: 'monthly',
    autoPay: true,
    paymentMethod: 'Credit Card Auto-Debit',
    reminderDaysBefore: 2,
    notes: 'Living room TV and personal mobile screens.'
  },
  {
    name: 'Spotify Premium Individual',
    provider: 'Spotify',
    category: 'Music & Audio',
    planName: 'Premium Individual Ad-free',
    amount: 119,
    billingCycle: 'monthly',
    autoPay: true,
    paymentMethod: 'UPI AutoPay',
    reminderDaysBefore: 1,
    notes: 'Lossless & offline downloads for phone and laptop.'
  },
  {
    name: 'YouTube Premium',
    provider: 'Google',
    category: 'Entertainment & OTT',
    planName: 'Individual Ad-free + Background Play + YT Music',
    amount: 149,
    billingCycle: 'monthly',
    autoPay: true,
    paymentMethod: 'Google Play AutoPay',
    reminderDaysBefore: 2,
    notes: 'Includes YouTube Music Premium.'
  },
  {
    name: 'Google One 2TB AI Premium',
    provider: 'Google',
    category: 'Cloud & Storage',
    planName: '2TB Cloud Storage + Gemini Advanced',
    amount: 650,
    billingCycle: 'monthly',
    autoPay: true,
    paymentMethod: 'Google Play Auto-Debit',
    reminderDaysBefore: 2,
    notes: 'Drive, Gmail, and Google Photos storage shared with family.'
  },
  {
    name: 'Amazon Prime Annual',
    provider: 'Amazon',
    category: 'Entertainment & OTT',
    planName: 'Annual Prime Shopping & Prime Video',
    amount: 1499,
    billingCycle: 'yearly',
    autoPay: true,
    paymentMethod: 'Amazon Pay UPI AutoPay',
    reminderDaysBefore: 7,
    notes: 'Free 1-day delivery and Prime Video 4K streaming.'
  },
  {
    name: 'ChatGPT Plus',
    provider: 'OpenAI',
    category: 'Productivity & AI',
    planName: 'GPT-4o, Advanced Data Analysis & DALL-E',
    amount: 1999,
    billingCycle: 'monthly',
    autoPay: true,
    paymentMethod: 'Credit Card Auto-Debit',
    reminderDaysBefore: 3,
    notes: 'Monthly AI subscription for work & coding.'
  }
];

export function normalizeMonthlyAmount(
  amount: number,
  cycle: SubscriptionBillingCycle,
  customDays?: number
): number {
  switch (cycle) {
    case 'monthly':
      return amount;
    case 'yearly':
      return amount / 12;
    case 'quarterly':
      return amount / 3;
    case '28_days':
      return (amount / 28) * 30.4375;
    case 'weekly':
      return amount * 4.33;
    case 'custom_days': {
      const days = customDays && customDays > 0 ? customDays : 30;
      return (amount / days) * 30.4375;
    }
    default:
      return amount;
  }
}

export function getBillingCycleLabel(cycle: SubscriptionBillingCycle, customDays?: number): string {
  switch (cycle) {
    case 'monthly':
      return '/ mo';
    case 'yearly':
      return '/ yr';
    case 'quarterly':
      return '/ quarter';
    case '28_days':
      return '/ 28 days';
    case 'weekly':
      return '/ week';
    case 'custom_days':
      return `/ ${customDays && customDays > 0 ? customDays : 30} days`;
    default:
      return '';
  }
}

export function calculateReminderDate(nextBillingDate: string, daysBefore: number): string {
  if (!nextBillingDate) return '';
  const [y, m, d] = nextBillingDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - Math.max(0, daysBefore));
  const ry = date.getFullYear();
  const rm = String(date.getMonth() + 1).padStart(2, '0');
  const rd = String(date.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

export function calculateExpiryDate(startDateOrRenewal: string, cycle: SubscriptionBillingCycle, customDays?: number): string {
  if (!startDateOrRenewal) return '';
  let days = 30;
  if (cycle === '28_days') days = 28;
  else if (cycle === 'weekly') days = 7;
  else if (cycle === 'quarterly') days = 90;
  else if (cycle === 'yearly') days = 365;
  else if (cycle === 'custom_days') days = customDays && customDays > 0 ? customDays : 30;

  const [y, m, d] = startDateOrRenewal.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ry = date.getFullYear();
  const rm = String(date.getMonth() + 1).padStart(2, '0');
  const rd = String(date.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}
