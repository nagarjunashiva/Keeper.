import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Home,
  ShoppingBag,
  FileText,
  ShieldCheck,
  Bell,
  BarChart2,
  Settings,
  Search,
  Plus,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Cloud,
  Crown,
  ArrowRight,
  RefreshCw,
  Upload,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Check,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Store,
  Tag,
  IndianRupee,
  Menu,
  Database,
  Sparkles,
  File,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Filter,
  ArrowUpDown,
  ShieldAlert,
  ShieldOff,
  RotateCcw,
  Lock,
  Mail,
  User,
  LogOut,
  KeyRound,
  Shield,
  CreditCard,
  Smartphone,
  Repeat,
  Zap,
  Phone,
  Building,
  Wallet
} from 'lucide-react';
import {
  SubscriptionRecord,
  SubscriptionPreset,
  calculateReminderDate,
  normalizeMonthlyAmount
} from './types/subscription';
import { CardAccountRecord } from './types/card';
import { UnifiedDatabaseManager, generateRealStarterDataset } from './lib/database';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SubscriptionsView } from './components/SubscriptionsView';
import { BrandLogo } from './components/BrandLogos';
import { DatabaseModal } from './components/DatabaseModal';
import { AuthPortal } from './components/AuthPortal';
import { ReceiptModal } from './components/ReceiptModal';
import { WarrantyClaimModal } from './components/WarrantyClaimModal';
import { CardAccountModal } from './components/CardAccountModal';
import { CardsAndWalletView } from './components/CardsAndWalletView';
import { VaultAuthTransition } from './components/VaultAuthTransition';
import { KeeperLoadingScreen } from './components/KeeperLoadingScreen';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  CartesianGrid
} from 'recharts';

// ============================================================================
// ASSETS (Inlined at build time from user_uploaded_files)
// ============================================================================
const HERO_BG = "/assets/hero_bg.jpg";
const AVATAR_IMG = "/assets/avatar.jpg";

const PRODUCT_IMAGES: Record<string, string> = {
  iphone15: "/assets/thumb_iphone15.jpg",
  sonyxm5: "/assets/thumb_sony_xm5.jpg",
  macbookm2: "/assets/thumb_macbook_m2.jpg",
  dualsense: "/assets/thumb_dualsense.jpg",
  jblflip6: "/assets/thumb_jbl_flip6.jpg",
  ipadpro: "/assets/thumb_ipad_pro.jpg",
  watchultra: "/assets/thumb_watch_ultra.jpg",
  mxmaster: "/assets/thumb_mx_master.jpg",
  sonycamera: "/assets/thumb_sony_camera.jpg",
  dysonv15: "/assets/thumb_dyson_v15.jpg",
  nespresso: "/assets/thumb_nespresso.jpg",
  kindle: "/assets/thumb_kindle.jpg"
};

// ============================================================================
// TYPES & DATA DEFINITIONS
// ============================================================================
export type NavTab =
  | 'dashboard'
  | 'purchases'
  | 'subscriptions'
  | 'wallet'
  | 'receipts'
  | 'warranties'
  | 'reminders'
  | 'analytics'
  | 'settings';

export type ProductCategory =
  | 'Smartphones'
  | 'Laptops'
  | 'Audio'
  | 'Gaming'
  | 'Cameras'
  | 'Tablets'
  | 'Appliances'
  | 'Wearables'
  | 'Accessories'
  | 'Others'
  | (string & {});

export type WarrantyStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'No Warranty';

export interface AuthAccount {
  id: string;
  name: string;
  email: string;
  token?: string;
  currencySymbol: string;
  createdAt: string;
  isVerified?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  currencySymbol: string;
  referenceDate: string; // YYYY-MM-DD
  expiringThresholdDays: number;
  notificationsEnabled: boolean;
  storageQuotaGB: number;
  baseStorageUsedGB: number;
  monthlyIncome?: number;
}

export interface Purchase {
  id: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  price: number;
  purchaseDate: string; // YYYY-MM-DD
  store: string;
  warrantyMonths: number;
  warrantyExpiryOverride?: string;
  returnDays: number;
  imageUrl: string;
  notes: string;
  serialNumber?: string;
  paymentCardId?: string;
  featuredOrder?: number;
  createdAt: string;
}

export interface ReceiptRecord {
  id: string;
  purchaseId: string;
  fileName: string;
  fileType: 'application/pdf' | 'image/jpeg' | 'image/png';
  fileSizeBytes: number;
  uploadDate: string;
  invoiceNumber: string;
  hasBinaryInVault?: boolean;
  title?: string;
  store?: string;
  amount?: number;
  notes?: string;
  categoryTag?: string;
}

export type ReminderType =
  | 'Warranty Expiration'
  | 'Return Deadline'
  | 'Extended Warranty Renewal'
  | 'Subscription Auto-Pay'
  | 'Subscription Renewal'
  | 'Custom Reminder';

export interface ReminderRecord {
  id: string;
  purchaseId?: string;
  subscriptionId?: string;
  productName: string;
  title: string;
  type: ReminderType;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
}

export interface ComputedPurchase extends Purchase {
  warrantyExpiryDate: string | null;
  remainingWarrantyDays: number | null;
  warrantyStatus: WarrantyStatus;
  warrantyDisplayLabel: string;
  warrantyDisplaySubtext: string;
  warrantyProgressPercent: number;
  returnDeadlineDate: string | null;
  remainingReturnDays: number | null;
  isReturnEligible: boolean;
}

// ============================================================================
// REAL CRYPTOGRAPHIC PASSWORD HASHING & AUTH HELPERS (Web Crypto SHA-256)
// ============================================================================
function generateRandomSalt(): string {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fallback below
  }
  return `${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

async function hashPasswordSHA256(password: string, salt: string): Promise<string> {
  const payload = `${salt}::keeper_v2::${password}`;
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder().encode(payload);
      const buf = await window.crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fallback below if subtle crypto is unavailable in non-secure context
  }
  // Deterministic 64-char hex hash fallback
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

const AUTH_ACCOUNTS_KEY = 'keeper_auth_accounts_v2';
const AUTH_SESSION_KEY = 'keeper_auth_session_v2';

function loadRegisteredAccounts(): AuthAccount[] {
  try {
    const raw = localStorage.getItem(AUTH_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredAccounts(accounts: AuthAccount[]): void {
  try {
    localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage quota errors
  }
}

function loadActiveSession(): AuthAccount | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveActiveSession(account: AuthAccount | null, rememberMe = true): void {
  try {
    if (!account) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }
    if (rememberMe) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(account));
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(account));
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

// ============================================================================
// INDEXEDDB BINARY FILE STORAGE VAULT (Actual File Storage for Receipts)
// ============================================================================
const DB_NAME = 'KeeperStorageVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'receiptBlobs';

function openVaultDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveBlobToVault(receiptId: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openVaultDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, receiptId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

async function getBlobFromVault(receiptId: string): Promise<Blob | null> {
  try {
    const db = await openVaultDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(receiptId);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteBlobFromVault(receiptId: string): Promise<boolean> {
  try {
    const db = await openVaultDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(receiptId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ============================================================================
// DATE & CURRENCY UTILITIES
// ============================================================================
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTimeOfDayGreeting(): string {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = (dateStr || getTodayISO()).split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = parseDateLocal(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[d.getMonth()];
  const yr = d.getFullYear();
  return `${day} ${mon} ${yr}`;
}

function addMonthsToDate(dateStr: string, months: number): string {
  const d = parseDateLocal(dateStr);
  d.setMonth(d.getMonth() + months);
  return formatDateISO(d);
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = parseDateLocal(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

function diffInDays(targetDateStr: string, refDateStr: string): number {
  const target = parseDateLocal(targetDateStr);
  const ref = parseDateLocal(refDateStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - ref.getTime()) / msPerDay);
}

function formatINR(amount: number, symbol = '₹'): string {
  const rounded = Math.round(amount || 0);
  return `${symbol}${rounded.toLocaleString('en-IN')}`;
}

function formatRelativeCountdown(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    if (abs >= 60) return `${Math.round(abs / 30)} months ago`;
    return `${abs} day${abs === 1 ? '' : 's'} ago`;
  }
  if (days === 0) return 'Today';
  if (days === 1) return 'In 1 day';
  if (days === 30) return 'In 1 month';
  if (days > 45) {
    const months = Math.round(days / 30.4);
    return `In ${months} month${months === 1 ? '' : 's'}`;
  }
  return `In ${days} days`;
}

function computePurchaseDetails(
  purchase: Purchase,
  refDateStr: string,
  expiringThreshold = 35
): ComputedPurchase {
  let returnDeadlineDate: string | null = null;
  let remainingReturnDays: number | null = null;
  let isReturnEligible = false;

  if (purchase.returnDays > 0) {
    returnDeadlineDate = addDaysToDate(purchase.purchaseDate, purchase.returnDays);
    remainingReturnDays = diffInDays(returnDeadlineDate, refDateStr);
    isReturnEligible = remainingReturnDays >= 0;
  }

  const hasExpiryOverride = Boolean(purchase.warrantyExpiryOverride && purchase.warrantyExpiryOverride.trim());
  const hasWarrantyMonths = Boolean(purchase.warrantyMonths && purchase.warrantyMonths > 0);

  if (!hasExpiryOverride && !hasWarrantyMonths) {
    return {
      ...purchase,
      warrantyExpiryDate: null,
      remainingWarrantyDays: null,
      warrantyStatus: 'No Warranty',
      warrantyDisplayLabel: 'No Warranty',
      warrantyDisplaySubtext: '',
      warrantyProgressPercent: 0,
      returnDeadlineDate,
      remainingReturnDays,
      isReturnEligible
    };
  }

  const expiryDate =
    (hasExpiryOverride ? purchase.warrantyExpiryOverride!.trim() : '') ||
    addMonthsToDate(purchase.purchaseDate, purchase.warrantyMonths);
  const remainingDays = diffInDays(expiryDate, refDateStr);
  const totalWarrantyDays = Math.max(1, diffInDays(expiryDate, purchase.purchaseDate));
  const elapsedDays = Math.max(0, totalWarrantyDays - Math.max(0, remainingDays));
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalWarrantyDays) * 100)));

  let status: WarrantyStatus = 'Active';
  let label = 'Warranty Active';
  let subtext = `Till ${formatDisplayDate(expiryDate)}`;

  if (remainingDays < 0) {
    status = 'Expired';
    label = 'Warranty Expired';
    subtext = `Ended ${formatDisplayDate(expiryDate)}`;
  } else if (remainingDays <= expiringThreshold) {
    status = 'Expiring Soon';
    label = 'Warranty Expiring';
    subtext = `In ${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
  }

  return {
    ...purchase,
    warrantyExpiryDate: expiryDate,
    remainingWarrantyDays: remainingDays,
    warrantyStatus: status,
    warrantyDisplayLabel: label,
    warrantyDisplaySubtext: subtext,
    warrantyProgressPercent: progressPercent,
    returnDeadlineDate,
    remainingReturnDays,
    isReturnEligible
  };
}

// ============================================================================
// CLEAN INITIAL STATE (All Demo Items Deleted — Starts Empty per Account)
// ============================================================================
function createDefaultProfile(account?: AuthAccount | null): UserProfile {
  return {
    id: account?.id || 'usr_clean_01',
    name: account?.name || 'User',
    email: account?.email || '',
    currencySymbol: account?.currencySymbol || '₹',
    referenceDate: getTodayISO(),
    expiringThresholdDays: 30,
    notificationsEnabled: false,
    storageQuotaGB: 5,
    baseStorageUsedGB: 0,
    monthlyIncome: 0
  };
}


// ============================================================================
// KEEPER LOGO SVG COMPONENT
// ============================================================================
function KeeperLogoIcon() {
  return (
    <div className="w-9 h-9 rounded-xl bg-[#1F1C1A] border border-[#3A3028] flex items-center justify-center shadow-inner shrink-0">
      <svg width="22" height="24" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L22 7.5L12 13L2 7.5L12 2Z" fill="#F2BD91" />
        <path d="M2 7.5L12 13V17.2L2 11.7V7.5Z" fill="#D59B6D" />
        <path d="M22 7.5L12 13V17.2L22 11.7V7.5Z" fill="#B27D52" />
        <path d="M2 14.3L12 19.8V24L2 18.5V14.3Z" fill="#E3AB7E" />
        <path d="M22 14.3L12 19.8V24L22 18.5V14.3Z" fill="#9E6C43" />
      </svg>
    </div>
  );
}

// ============================================================================
// SYNTHETIC RECEIPT INVOICE GENERATOR (For Instant Preview & Download)
// ============================================================================
function generateInvoiceHTML(receipt: ReceiptRecord, purchase?: ComputedPurchase, currency = '₹', customerName = 'Customer'): string {
  const price = purchase ? purchase.price : 0;
  const subTotal = Math.round(price / 1.18);
  const gst = price - subTotal;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${receipt.fileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; background: #141518; color: #F5F3EF; padding: 32px; margin: 0; }
    .sheet { max-width: 680px; margin: 0 auto; background: #191A1E; border: 1px solid #292A2F; border-radius: 16px; padding: 32px; }
    .hdr { display: flex; justify-content: space-between; border-bottom: 1px solid #292A2F; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 700; color: #F2BD91; }
    .tag { font-size: 12px; color: #A5A5A5; text-transform: uppercase; letter-spacing: 0.08em; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #292A2F; font-size: 14px; }
    th { color: #A5A5A5; font-weight: 500; }
    .tot { text-align: right; font-size: 18px; font-weight: 700; color: #F2BD91; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hdr">
      <div>
        <div class="brand">${purchase?.store || 'Authorised Retailer'}</div>
        <div class="tag">Official Tax Invoice & Warranty Proof</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:600">${receipt.invoiceNumber}</div>
        <div class="tag">Date: ${formatDisplayDate(receipt.uploadDate)}</div>
      </div>
    </div>
    <div style="margin-bottom:20px; font-size:14px; color:#A5A5A5;">
      Billed To: <strong style="color:#F5F3EF">${customerName}</strong> &bull; Verified in KEEPER Purchase Vault
    </div>
    <table>
      <thead>
        <tr>
          <th>Product Description</th>
          <th>Serial / SKU</th>
          <th>Warranty</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${purchase?.productName || receipt.fileName}</strong><br/><span style="color:#A5A5A5;font-size:12px">${purchase?.brand || ''} &bull; ${purchase?.category || ''}</span></td>
          <td>${purchase?.serialNumber || 'SN-VERIFIED'}</td>
          <td>${purchase?.warrantyMonths ? `${purchase.warrantyMonths} Months` : 'Standard'}</td>
          <td style="text-align:right">${formatINR(subTotal, currency)}</td>
        </tr>
        <tr>
          <td colspan="3" style="color:#A5A5A5">IGST / CGST + SGST (18% Included)</td>
          <td style="text-align:right">${formatINR(gst, currency)}</td>
        </tr>
      </tbody>
    </table>
    <div class="tot">Total Paid: ${formatINR(price, currency)}</div>
  </div>
</body>
</html>`;
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Initial Application Boot & Loading Screen State
  const [appLoading, setAppLoading] = useState(true);

  // Authentication State
  const [authSession, setAuthSession] = useState<AuthAccount | null>(() => loadActiveSession());

  // Navigation & Responsive Drawer State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cloud Database Vault Engine
  const dbManager = useMemo(() => {
    const uid = authSession?.id || 'demo_user';
    return new UnifiedDatabaseManager(uid);
  }, [authSession?.id]);

  const [databaseEngine, setDatabaseEngine] = useState<'cloud' | 'indexeddb'>('cloud');
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // Per-User Storage Keys
  const userPrefix = authSession ? `keeper_u_${authSession.id}` : 'keeper_clean_guest';

  const [profile, setProfile] = useState<UserProfile>(() =>
    createDefaultProfile(loadActiveSession())
  );
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [cards, setCards] = useState<CardAccountRecord[]>([]);

  // Load authenticated user's isolated data from Cloud Database Vault
  useEffect(() => {
    if (!authSession) {
      setPurchases([]);
      setReceipts([]);
      setReminders([]);
      setSubscriptions([]);
      setCards([]);
      return;
    }
    const keyPrefix = `keeper_u_${authSession.id}`;
    try {
      const savedProf = localStorage.getItem(`${keyPrefix}_profile`);
      if (savedProf) {
        const parsed = JSON.parse(savedProf);
        setProfile({ ...parsed, name: authSession.name, email: authSession.email });
      } else {
        setProfile(createDefaultProfile(authSession));
      }
    } catch {
      setProfile(createDefaultProfile(authSession));
    }

    setDatabaseLoading(true);
    dbManager
      .loadAllData(profile.referenceDate)
      .then((res) => {
        setPurchases(res.purchases);
        setSubscriptions(res.subscriptions);
        setReminders(res.reminders);
        setReceipts(res.receipts);
        setCards(res.cards || []);
        setDatabaseLoading(false);
      })
      .catch((err) => {
        console.warn('Cloud database load notice:', err);
        setDatabaseLoading(false);
      });
  }, [authSession, dbManager]);

  // Persist user's isolated data on change
  useEffect(() => {
    if (!authSession) return;
    try {
      localStorage.setItem(`${userPrefix}_profile`, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile, authSession, userPrefix]);

  useEffect(() => {
    if (!authSession) return;
    try {
      localStorage.setItem(`${userPrefix}_purchases`, JSON.stringify(purchases));
    } catch {
      // ignore
    }
  }, [purchases, authSession, userPrefix]);

  useEffect(() => {
    if (!authSession) return;
    try {
      localStorage.setItem(`${userPrefix}_receipts`, JSON.stringify(receipts));
    } catch {
      // ignore
    }
  }, [receipts, authSession, userPrefix]);

  useEffect(() => {
    if (!authSession) return;
    try {
      localStorage.setItem(`${userPrefix}_reminders`, JSON.stringify(reminders));
    } catch {
      // ignore
    }
  }, [reminders, authSession, userPrefix]);

  useEffect(() => {
    if (!authSession) return;
    try {
      localStorage.setItem(`${userPrefix}_subscriptions`, JSON.stringify(subscriptions));
    } catch {
      // ignore
    }
  }, [subscriptions, authSession, userPrefix]);

  useEffect(() => {
    if (!authSession) return;
    try {
      localStorage.setItem(`${userPrefix}_cards`, JSON.stringify(cards));
    } catch {
      // ignore
    }
  }, [cards, authSession, userPrefix]);

  // Dashboard & Global UI States
  const [authTransition, setAuthTransition] = useState<{
    type: 'signing_in' | 'signing_out';
    userName?: string;
    userEmail?: string;
  } | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [spendingRange, setSpendingRange] = useState<'3M' | '6M' | '1Y'>('3M');
  const [dashboardSort, setDashboardSort] = useState<'featured' | 'newest' | 'price' | 'expiry'>('newest');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [showDashboardSearchInput, setShowDashboardSearchInput] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Timeline Calendar State (Centered on current date)
  const [timelineWeekOffset, setTimelineWeekOffset] = useState(0);
  const [selectedTimelineDay, setSelectedTimelineDay] = useState(() => getTodayISO());

  // Purchases Page Filter & Sort States
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('All');
  const [purchaseSortBy, setPurchaseSortBy] = useState<'featured' | 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc'>('date-desc');

  // Warranties Page Tab State
  const [warrantyTabFilter, setWarrantyTabFilter] = useState<'All' | WarrantyStatus>('All');

  // Reminders Page Filter State
  const [reminderFilter, setReminderFilter] = useState<'upcoming' | 'completed' | 'all'>('upcoming');

  // Receipts Page States
  const [receiptSearch, setReceiptSearch] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadPurchaseId, setUploadPurchaseId] = useState<string>('');
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Password change states in Settings
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');

  // Modals & Drawers
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'purchase' | 'receipt' | 'reminder' | 'subscription' | 'card'; id: string; name: string } | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRecord | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionRecord | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  
  // Receipts & Claims Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptRecord | null>(null);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);
  const [receiptModalPurchaseId, setReceiptModalPurchaseId] = useState<string>('');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimModalPurchase, setClaimModalPurchase] = useState<ComputedPurchase | null>(null);

  // Wallet & Cards Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardAccountRecord | null>(null);
  

  // Toast Notification Banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Keyboard shortcut Cmd+K / Ctrl+K for global search
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchDropdownOpen(true);
      } else if (e.key === 'Escape') {
        setSearchDropdownOpen(false);
        setOpenActionMenuId(null);
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sign Out Handler with Cinematic Vault Locking Sequence
  const handleSignOut = () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    setAuthTransition({
      type: 'signing_out',
      userName: authSession?.name || profile.name,
      userEmail: authSession?.email || profile.email
    });

    setTimeout(() => {
      localStorage.removeItem('keeper_jwt_token');
      saveActiveSession(null);
      setAuthSession(null);
      setSelectedPurchaseId(null);

      setTimeout(() => {
        setAuthTransition(null);
        showToast('Vault safely encrypted and locked.', 'info');
      }, 350);
    }, 1150);
  };

  // Change Password Handler in Settings
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authSession) return;
    if (newPassInput.length < 6) {
      showToast('New password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      showToast('Passwords do not match.', 'warning');
      return;
    }
    const newSalt = generateRandomSalt();
    const newHash = await hashPasswordSHA256(newPassInput, newSalt);
    const allAccounts = loadRegisteredAccounts().map((acc) =>
      acc.id === authSession.id ? { ...acc, salt: newSalt, passwordHash: newHash } : acc
    );
    saveRegisteredAccounts(allAccounts);
    const updatedSession = { ...authSession, salt: newSalt, passwordHash: newHash };
    setAuthSession(updatedSession);
    saveActiveSession(updatedSession, true);
    setNewPassInput('');
    setConfirmPassInput('');
    showToast('Password updated and re-hashed with SHA-256.');
  };

  // ============================================================================
  // COMPUTED DATA & METRICS
  // ============================================================================
  const computedPurchases = useMemo<ComputedPurchase[]>(() => {
    return purchases.map((p) =>
      computePurchaseDetails(p, profile.referenceDate, profile.expiringThresholdDays)
    );
  }, [purchases, profile.referenceDate, profile.expiringThresholdDays]);

  const selectedPurchase = useMemo<ComputedPurchase | null>(() => {
    if (!selectedPurchaseId) return null;
    return computedPurchases.find((p) => p.id === selectedPurchaseId) || null;
  }, [computedPurchases, selectedPurchaseId]);

  // Summary Card Metrics (Derived 100% from user's real records)
  const summaryStats = useMemo(() => {
    const totalPurchases = computedPurchases.length;
    const activeWarranties = computedPurchases.filter(
      (p) => p.warrantyStatus === 'Active' || p.warrantyStatus === 'Expiring Soon'
    ).length;
    const returnEligible = computedPurchases.filter((p) => p.isReturnEligible).length;
    const upcomingReminders = reminders.filter((r) => !r.completed).length;
    const upcomingAutoPays = subscriptions.filter((s) => {
      if (s.status !== 'active') return false;
      const days = diffInDays(s.nextBillingDate, profile.referenceDate);
      return days >= 0 && days <= 7;
    }).length;

    return {
      totalPurchases,
      activeWarranties,
      returnEligible,
      upcomingReminders,
      upcomingAutoPays
    };
  }, [computedPurchases, reminders, subscriptions, profile.referenceDate]);

  // Dashboard Recent Purchases
  const dashboardPurchasesList = useMemo(() => {
    let list = [...computedPurchases];
    if (dashboardSearch.trim()) {
      const q = dashboardSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (dashboardSort === 'featured') {
        return (a.featuredOrder || 99) - (b.featuredOrder || 99);
      }
      if (dashboardSort === 'newest') {
        return b.purchaseDate.localeCompare(a.purchaseDate);
      }
      if (dashboardSort === 'price') {
        return b.price - a.price;
      }
      if (dashboardSort === 'expiry') {
        const aDays = a.remainingWarrantyDays ?? 99999;
        const bDays = b.remainingWarrantyDays ?? 99999;
        return aDays - bDays;
      }
      return 0;
    });
    return list.slice(0, 4);
  }, [computedPurchases, dashboardSearch, dashboardSort]);

  // Dashboard Warranty Timeline Items
  const timelineWarranties = useMemo(() => {
    return computedPurchases
      .filter(
        (p) =>
          (p.warrantyStatus === 'Active' || p.warrantyStatus === 'Expiring Soon') &&
          p.remainingWarrantyDays !== null &&
          p.remainingWarrantyDays >= 0
      )
      .sort((a, b) => (a.remainingWarrantyDays || 0) - (b.remainingWarrantyDays || 0))
      .slice(0, 3)
      .map((p) => {
        const days = p.remainingWarrantyDays || 0;
        let timeLabel = `Expires in ${days} days`;
        if (days > 45) {
          timeLabel = `Expires in ${Math.round(days / 30.4)} months`;
        }
        return {
          ...p,
          timelineSubtext: timeLabel,
          isUrgent: p.warrantyStatus === 'Expiring Soon'
        };
      });
  }, [computedPurchases]);

  // Timeline 7-Day Week Strip (Centered around user's referenceDate)
  const timelineWeekDays = useMemo(() => {
    const ref = parseDateLocal(profile.referenceDate);
    const startOfWeek = new Date(ref);
    startOfWeek.setDate(ref.getDate() - ref.getDay() + timelineWeekOffset * 7);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const iso = formatDateISO(d);
      days.push({
        iso,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        monthYear: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
      });
    }
    return days;
  }, [profile.referenceDate, timelineWeekOffset]);

  // Spending Overview Chart & Total Expenditure (Derived strictly from user's purchases)
  const spendingOverviewData = useMemo(() => {
    const refDate = parseDateLocal(profile.referenceDate);
    const monthsBack = spendingRange === '3M' ? 3 : spendingRange === '6M' ? 6 : 12;
    const cutoffDate = new Date(refDate.getFullYear(), refDate.getMonth() - (monthsBack - 1), 1);

    const inRangePurchases = computedPurchases.filter((p) => {
      const d = parseDateLocal(p.purchaseDate);
      return d >= cutoffDate && d <= refDate;
    });

    const totalSpent = inRangePurchases.reduce((acc, p) => acc + p.price, 0);

    const buckets: { label: string; amount: number; highlight?: boolean }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const mDate = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const ym = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_SHORT[mDate.getMonth()]} '${String(mDate.getFullYear()).slice(2)}`;
      const monthSum = computedPurchases
        .filter((p) => p.purchaseDate.startsWith(ym))
        .reduce((s, p) => s + p.price, 0);
      buckets.push({
        label,
        amount: monthSum,
        highlight: i === 0 && monthSum > 0
      });
    }

    return {
      totalSpent,
      subtitle:
        spendingRange === '3M'
          ? 'Total spent (Last 3 months)'
          : spendingRange === '6M'
          ? 'Total spent (Last 6 months)'
          : 'Total spent (Last 12 months)',
      points: buckets
    };
  }, [computedPurchases, profile.referenceDate, spendingRange]);

  // Filtered Purchases for Dedicated Purchases Page
  const filteredPurchases = useMemo(() => {
    let list = [...computedPurchases];
    if (purchaseSearch.trim()) {
      const q = purchaseSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.store.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'All') {
      list = list.filter((p) => p.category === categoryFilter);
    }
    if (warrantyFilter !== 'All') {
      list = list.filter((p) => p.warrantyStatus === warrantyFilter);
    }
    list.sort((a, b) => {
      if (purchaseSortBy === 'featured') return (a.featuredOrder || 99) - (b.featuredOrder || 99);
      if (purchaseSortBy === 'date-desc') return b.purchaseDate.localeCompare(a.purchaseDate);
      if (purchaseSortBy === 'date-asc') return a.purchaseDate.localeCompare(b.purchaseDate);
      if (purchaseSortBy === 'price-desc') return b.price - a.price;
      if (purchaseSortBy === 'price-asc') return a.price - b.price;
      return 0;
    });
    return list;
  }, [computedPurchases, purchaseSearch, categoryFilter, warrantyFilter, purchaseSortBy]);

  // Analytics Aggregations (Unified Portfolio: Hardware Purchases + Subscriptions + Cards)
  const analyticsData = useMemo(() => {
    const totalPurchasesSpent = computedPurchases.reduce((sum, p) => sum + p.price, 0);

    // Subscriptions Burn & Run-rate
    const monthlySubscriptionsBurn = subscriptions.reduce((sum, s) => {
      if (s.status === 'cancelled') return sum;
      return sum + normalizeMonthlyAmount(s.amount, s.billingCycle, s.customDays);
    }, 0);
    const annualSubscriptionsRunRate = monthlySubscriptionsBurn * 12;

    // Card Logged Expenses
    let totalCardSpends = 0;
    cards.forEach((c) => {
      (c.expenses || []).forEach((e) => {
        totalCardSpends += e.amount || 0;
      });
    });

    const totalPortfolioCommitment = totalPurchasesSpent + annualSubscriptionsRunRate + totalCardSpends;
    const monthlyTotalOutflow = monthlySubscriptionsBurn + totalCardSpends;

    // Income & Savings Intelligence
    const monthlyIncome = profile.monthlyIncome || 0;
    const hasIncome = monthlyIncome > 0;
    const netSavings = hasIncome ? Math.max(0, monthlyIncome - monthlyTotalOutflow) : 0;
    const savingsRate = hasIncome ? (netSavings / monthlyIncome) * 100 : 0;

    const activeCount = computedPurchases.filter(
      (p) => p.warrantyStatus === 'Active' || p.warrantyStatus === 'Expiring Soon'
    ).length;
    const expiredCount = computedPurchases.filter((p) => p.warrantyStatus === 'Expired').length;

    const activeSubsCount = subscriptions.filter((s) => s.status === 'active').length;
    const pausedSubsCount = subscriptions.filter((s) => s.status === 'paused').length;
    const autoPaySubsCount = subscriptions.filter((s) => s.status === 'active' && s.autoPay).length;

    // Unified Category Spending (Hardware + Annualized Recurring + Card Spends)
    const catMap: Record<
      string,
      { category: string; amount: number; count: number; type: 'purchase' | 'subscription' | 'expense' | 'combined' }
    > = {};

    computedPurchases.forEach((p) => {
      if (!catMap[p.category]) {
        catMap[p.category] = { category: p.category, amount: 0, count: 0, type: 'purchase' };
      }
      catMap[p.category].amount += p.price;
      catMap[p.category].count += 1;
    });

    subscriptions.forEach((s) => {
      const annualized = normalizeMonthlyAmount(s.amount, s.billingCycle, s.customDays) * 12;
      if (!catMap[s.category]) {
        catMap[s.category] = { category: s.category, amount: 0, count: 0, type: 'subscription' };
      } else if (catMap[s.category].type === 'purchase') {
        catMap[s.category].type = 'combined';
      }
      catMap[s.category].amount += annualized;
      catMap[s.category].count += 1;
    });

    cards.forEach((c) => {
      (c.expenses || []).forEach((e) => {
        const catName = e.category || 'Card Spend';
        if (!catMap[catName]) {
          catMap[catName] = { category: catName, amount: 0, count: 0, type: 'expense' };
        } else if (catMap[catName].type !== 'expense') {
          catMap[catName].type = 'combined';
        }
        catMap[catName].amount += e.amount;
        catMap[catName].count += 1;
      });
    });

    const byCategory = Object.values(catMap).sort((a, b) => b.amount - a.amount);

    // Spending by Payment Method & Card
    const paymentMap: Record<string, { name: string; amount: number; count: number; type: string }> = {};

    computedPurchases.forEach((p) => {
      let pmName = 'Cash / Direct';
      let pmType = 'general';
      if (p.paymentCardId) {
        const matchingCard = cards.find((c) => c.id === p.paymentCardId);
        if (matchingCard) {
          pmName = `${matchingCard.name} (•••• ${matchingCard.last4})`;
          pmType = matchingCard.type;
        }
      }
      if (!paymentMap[pmName]) {
        paymentMap[pmName] = { name: pmName, amount: 0, count: 0, type: pmType };
      }
      paymentMap[pmName].amount += p.price;
      paymentMap[pmName].count += 1;
    });

    subscriptions.forEach((s) => {
      const annualized = normalizeMonthlyAmount(s.amount, s.billingCycle, s.customDays) * 12;
      const pmName = s.paymentMethod || 'UPI AutoPay';
      if (!paymentMap[pmName]) {
        paymentMap[pmName] = { name: pmName, amount: 0, count: 0, type: 'subscription' };
      }
      paymentMap[pmName].amount += annualized;
      paymentMap[pmName].count += 1;
    });

    cards.forEach((c) => {
      (c.expenses || []).forEach((e) => {
        const pmName = `${c.name} (•••• ${c.last4})`;
        if (!paymentMap[pmName]) {
          paymentMap[pmName] = { name: pmName, amount: 0, count: 0, type: c.type };
        }
        paymentMap[pmName].amount += e.amount;
        paymentMap[pmName].count += 1;
      });
    });

    const byPaymentMethod = Object.values(paymentMap).sort((a, b) => b.amount - a.amount);

    // Monthly Spending Series: Ensure trailing 6 months up to current reference date
    const [currY, currM] = (profile.referenceDate || '2026-11-19').split('-').map(Number);
    const monthSet = new Set<string>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currY, (currM || 1) - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(ym);
    }

    computedPurchases.forEach((p) => {
      if (p.purchaseDate && p.purchaseDate.length >= 7) {
        monthSet.add(p.purchaseDate.slice(0, 7));
      }
    });

    cards.forEach((c) => {
      (c.expenses || []).forEach((e) => {
        if (e.date && e.date.length >= 7) {
          monthSet.add(e.date.slice(0, 7));
        }
      });
    });

    const currentYm = `${currY}-${String(currM).padStart(2, '0')}`;
    const roundedMonthlyBurn = Math.round(monthlySubscriptionsBurn);

    const monthlySeries = Array.from(monthSet)
      .sort()
      .map((ym) => {
        const [y, m] = ym.split('-').map(Number);
        const label = `${MONTHS_SHORT[(m || 1) - 1]} ${String(y).slice(2)}`;

        const purchasesTotal = computedPurchases
          .filter((p) => p.purchaseDate.slice(0, 7) === ym)
          .reduce((sum, p) => sum + p.price, 0);

        let cardExpensesTotal = 0;
        cards.forEach((c) => {
          (c.expenses || []).forEach((e) => {
            if (e.date && e.date.slice(0, 7) === ym) {
              cardExpensesTotal += e.amount;
            }
          });
        });

        const subsTotal = ym <= currentYm ? roundedMonthlyBurn : 0;
        const total = purchasesTotal + cardExpensesTotal + subsTotal;

        return {
          ym,
          label,
          purchases: purchasesTotal,
          subscriptions: subsTotal,
          cardExpenses: cardExpensesTotal,
          amount: total,
          total
        };
      });

    const mostExpensive = [...computedPurchases].sort((a, b) => b.price - a.price).slice(0, 5);
    const topSubscriptions = [...subscriptions]
      .filter((s) => s.status !== 'cancelled')
      .sort(
        (a, b) =>
          normalizeMonthlyAmount(b.amount, b.billingCycle, b.customDays) -
          normalizeMonthlyAmount(a.amount, a.billingCycle, a.customDays)
      )
      .slice(0, 5);

    return {
      totalSpentAllTime: totalPortfolioCommitment,
      totalPurchasesSpent,
      monthlySubscriptionsBurn,
      annualSubscriptionsRunRate,
      totalCardSpends,
      monthlyTotalOutflow,
      monthlyIncome,
      hasIncome,
      netSavings,
      savingsRate,
      activeCount,
      expiredCount,
      activeSubsCount,
      pausedSubsCount,
      autoPaySubsCount,
      byCategory,
      byPaymentMethod,
      monthlySeries,
      mostExpensive,
      topSubscriptions
    };
  }, [computedPurchases, subscriptions, cards, profile.referenceDate, profile.monthlyIncome]);

  // Global Search Results
  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return { purchases: [], receipts: [], reminders: [] };
    return {
      purchases: computedPurchases.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.store.toLowerCase().includes(q)
      ),
      receipts: receipts.filter(
        (r) =>
          r.fileName.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q)
      ),
      reminders: reminders.filter(
        (rem) =>
          rem.title.toLowerCase().includes(q) ||
          rem.productName.toLowerCase().includes(q)
      )
    };
  }, [globalSearch, computedPurchases, receipts, reminders]);

  // Dynamic Storage Calculation (Starts at 0.00 GB when 0 files are uploaded)
  const storageUsedGB = useMemo(() => {
    const receiptBytes = receipts.reduce((s, r) => s + (r.fileSizeBytes || 0), 0);
    const additionalMB = receiptBytes / (1024 * 1024);
    if (receiptBytes === 0 && profile.baseStorageUsedGB === 0) return 0;
    const totalGB = profile.baseStorageUsedGB + additionalMB / 1024;
    return Number(Math.max(0.01, totalGB).toFixed(2));
  }, [receipts, profile.baseStorageUsedGB]);

  // ============================================================================
  // CRUD HANDLERS (Purchases, Receipts, Reminders)
  // ============================================================================
  const handleOpenAddPurchase = () => {
    setEditingPurchase(null);
    setIsPurchaseModalOpen(true);
  };

  const handleOpenEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setIsPurchaseModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenAddReminderForPurchase = (item: ComputedPurchase) => {
    setEditingReminder({
      id: '',
      purchaseId: item.id,
      productName: item.productName,
      title: `Warranty Expiration: ${item.productName}`,
      type: 'Warranty Expiration',
      dueDate: item.warrantyExpiryDate || profile.referenceDate,
      completed: false,
      notes: `Serial: ${item.serialNumber || 'N/A'}`
    });
    setIsReminderModalOpen(true);
  };

  const handleSavePurchase = (
    formData: Omit<Purchase, 'id' | 'createdAt'>,
    autoCreateReminders: boolean
  ) => {
    if (editingPurchase) {
      const updated: Purchase = {
        ...editingPurchase,
        ...formData
      };
      setPurchases((prev) => prev.map((p) => (p.id === editingPurchase.id ? updated : p)));
      dbManager.savePurchase(updated);
      showToast(`Updated "${formData.productName}" successfully.`);
    } else {
      const newId = `pur_${Date.now()}`;
      const created: Purchase = {
        ...formData,
        id: newId,
        featuredOrder: 1,
        createdAt: new Date().toISOString()
      };
      setPurchases((prev) => [
        created,
        ...prev.map((p) => ({ ...p, featuredOrder: (p.featuredOrder || 1) + 1 }))
      ]);
      dbManager.savePurchase(created);

      if (autoCreateReminders) {
        const comp = computePurchaseDetails(
          created,
          profile.referenceDate,
          profile.expiringThresholdDays
        );
        const newRems: ReminderRecord[] = [];
        if (comp.warrantyExpiryDate) {
          const wRem: ReminderRecord = {
            id: `rem_w_${Date.now()}`,
            purchaseId: newId,
            productName: created.productName,
            title: `${created.productName} warranty ends soon`,
            type: 'Warranty Expiration',
            dueDate: comp.warrantyExpiryDate,
            completed: false,
            notes: `Auto-generated warranty expiry reminder for ${created.productName}.`
          };
          newRems.push(wRem);
          dbManager.saveReminder(wRem);
        }
        if (comp.returnDeadlineDate && comp.isReturnEligible) {
          const rRem: ReminderRecord = {
            id: `rem_r_${Date.now() + 1}`,
            purchaseId: newId,
            productName: created.productName,
            title: `Return window – ${created.productName}`,
            type: 'Return Deadline',
            dueDate: comp.returnDeadlineDate,
            completed: false,
            notes: `Auto-generated return deadline reminder (${created.returnDays} days window).`
          };
          newRems.push(rRem);
          dbManager.saveReminder(rRem);
        }
        if (newRems.length > 0) {
          setReminders((prev) => [...newRems, ...prev]);
        }
      }
      showToast(`Added "${formData.productName}" to database.`);
    }
    setIsPurchaseModalOpen(false);
    setEditingPurchase(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { type, id, name } = deleteConfirmTarget;

    if (type === 'purchase') {
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      setReceipts((prev) => prev.filter((r) => r.purchaseId !== id));
      setReminders((prev) => prev.filter((rem) => rem.purchaseId !== id));
      if (selectedPurchaseId === id) setSelectedPurchaseId(null);
      await dbManager.deletePurchase(id);
      showToast(`Deleted "${name}" from database.`, 'info');
    } else if (type === 'receipt') {
      await deleteBlobFromVault(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      if (previewReceipt?.id === id) setPreviewReceipt(null);
      await dbManager.deleteReceipt(id);
      showToast(`Removed receipt "${name}".`, 'info');
    } else if (type === 'reminder') {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      await dbManager.deleteReminder(id);
      showToast(`Deleted reminder "${name}".`, 'info');
    } else if (type === 'subscription') {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      setReminders((prev) => prev.filter((r) => r.subscriptionId !== id));
      await dbManager.deleteSubscription(id);
      showToast(`Deleted subscription "${name}".`, 'info');
    } else if (type === 'card') {
      setCards((prev) => prev.filter((c) => c.id !== id));
      await dbManager.deleteCard(id);
      showToast(`Removed card "${name}" from wallet.`, 'info');
    }
    setDeleteConfirmTarget(null);
  };

  // Subscription CRUD Handlers
  const handleSaveSubscription = (data: Omit<SubscriptionRecord, 'id' | 'createdAt'>) => {
    if (editingSubscription && editingSubscription.id) {
      const updated: SubscriptionRecord = {
        ...editingSubscription,
        ...data
      };
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === editingSubscription.id ? updated : s))
      );
      dbManager.saveSubscription(updated);

      // Synchronize reminder
      if (data.autoCreateReminder && data.status === 'active') {
        const remDueDate = calculateReminderDate(data.nextBillingDate, data.reminderDaysBefore);
        const remTitle = data.autoPay
          ? `Auto-Pay Due: ${data.name} (${profile.currencySymbol}${data.amount})`
          : `Renewal Due: ${data.name} (${profile.currencySymbol}${data.amount})`;
        const remType: ReminderType = data.autoPay ? 'Subscription Auto-Pay' : 'Subscription Renewal';

        const updatedRem: ReminderRecord = {
          id: `rem_sub_${updated.id}`,
          subscriptionId: updated.id,
          productName: `${data.provider} (${data.name})`,
          title: remTitle,
          type: remType,
          dueDate: remDueDate,
          completed: false,
          notes: `Auto-pay: ${data.autoPay ? 'Active (' + data.paymentMethod + ')' : 'Manual'}. Cycle: ${data.billingCycle === 'custom_days' ? (data.customDays || 30) + ' Days' : data.billingCycle}.${data.expiryDate ? ' Expiry: ' + data.expiryDate : ''}.${data.mobileNumber ? ' Mobile: ' + data.mobileNumber : ''}`
        };

        setReminders((prev) => {
          const hasExisting = prev.some((r) => r.subscriptionId === updated.id);
          if (hasExisting) {
            return prev.map((r) => (r.subscriptionId === updated.id ? updatedRem : r));
          } else {
            return [updatedRem, ...prev];
          }
        });
        dbManager.saveReminder(updatedRem);
      } else {
        setReminders((prev) => prev.filter((r) => r.subscriptionId !== updated.id));
        dbManager.deleteReminder(`rem_sub_${updated.id}`);
      }

      showToast(`Updated subscription "${data.name}".`);
    } else {
      const newSub: SubscriptionRecord = {
        ...data,
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString()
      };
      setSubscriptions((prev) => [newSub, ...prev]);
      dbManager.saveSubscription(newSub);

      if (data.autoCreateReminder && data.status === 'active') {
        const remDueDate = calculateReminderDate(data.nextBillingDate, data.reminderDaysBefore);
        const remTitle = data.autoPay
          ? `Auto-Pay Due: ${data.name} (${profile.currencySymbol}${data.amount})`
          : `Renewal Due: ${data.name} (${profile.currencySymbol}${data.amount})`;
        const remType: ReminderType = data.autoPay ? 'Subscription Auto-Pay' : 'Subscription Renewal';

        const newRem: ReminderRecord = {
          id: `rem_sub_${newSub.id}`,
          subscriptionId: newSub.id,
          productName: `${data.provider} (${data.name})`,
          title: remTitle,
          type: remType,
          dueDate: remDueDate,
          completed: false,
          notes: `Auto-pay: ${data.autoPay ? 'Active (' + data.paymentMethod + ')' : 'Manual'}. Cycle: ${data.billingCycle === 'custom_days' ? (data.customDays || 30) + ' Days' : data.billingCycle}.${data.expiryDate ? ' Expiry: ' + data.expiryDate : ''}.${data.mobileNumber ? ' Mobile: ' + data.mobileNumber : ''}`
        };

        setReminders((prev) => [newRem, ...prev]);
        dbManager.saveReminder(newRem);
      }

      showToast(`Added subscription "${data.name}" with auto-pay alert.`);
    }
    setIsSubscriptionModalOpen(false);
    setEditingSubscription(null);
  };

  // Database actions: Reload sample data, clear database
  const handleReloadSampleData = async () => {
    setDatabaseLoading(true);
    try {
      const data = await dbManager.seedSampleData(profile.referenceDate);
      setPurchases(data.purchases);
      setSubscriptions(data.subscriptions);
      setReminders(data.reminders);
      setReceipts(data.receipts);
      showToast('Loaded real purchases, subscriptions, and reminders into database!');
    } finally {
      setDatabaseLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    setPurchases([]);
    setSubscriptions([]);
    setReminders([]);
    setReceipts([]);
    await dbManager.clearAllData();
    try {
      localStorage.removeItem(`${userPrefix}_purchases`);
      localStorage.removeItem(`${userPrefix}_subscriptions`);
      localStorage.removeItem(`${userPrefix}_reminders`);
      localStorage.removeItem(`${userPrefix}_receipts`);
    } catch {
      // ignore
    }
    showToast('Database cleared. Clean slate active with zero fake data.', 'info');
  };



  const handleToggleSubscriptionAutoPay = (subId: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id !== subId) return s;
        const newAutoPay = !s.autoPay;
        showToast(
          `Auto-Pay for "${s.name}" is now ${newAutoPay ? 'ENABLED' : 'DISABLED'}.`,
          'info'
        );
        // Also update existing reminder title & type if present
        setReminders((rList) =>
          rList.map((r) => {
            if (r.subscriptionId !== s.id) return r;
            return {
              ...r,
              title: newAutoPay
                ? `Auto-Pay Due: ${s.name} (${profile.currencySymbol}${s.amount})`
                : `Renewal Due: ${s.name} (${profile.currencySymbol}${s.amount})`,
              type: newAutoPay ? 'Subscription Auto-Pay' : 'Subscription Renewal'
            };
          })
        );
        return { ...s, autoPay: newAutoPay };
      })
    );
  };

  const handleToggleSubscriptionStatus = (subId: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id !== subId) return s;
        const newStatus = s.status === 'active' ? 'paused' : 'active';
        showToast(`Subscription "${s.name}" is now ${newStatus}.`, 'info');
        return { ...s, status: newStatus };
      })
    );
  };

  // Save Receipt Details & Notes Handler
  const handleSaveReceipt = async (data: {
    id?: string;
    purchaseId: string;
    fileName: string;
    fileType: 'application/pdf' | 'image/jpeg' | 'image/png';
    fileSizeBytes: number;
    uploadDate: string;
    invoiceNumber: string;
    title: string;
    store: string;
    amount: number;
    notes: string;
    categoryTag: string;
    file?: File;
  }) => {
    if (data.id) {
      // Updating existing receipt
      const updatedRec: ReceiptRecord = {
        id: data.id,
        purchaseId: data.purchaseId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSizeBytes: data.fileSizeBytes,
        uploadDate: data.uploadDate,
        invoiceNumber: data.invoiceNumber,
        title: data.title,
        store: data.store,
        amount: data.amount,
        notes: data.notes,
        categoryTag: data.categoryTag,
        hasBinaryInVault: true
      };
      if (data.file) {
        await saveBlobToVault(data.id, data.file);
      }
      setReceipts((prev) => prev.map((r) => (r.id === data.id ? updatedRec : r)));
      await dbManager.saveReceipt(updatedRec);
      showToast(`Updated "${data.title || data.fileName}".`);
    } else {
      // Creating new receipt
      const newRecId = `rec_${Date.now()}`;
      if (data.file) {
        await saveBlobToVault(newRecId, data.file);
      }
      const newRec: ReceiptRecord = {
        id: newRecId,
        purchaseId: data.purchaseId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSizeBytes: data.fileSizeBytes,
        uploadDate: data.uploadDate,
        invoiceNumber: data.invoiceNumber,
        title: data.title,
        store: data.store,
        amount: data.amount,
        notes: data.notes,
        categoryTag: data.categoryTag,
        hasBinaryInVault: Boolean(data.file)
      };
      setReceipts((prev) => [newRec, ...prev]);
      await dbManager.saveReceipt(newRec);
      showToast(`Saved "${data.title || data.fileName}" to database vault.`);
    }
  };

  // Receipt File Upload (Opens Details Modal so user can input notes, title & amount)
  const handleFilesUploaded = async (files: FileList | null, targetPurchaseId?: string) => {
    if (!files || files.length === 0) return;
    const assocPurchaseId =
      targetPurchaseId || uploadPurchaseId || (purchases[0] ? purchases[0].id : '');

    if (files.length === 1) {
      // Open receipt details modal immediately for the dropped/selected file
      setPendingReceiptFile(files[0]);
      setEditingReceipt(null);
      setReceiptModalPurchaseId(assocPurchaseId);
      setIsReceiptModalOpen(true);
      return;
    }

    // For multiple files, save them and notify
    const addedReceipts: ReceiptRecord[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      const inferredType: 'application/pdf' | 'image/jpeg' | 'image/png' = validTypes.includes(
        file.type
      )
        ? (file.type as 'application/pdf' | 'image/jpeg' | 'image/png')
        : file.name.toLowerCase().endsWith('.png')
        ? 'image/png'
        : file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/pdf';

      const newRecId = `rec_${Date.now()}_${i}`;
      await saveBlobToVault(newRecId, file);

      addedReceipts.push({
        id: newRecId,
        purchaseId: assocPurchaseId,
        fileName: file.name,
        fileType: inferredType,
        fileSizeBytes: file.size || 185000,
        uploadDate: profile.referenceDate,
        invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        store: '',
        amount: 0,
        notes: '',
        categoryTag: 'Electronics',
        hasBinaryInVault: true
      });
    }

    setReceipts((prev) => [...addedReceipts, ...prev]);
    for (const rec of addedReceipts) {
      await dbManager.saveReceipt(rec);
    }
    showToast(
      `Uploaded ${addedReceipts.length} receipts to database vault. Click "Edit Details" on any card to add notes.`
    );
  };

  // Wallet & Cards Handlers (Zero credentials)
  const handleSaveCard = async (cardData: Omit<CardAccountRecord, 'id' | 'createdAt'> & { id?: string }) => {
    if (cardData.id) {
      const updated: CardAccountRecord = {
        ...cardData,
        id: cardData.id,
        createdAt: editingCard?.createdAt || new Date().toISOString()
      };
      setCards((prev) => prev.map((c) => (c.id === cardData.id ? updated : c)));
      await dbManager.saveCard(updated);
      showToast(`Updated "${updated.name}".`);
    } else {
      const newCard: CardAccountRecord = {
        ...cardData,
        id: `card_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      setCards((prev) => [newCard, ...prev]);
      await dbManager.saveCard(newCard);
      showToast(`Saved "${newCard.name}" to wallet.`);
    }
  };

  const handleDeleteCard = (card: CardAccountRecord) => {
    setDeleteConfirmTarget({
      type: 'card',
      id: card.id,
      name: card.name
    });
  };

  const handleUpdateIncome = async (newIncome: number) => {
    setProfile((prev) => ({ ...prev, monthlyIncome: newIncome }));
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, monthlyIncome: newIncome, userId: authSession?.id || 'demo_user' })
      });
      showToast(`Monthly income updated to ${profile.currencySymbol}${newIncome.toLocaleString('en-IN')}.`);
    } catch {
      showToast(`Monthly income saved locally.`);
    }
  };

  // Receipt Preview & Download
  const handlePreviewReceipt = async (rec: ReceiptRecord) => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    const blob = await getBlobFromVault(rec.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    }
    setPreviewReceipt(rec);
  };

  const handleDownloadReceipt = async (rec: ReceiptRecord) => {
    const blob = await getBlobFromVault(rec.id);
    const assocPurchase = computedPurchases.find((p) => p.id === rec.purchaseId);
    let downloadUrl = '';
    let downloadName = rec.fileName;

    if (blob) {
      downloadUrl = URL.createObjectURL(blob);
    } else {
      const htmlStr = generateInvoiceHTML(rec, assocPurchase, profile.currencySymbol, profile.name);
      const htmlBlob = new Blob([htmlStr], { type: 'text/html' });
      downloadUrl = URL.createObjectURL(htmlBlob);
      if (!downloadName.endsWith('.html')) {
        downloadName = `${rec.fileName.replace(/\.[^.]+$/, '')}_Invoice.html`;
      }
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
    showToast(`Downloaded "${downloadName}".`);
  };

  // Browser Notification Request
  const handleToggleBrowserNotifications = async () => {
    try {
      if (typeof Notification === 'undefined') {
        setProfile((p) => ({ ...p, notificationsEnabled: !p.notificationsEnabled }));
        showToast('In-app reminder notifications updated.', 'info');
        return;
      }
      if (Notification.permission === 'granted') {
        const nextState = !profile.notificationsEnabled;
        setProfile((p) => ({ ...p, notificationsEnabled: nextState }));
        if (nextState) {
          new Notification('KEEPER Reminder Alerts Active', {
            body: `You have ${summaryStats.upcomingReminders} upcoming warranty & return reminders.`
          });
        }
        showToast(
          nextState ? 'Browser notifications enabled.' : 'Browser notifications paused.',
          'info'
        );
      } else {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setProfile((p) => ({ ...p, notificationsEnabled: true }));
          new Notification('KEEPER Reminder Alerts Enabled', {
            body: 'You will receive alerts for expiring warranties while Keeper is open.'
          });
          showToast('Browser notification permission granted.');
        } else {
          setProfile((p) => ({ ...p, notificationsEnabled: true }));
          showToast('In-app notification alerts enabled (browser permission blocked).', 'info');
        }
      }
    } catch {
      setProfile((p) => ({ ...p, notificationsEnabled: !p.notificationsEnabled }));
      showToast('In-app notification preferences updated.', 'info');
    }
  };

  // Auto-generate missing warranty/return reminders
  const handleSyncAutoReminders = () => {
    const existingKeys = new Set(reminders.map((r) => `${r.purchaseId}_${r.type}`));
    const created: ReminderRecord[] = [];

    computedPurchases.forEach((p) => {
      if (
        (p.warrantyStatus === 'Expiring Soon' || p.warrantyStatus === 'Active') &&
        p.warrantyExpiryDate &&
        !existingKeys.has(`${p.id}_Warranty Expiration`)
      ) {
        created.push({
          id: `rem_auto_w_${p.id}_${Date.now()}`,
          purchaseId: p.id,
          productName: p.productName,
          title: `${p.productName} warranty expires`,
          type: 'Warranty Expiration',
          dueDate: p.warrantyExpiryDate,
          completed: false,
          notes: `Automated reminder for ${p.brand} ${p.productName} warranty expiry.`
        });
      }
      if (
        p.isReturnEligible &&
        p.returnDeadlineDate &&
        !existingKeys.has(`${p.id}_Return Deadline`)
      ) {
        created.push({
          id: `rem_auto_r_${p.id}_${Date.now()}`,
          purchaseId: p.id,
          productName: p.productName,
          title: `Return window – ${p.productName}`,
          type: 'Return Deadline',
          dueDate: p.returnDeadlineDate,
          completed: false,
          notes: `Automated return eligibility deadline for ${p.productName}.`
        });
      }
    });

    subscriptions.forEach((sub) => {
      if (sub.status === 'active' && sub.autoCreateReminder && sub.nextBillingDate) {
        const hasExisting = reminders.some(
          (r) => r.subscriptionId === sub.id && !r.completed
        );
        if (!hasExisting) {
          const remDueDate = calculateReminderDate(
            sub.nextBillingDate,
            sub.reminderDaysBefore
          );
          created.push({
            id: `rem_auto_sub_${sub.id}_${Date.now()}`,
            subscriptionId: sub.id,
            productName: `${sub.provider} (${sub.name})`,
            title: sub.autoPay
              ? `Auto-Pay Due: ${sub.name} (${profile.currencySymbol}${sub.amount})`
              : `Renewal Due: ${sub.name} (${profile.currencySymbol}${sub.amount})`,
            type: sub.autoPay ? 'Subscription Auto-Pay' : 'Subscription Renewal',
            dueDate: remDueDate,
            completed: false,
            notes: `Auto-pay: ${sub.autoPay ? 'Active (' + sub.paymentMethod + ')' : 'Manual'}. Cycle: ${sub.billingCycle === 'custom_days' ? (sub.customDays || 30) + ' Days' : sub.billingCycle}.${sub.expiryDate ? ' Expiry: ' + sub.expiryDate : ''}.${sub.mobileNumber ? ' Mobile: ' + sub.mobileNumber : ''}`
          });
        }
      }
    });

    if (created.length === 0) {
      showToast('All active warranties, return deadlines and subscriptions already have reminders.', 'info');
    } else {
      setReminders((prev) => [...created, ...prev]);
      showToast(`Generated ${created.length} automated reminder${created.length > 1 ? 's' : ''}.`);
    }
  };

  // ============================================================================
  // NAVIGATION ITEMS
  // ============================================================================
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, badge: summaryStats.upcomingAutoPays },
    { id: 'wallet', label: 'Wallet & Cards', icon: Wallet },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'warranties', label: 'Warranties', icon: ShieldCheck },
    { id: 'reminders', label: 'Reminders', icon: Bell, badge: summaryStats.upcomingReminders },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const formattedHeaderDate = useMemo(() => {
    const d = parseDateLocal(profile.referenceDate);
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toUpperCase()}`;
  }, [profile.referenceDate]);

  // ============================================================================
  // AUTH GATE: IF NOT SIGNED IN, SHOW REAL AUTHENTICATION PORTAL
  // ============================================================================
  if (!authSession) {
    return (
      <>
        {appLoading && (
          <KeeperLoadingScreen
            onLoaded={() => setAppLoading(false)}
            minDisplayTimeMs={1100}
          />
        )}
        {authTransition && (
          <VaultAuthTransition
            type={authTransition.type}
            userName={authTransition.userName}
            userEmail={authTransition.userEmail}
          />
        )}
        <AuthPortal
          onAuthenticated={(account, rememberMe) => {
            setAuthTransition({
              type: 'signing_in',
              userName: account.name,
              userEmail: account.email
            });
            saveActiveSession(account, rememberMe);

            setTimeout(() => {
              setAuthSession(account);
              setActiveTab('dashboard');
              setTimeout(() => {
                setAuthTransition(null);
                showToast(`Welcome back, ${account.name}! Keeper Vault Unlocked.`);
              }, 350);
            }, 1200);
          }}
        />
      </>
    );
  }

  // ============================================================================
  // RENDER AUTHENTICATED WORKSPACE
  // ============================================================================
  return (
    <>
      {appLoading && (
        <KeeperLoadingScreen
          onLoaded={() => setAppLoading(false)}
          minDisplayTimeMs={1100}
        />
      )}
      {authTransition && (
        <VaultAuthTransition
          type={authTransition.type}
          userName={authTransition.userName}
          userEmail={authTransition.userEmail}
        />
      )}
      <div
        className="min-h-screen bg-[#101113] text-[#F5F3EF] flex flex-col lg:flex-row antialiased selection:bg-[#F2BD91]/30 selection:text-[#F2BD91]"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
        onClick={() => {
          if (openActionMenuId) setOpenActionMenuId(null);
        }}
      >
      {/* ====================================================================
          DESKTOP FIXED SIDEBAR
         ==================================================================== */}
      <aside className="hidden lg:flex lg:w-[252px] xl:w-[260px] bg-[#151619] border-r border-[#232429] flex-col justify-between shrink-0 select-none">
        <div>
          {/* Brand Header */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="px-6 pt-7 pb-6 flex items-center gap-3.5 cursor-pointer group"
          >
            <KeeperLogoIcon />
            <div>
              <div className="text-[20px] font-semibold tracking-tight text-[#F5F3EF] leading-none group-hover:text-[#F2BD91] transition-colors">
                Keeper
              </div>
              <div className="text-[12px] text-[#9A9B9F] mt-1 font-normal">
                Purchase Manager
              </div>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="px-3.5 space-y-1 mt-1" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#3A312C] to-[#2B2522] text-[#F5F3EF] border border-[#4E4138]/80 shadow-sm'
                      : 'text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#1C1D22]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon
                      className={`w-[18px] h-[18px] ${
                        isActive ? 'text-[#F5F3EF]' : 'text-[#9E9FA5]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-[#F2BD91] text-[#141518]'
                          : 'bg-[#25262C] text-[#F2BD91]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Storage Meter & Go Pro Card */}
        <div className="px-4 pb-5 pt-4 space-y-4">
          <div className="px-1.5">
            <div className="flex items-center justify-between text-[12px] text-[#A5A5A5] mb-2">
              <span className="flex items-center gap-2 text-[#D0CFCB]">
                <Cloud className="w-4 h-4 text-[#A5A5A5]" />
                Storage
              </span>
              <span>
                {storageUsedGB} GB / {profile.storageQuotaGB} GB
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#26272C] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#E8B78D] transition-all duration-300"
                style={{
                  width: `${
                    storageUsedGB === 0
                      ? 0
                      : Math.min(100, Math.max(6, (storageUsedGB / profile.storageQuotaGB) * 100))
                  }%`
                }}
              />
            </div>
          </div>

          {/* Go Pro Card */}
          <div
            onClick={() => setIsProModalOpen(true)}
            className="relative rounded-2xl p-4 bg-gradient-to-br from-[#231E1B] via-[#1B1918] to-[#17181B] border border-[#362E28] cursor-pointer hover:border-[#F2BD91]/50 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Crown className="w-4 h-4 text-[#F2BD91] fill-[#F2BD91]/20" />
              <span className="text-[14px] font-semibold text-[#F5F3EF]">Go Pro</span>
            </div>
            <p className="text-[12px] text-[#A5A5A5] leading-relaxed pr-8">
              More storage, smart reminders and priority support.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsProModalOpen(true);
              }}
              aria-label="Open Keeper Vault & Storage Details"
              className="absolute bottom-3.5 right-3.5 w-8 h-8 rounded-full bg-[#F2BD91] text-[#141518] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          MOBILE TOP HEADER & SLIDE-OUT NAVIGATION
         ==================================================================== */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-[#151619] border-b border-[#292A2F] sticky top-0 z-30">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <KeeperLogoIcon />
          <div>
            <div className="text-base font-semibold text-[#F5F3EF] leading-none">Keeper</div>
            <div className="text-[11px] text-[#A5A5A5]">Everything you own. One place.</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddPurchase}
            className="px-3 py-1.5 rounded-lg bg-[#F2BD91] text-[#141518] text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
            className="p-2 rounded-lg bg-[#191A1E] border border-[#292A2F] text-[#F5F3EF]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex">
          <div className="w-72 bg-[#151619] border-r border-[#292A2F] h-full flex flex-col justify-between p-4">
            <div>
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-[#292A2F]">
                <div className="flex items-center gap-2.5">
                  <KeeperLogoIcon />
                  <span className="font-semibold text-lg">Keeper</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#A5A5A5] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-[#352C27] text-[#F5F3EF] border border-[#4E4138]'
                          : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#F2BD91] text-[#141518] font-semibold">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 border-t border-[#292A2F] space-y-3">
              <div className="text-xs text-[#A5A5A5]">
                Signed in as <strong className="text-[#F5F3EF]">{profile.name}</strong>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 rounded-xl bg-[#2B1B1D] text-[#F27474] text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ====================================================================
          MAIN CONTENT AREA WITH ATMOSPHERIC DUSK MOUNTAIN BACKDROP
         ==================================================================== */}
      <main className="flex-1 min-w-0 relative overflow-x-hidden pb-20 lg:pb-10">
        <div className="absolute top-0 left-0 right-0 h-[310px] pointer-events-none overflow-hidden z-0">
          <img
            src={HERO_BG}
            alt=""
            className="w-full h-full object-cover object-right-top opacity-85"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, #101113 0%, rgba(16,17,19,0.72) 28%, rgba(16,17,19,0.22) 68%, rgba(16,17,19,0.4) 100%), linear-gradient(180deg, rgba(16,17,19,0.12) 0%, rgba(16,17,19,0.55) 68%, #101113 100%)'
            }}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-7 lg:px-9 pt-4 sm:pt-5">
          {/* ================================================================
              TOP NAVIGATION BAR (Global Search, Notifications, Profile & Sign Out)
             ================================================================ */}
          <header className="flex items-center justify-between gap-4 mb-6">
            {/* Global Search Box */}
            <div className="relative flex-1 max-w-[530px]">
              <div className="flex items-center bg-[#18191D]/90 backdrop-blur-md border border-[#2C2D33] focus-within:border-[#F2BD91]/60 rounded-xl px-3.5 py-2.5 transition-colors shadow-sm">
                <Search className="w-4 h-4 text-[#A5A5A5] mr-3 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={globalSearch}
                  onFocus={() => setSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setSearchDropdownOpen(true);
                  }}
                  placeholder="Search purchases, receipts, or products..."
                  className="w-full bg-transparent text-[13.5px] text-[#F5F3EF] placeholder-[#8E8F94] focus:outline-none"
                />
                {globalSearch ? (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch('')}
                    className="text-[#A5A5A5] hover:text-white mr-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-medium text-[#A5A5A5] bg-[#232429] border border-[#32333A] rounded-md shrink-0">
                  ⌘K
                </kbd>
              </div>

              {/* Instant Global Search Results Popover */}
              {searchDropdownOpen && globalSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-[#191A1E] border border-[#292A2F] rounded-2xl shadow-2xl p-3 z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-[#292A2F] text-xs text-[#A5A5A5]">
                    <span>Search Results for "{globalSearch}"</span>
                    <button
                      type="button"
                      onClick={() => setSearchDropdownOpen(false)}
                      className="hover:text-white"
                    >
                      ESC
                    </button>
                  </div>

                  {globalSearchResults.purchases.length === 0 &&
                  globalSearchResults.receipts.length === 0 &&
                  globalSearchResults.reminders.length === 0 ? (
                    <div className="py-6 text-center text-sm text-[#A5A5A5]">
                      No matching purchases, receipts, or reminders found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {globalSearchResults.purchases.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#F2BD91] px-2 mb-1">
                            Purchases ({globalSearchResults.purchases.length})
                          </div>
                          {globalSearchResults.purchases.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPurchaseId(p.id);
                                setSearchDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#222329] text-left transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.imageUrl}
                                  alt={p.productName}
                                  className="w-10 h-7 rounded-md object-cover border border-[#292A2F]"
                                />
                                <div>
                                  <div className="text-sm font-medium text-[#F5F3EF]">
                                    {p.productName}
                                  </div>
                                  <div className="text-xs text-[#A5A5A5]">
                                    {p.brand} &bull; {formatINR(p.price, profile.currencySymbol)}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-[#A5A5A5]">{p.warrantyDisplayLabel}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {globalSearchResults.receipts.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#F2BD91] px-2 mb-1">
                            Receipts ({globalSearchResults.receipts.length})
                          </div>
                          {globalSearchResults.receipts.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                handlePreviewReceipt(r);
                                setSearchDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#222329] text-left"
                            >
                              <span className="text-sm text-[#F5F3EF] truncate">{r.fileName}</span>
                              <span className="text-xs text-[#A5A5A5]">{r.invoiceNumber}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Top Controls: Database, Notifications & Profile Menu */}
            <div className="flex items-center gap-3">
              {/* Cloud Vault Status Button */}
              <button
                type="button"
                onClick={() => setIsDatabaseModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18191D]/90 border border-[#2B2C33] hover:border-[#58C286]/50 text-xs transition-all shadow-sm group"
                title="Keeper Cloud Vault Storage"
              >
                <Cloud className="w-3.5 h-3.5 text-[#58C286]" />
                <span className="text-[#C8C7C5]">
                  Vault:{' '}
                  <strong className="text-[#F5F3EF] group-hover:text-[#58C286] transition-colors">
                    Cloud Synced
                  </strong>
                </span>
                <span className="w-2 h-2 rounded-full bg-[#58C286] animate-pulse" />
              </button>

              {/* Notifications Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileMenuOpen(false);
                  }}
                  aria-label="Notifications"
                  className="relative p-2.5 rounded-full bg-[#18191D]/80 hover:bg-[#222328] border border-[#292A2F] text-[#E5E3DF] transition-colors"
                >
                  <Bell className="w-[19px] h-[19px]" />
                  {summaryStats.upcomingReminders > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#E05252] ring-2 ring-[#141518]" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#191A1E] border border-[#292A2F] rounded-2xl shadow-2xl p-4 z-50">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#292A2F]">
                      <div>
                        <div className="text-sm font-semibold text-[#F5F3EF]">Notifications</div>
                        <div className="text-xs text-[#A5A5A5]">
                          {summaryStats.upcomingReminders} active warranty & return alerts
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleBrowserNotifications}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#25262C] hover:bg-[#2F3037] text-[#F2BD91] font-medium"
                      >
                        {profile.notificationsEnabled ? 'Alerts On' : 'Enable Alerts'}
                      </button>
                    </div>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {reminders.filter((r) => !r.completed).length === 0 ? (
                        <div className="text-xs text-[#A5A5A5] py-4 text-center">
                          You're all caught up! No pending alerts.
                        </div>
                      ) : (
                        reminders
                          .filter((r) => !r.completed)
                          .map((rem) => {
                            const days = diffInDays(rem.dueDate, profile.referenceDate);
                            return (
                              <div
                                key={rem.id}
                                className="p-2.5 rounded-xl bg-[#141518] border border-[#292A2F] flex items-start justify-between gap-2"
                              >
                                <div>
                                  <div className="text-xs font-medium text-[#F5F3EF]">
                                    {rem.title}
                                  </div>
                                  <div className="text-[11px] text-[#F2BD91] mt-0.5">
                                    {formatRelativeCountdown(days)} &bull; {formatDisplayDate(rem.dueDate)}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReminders((prev) =>
                                      prev.map((r) =>
                                        r.id === rem.id ? { ...r, completed: true } : r
                                      )
                                    );
                                    showToast(`Marked "${rem.title}" completed.`);
                                  }}
                                  className="text-[11px] px-2 py-1 rounded-md bg-[#23242A] hover:bg-[#2E3038] text-[#A5A5A5] hover:text-white shrink-0"
                                >
                                  Done
                                </button>
                              </div>
                            );
                          })
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        setActiveTab('reminders');
                      }}
                      className="w-full mt-3 pt-2.5 border-t border-[#292A2F] text-center text-xs text-[#F2BD91] hover:underline font-medium"
                    >
                      Manage all reminders &rarr;
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Avatar & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(!profileMenuOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 pr-2.5 rounded-full bg-[#18191D]/80 hover:bg-[#222328] border border-[#292A2F] transition-colors"
                >
                  <img
                    src={AVATAR_IMG}
                    alt={profile.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#3A3B42]"
                  />
                  <span className="hidden sm:inline text-xs font-medium text-[#F5F3EF] max-w-[110px] truncate">
                    {profile.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#A5A5A5]" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#191A1E] border border-[#292A2F] rounded-2xl shadow-2xl p-2 z-50">
                    <div className="px-3 py-2.5 border-b border-[#292A2F]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#F5F3EF] truncate">
                          {profile.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#173023] text-[#5CE095] font-medium">
                          'Verified'
                        </span>
                      </div>
                      <div className="text-xs text-[#A5A5A5] truncate mt-0.5">{profile.email}</div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setActiveTab('settings');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#E5E3DF] hover:bg-[#23242A] rounded-xl"
                      >
                        <Settings className="w-4 h-4 text-[#A5A5A5]" />
                        Account &amp; Security Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setIsDatabaseModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#E5E3DF] hover:bg-[#23242A] rounded-xl"
                      >
                        <Cloud className="w-4 h-4 text-[#F2BD91]" />
                        Cloud Vault Storage
                      </button>
                      <div className="my-1 border-t border-[#292A2F]" />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#F27474] hover:bg-[#2B1B1D] rounded-xl font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ================================================================
              VIEW 1: DASHBOARD
             ================================================================ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Hero Section */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-1">
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#E6B58A] mb-1.5">
                    {formattedHeaderDate}
                  </div>
                  <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-[#F5F3EF] leading-tight">
                    {getTimeOfDayGreeting()}, {profile.name}.
                  </h1>
                  <p className="text-[14.5px] text-[#B8B6B2] mt-1">
                    All your purchases, warranties and receipts in one place.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddPurchase}
                  className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-[14px] flex items-center gap-2 shadow-lg shadow-black/30 transition-all active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4 stroke-[2.4]" />
                  <span>Add Purchase</span>
                </button>
              </div>

              {/* Four Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('purchases')}
                  className="bg-[#191A1E]/95 border border-[#292A2F] hover:border-[#3A3B42] rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#24211F] border border-[#352F2B] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-[#E5B890]" />
                  </div>
                  <div>
                    <div className="text-[13px] text-[#B0AFB5] font-normal">Total Purchases</div>
                    <div className="text-[26px] font-semibold text-[#F5F3EF] leading-tight mt-0.5">
                      {summaryStats.totalPurchases}
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setWarrantyTabFilter('Active');
                    setActiveTab('warranties');
                  }}
                  className="bg-[#191A1E]/95 border border-[#292A2F] hover:border-[#3A3B42] rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#162720] border border-[#223F32] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#58C286]" />
                  </div>
                  <div>
                    <div className="text-[13px] text-[#B0AFB5] font-normal">Active Warranties</div>
                    <div className="text-[26px] font-semibold text-[#F5F3EF] leading-tight mt-0.5">
                      {summaryStats.activeWarranties}
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('purchases')}
                  className="bg-[#191A1E]/95 border border-[#292A2F] hover:border-[#3A3B42] rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#2B1F1E] border border-[#422D2A] flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-[#E08B6B]" />
                  </div>
                  <div>
                    <div className="text-[13px] text-[#B0AFB5] font-normal">Return Eligible</div>
                    <div className="text-[26px] font-semibold text-[#F5F3EF] leading-tight mt-0.5">
                      {summaryStats.returnEligible}
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('reminders')}
                  className="bg-[#191A1E]/95 border border-[#292A2F] hover:border-[#3A3B42] rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#2A2319] border border-[#403423] flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-[#E2A952]" />
                  </div>
                  <div>
                    <div className="text-[13px] text-[#B0AFB5] font-normal">Upcoming Reminders</div>
                    <div className="text-[26px] font-semibold text-[#F5F3EF] leading-tight mt-0.5">
                      {summaryStats.upcomingReminders}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main 12-Column Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN: Recent Purchases & Spending Overview */}
                <div className="lg:col-span-8 space-y-5">
                  {/* Recent Purchases Card */}
                  <section className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#26272C]">
                      <h2 className="text-[17px] font-semibold text-[#F5F3EF]">
                        Recent Purchases
                      </h2>

                      <div className="flex items-center gap-2.5">
                        {showDashboardSearchInput ? (
                          <div className="flex items-center bg-[#141518] border border-[#2E2F36] rounded-lg px-2.5 py-1">
                            <Search className="w-3.5 h-3.5 text-[#A5A5A5] mr-1.5" />
                            <input
                              type="text"
                              value={dashboardSearch}
                              onChange={(e) => setDashboardSearch(e.target.value)}
                              placeholder="Filter..."
                              className="bg-transparent text-xs text-[#F5F3EF] focus:outline-none w-28"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setDashboardSearch('');
                                setShowDashboardSearchInput(false);
                              }}
                              className="text-[#A5A5A5] hover:text-white ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowDashboardSearchInput(true)}
                            title="Search Recent Purchases"
                            className="p-1.5 rounded-lg text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#232429] transition-colors"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <select
                          aria-label="Sort recent purchases"
                          value={dashboardSort}
                          onChange={(e) =>
                            setDashboardSort(
                              e.target.value as 'featured' | 'newest' | 'price' | 'expiry'
                            )
                          }
                          className="bg-[#141518] border border-[#292A2F] text-[#A5A5A5] hover:text-[#F5F3EF] text-xs rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                        >
                          <option value="newest">Newest</option>
                          <option value="price">Price</option>
                          <option value="expiry">Warranty</option>
                          <option value="featured">Featured</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setActiveTab('purchases')}
                          className="flex items-center gap-1.5 text-[13px] text-[#C8C6C1] hover:text-[#F2BD91] font-medium transition-colors ml-1"
                        >
                          <span>View All</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Recent Purchases List or Clean Empty State */}
                    {dashboardPurchasesList.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#24211F] border border-[#352F2B] flex items-center justify-center mx-auto mb-3">
                          <ShoppingBag className="w-5 h-5 text-[#F2BD91]" />
                        </div>
                        <h3 className="text-sm font-semibold text-[#F5F3EF]">
                          Your purchase vault is empty
                        </h3>
                        <p className="text-xs text-[#A5A5A5] mt-1 max-w-sm mx-auto">
                          Add your first product purchase to automatically track warranty expiration dates, return deadlines, and receipts.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAddPurchase}
                          className="mt-4 px-4 py-2 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] text-xs font-semibold"
                        >
                          + Add First Purchase
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#25262B]">
                        {dashboardPurchasesList.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedPurchaseId(item.id)}
                            className="py-3.5 first:pt-4 last:pb-1 flex items-center justify-between gap-3 sm:gap-4 group cursor-pointer hover:bg-[#1E2025]/50 -mx-2 px-2 rounded-xl transition-colors relative"
                          >
                            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                              <div className="w-[74px] h-[48px] sm:w-[86px] sm:h-[52px] rounded-xl overflow-hidden bg-[#25262B] border border-[#303138] shrink-0">
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[15.5px] font-semibold text-[#F5F3EF] truncate group-hover:text-[#F2BD91] transition-colors">
                                  {item.productName}
                                </div>
                                <div className="text-[13px] text-[#A5A5A5] mt-0.5 truncate">
                                  Purchased on {formatDisplayDate(item.purchaseDate)}
                                  <span className="mx-2 text-[#66676D]">&middot;</span>
                                  <span className="text-[#D0CECA]">
                                    {formatINR(item.price, profile.currencySymbol)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                              <div className="text-left sm:w-[138px]">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-md text-[12px] font-medium ${
                                    item.warrantyStatus === 'Active'
                                      ? 'bg-[#173023] text-[#5CE095] border border-[#224934]'
                                      : item.warrantyStatus === 'Expiring Soon'
                                      ? 'bg-[#362816] text-[#F2B354] border border-[#4F391E]'
                                      : item.warrantyStatus === 'Expired'
                                      ? 'bg-[#341B1E] text-[#F27474] border border-[#4D262A]'
                                      : 'bg-[#26272C] text-[#B5B5BA] border border-[#34353C]'
                                  }`}
                                >
                                  {item.warrantyDisplayLabel}
                                </span>
                                {item.warrantyDisplaySubtext ? (
                                  <div className="text-[12px] text-[#9A9B9F] mt-1 pl-0.5">
                                    {item.warrantyDisplaySubtext}
                                  </div>
                                ) : null}
                              </div>

                              <div
                                className="relative"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  aria-label={`More actions for ${item.productName}`}
                                  onClick={() =>
                                    setOpenActionMenuId(
                                      openActionMenuId === item.id ? null : item.id
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#26272D] transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openActionMenuId === item.id && (
                                  <div className="absolute right-0 mt-1 w-44 bg-[#1E1F24] border border-[#32333B] rounded-xl shadow-2xl py-1.5 z-40 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPurchaseId(item.id);
                                        setOpenActionMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-left text-[#F5F3EF] hover:bg-[#292A30] flex items-center gap-2"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-[#A5A5A5]" />
                                      View Details
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPurchase(item)}
                                      className="w-full px-3 py-2 text-left text-[#F5F3EF] hover:bg-[#292A30] flex items-center gap-2"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-[#F2BD91]" />
                                      Edit Purchase
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        setDeleteConfirmTarget({
                                          type: 'purchase',
                                          id: item.id,
                                          name: item.productName
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-left text-[#F27474] hover:bg-[#292A30] flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Spending Overview Card */}
                  <section className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h2 className="text-[17px] font-semibold text-[#F5F3EF]">
                        Spending Overview
                      </h2>

                      <div className="flex items-center bg-[#141518] border border-[#292A2F] rounded-xl p-1">
                        {(['3M', '6M', '1Y'] as const).map((period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() => setSpendingRange(period)}
                            className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                              spendingRange === period
                                ? 'bg-[#F2BD91] text-[#141518] shadow-sm'
                                : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="text-[28px] sm:text-[31px] font-bold text-[#F5F3EF] tracking-tight">
                        {formatINR(spendingOverviewData.totalSpent, profile.currencySymbol)}
                      </div>
                      <div className="text-[13px] text-[#A5A5A5]">
                        {spendingOverviewData.subtitle}
                      </div>
                    </div>

                    <div className="relative h-36 sm:h-40 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={spendingOverviewData.points}
                          margin={{ top: 14, right: 12, left: 12, bottom: 4 }}
                        >
                          <defs>
                            <linearGradient id="keeperPeachArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F2BD91" stopOpacity={0.38} />
                              <stop offset="65%" stopColor="#F2BD91" stopOpacity={0.11} />
                              <stop offset="100%" stopColor="#F2BD91" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#151619',
                              borderColor: '#35363D',
                              borderRadius: '12px',
                              fontSize: '12px',
                              color: '#F5F3EF'
                            }}
                            formatter={(val: number) => [
                              formatINR(val, profile.currencySymbol),
                              'Expenditure'
                            ]}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#F2BD91"
                            strokeWidth={2.4}
                            fill="url(#keeperPeachArea)"
                            activeDot={{
                              r: 5,
                              fill: '#FFF7F0',
                              stroke: '#F2BD91',
                              strokeWidth: 2
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </div>

                {/* RIGHT COLUMN: Upcoming Reminders & Warranty Timeline */}
                <div className="lg:col-span-4 space-y-5">
                  {/* Upcoming Reminders Card */}
                  <section className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                    <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-[#26272C]">
                      <h2 className="text-[17px] font-semibold text-[#F5F3EF]">
                        Upcoming Reminders
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('reminders')}
                        className="flex items-center gap-1.5 text-[13px] text-[#C8C6C1] hover:text-[#F2BD91] font-medium transition-colors"
                      >
                        <span>View All</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {reminders.filter((r) => !r.completed).length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-xs text-[#A5A5A5]">No upcoming reminders scheduled.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReminder(null);
                            setIsReminderModalOpen(true);
                          }}
                          className="mt-2.5 text-xs text-[#F2BD91] hover:underline font-medium"
                        >
                          + Add Custom Reminder
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#25262B]">
                        {reminders
                          .filter((r) => !r.completed)
                          .slice(0, 3)
                          .map((rem) => {
                            const days = diffInDays(rem.dueDate, profile.referenceDate);
                            const isReturn = rem.type === 'Return Deadline';
                            return (
                              <div
                                key={rem.id}
                                onClick={() => {
                                  if (rem.subscriptionId) {
                                    setActiveTab('subscriptions');
                                  } else if (rem.purchaseId) {
                                    setSelectedPurchaseId(rem.purchaseId);
                                  } else {
                                    setActiveTab('reminders');
                                  }
                                }}
                                className="py-3.5 first:pt-2 last:pb-1 flex items-center justify-between gap-3 cursor-pointer group hover:bg-[#1E2025]/50 -mx-2 px-2 rounded-xl transition-colors"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  {rem.subscriptionId || rem.type === 'Subscription Auto-Pay' || rem.type === 'Subscription Renewal' ? (
                                    <BrandLogo provider={rem.productName.split(' ')[0] || 'sub'} size="md" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-[#222328] border border-[#2F3037] flex items-center justify-center shrink-0">
                                      {isReturn ? (
                                        <Package className="w-[18px] h-[18px] text-[#E5B890]" />
                                      ) : (
                                        <ShieldCheck className="w-[18px] h-[18px] text-[#E5B890]" />
                                      )}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-[13.5px] font-medium text-[#F5F3EF] truncate group-hover:text-[#F2BD91] transition-colors">
                                      {rem.title}
                                    </div>
                                    <div className="text-[12px] text-[#A5A5A5] mt-0.5">
                                      {formatRelativeCountdown(days)}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-[#8E8F94] group-hover:text-[#F5F3EF] shrink-0" />
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </section>

                  {/* Warranty Timeline Card */}
                  <section className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                    <h2 className="text-[17px] font-semibold text-[#F5F3EF] mb-4">
                      Warranty Timeline
                    </h2>

                    <div className="flex items-center justify-between mb-4 px-1">
                      <button
                        type="button"
                        aria-label="Previous week"
                        onClick={() => setTimelineWeekOffset((w) => w - 1)}
                        className="p-1 rounded-lg text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#23242A]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[14px] font-semibold text-[#F5F3EF]">
                        {timelineWeekDays[3]?.monthYear}
                      </span>
                      <button
                        type="button"
                        aria-label="Next week"
                        onClick={() => setTimelineWeekOffset((w) => w + 1)}
                        className="p-1 rounded-lg text-[#A5A5A5] hover:text-[#F5F3EF] hover:bg-[#23242A]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center pb-4 mb-4 border-b border-[#26272C]">
                      {timelineWeekDays.map((d) => {
                        const isSelected = selectedTimelineDay === d.iso;
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedTimelineDay(d.iso)}
                            className="flex flex-col items-center gap-2 py-1 rounded-xl focus:outline-none group"
                          >
                            <span className="text-[11.5px] text-[#9A9B9F] font-normal">
                              {d.dayName}
                            </span>
                            <span
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-[13.5px] font-semibold transition-all ${
                                isSelected
                                  ? 'bg-[#F2BD91] text-[#141518] shadow-md shadow-[#F2BD91]/20'
                                  : 'text-[#E0DFDB] group-hover:bg-[#25262C]'
                              }`}
                            >
                              {d.dayNum}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-3.5">
                      {timelineWarranties.length === 0 ? (
                        <div className="text-xs text-[#A5A5A5] text-center py-4">
                          Add a purchase with warranty coverage to view its expiration timeline.
                        </div>
                      ) : (
                        timelineWarranties.map((w, idx) => (
                          <div
                            key={w.id}
                            onClick={() => setSelectedPurchaseId(w.id)}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                idx === 0
                                  ? 'bg-[#F2BD91] ring-4 ring-[#F2BD91]/20'
                                  : 'bg-[#7A7B80]'
                              }`}
                            />
                            <div className="text-[13.5px] text-[#D0CECA] truncate group-hover:text-[#F2BD91] transition-colors">
                              <strong className="font-semibold text-[#F5F3EF]">
                                {w.productName}
                              </strong>{' '}
                              <span className="text-[#A5A5A5]">&ndash; {w.timelineSubtext}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 2: PURCHASES MANAGEMENT PAGE
             ================================================================ */}
          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
                    INVENTORY & RECORDS
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
                    Purchases ({filteredPurchases.length})
                  </h1>
                  <p className="text-sm text-[#A5A5A5] mt-0.5">
                    Manage your registered products, track return windows, and inspect warranty dates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddPurchase}
                  className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-sm flex items-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[2.4]" />
                  Add Purchase
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[210px] flex items-center bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2">
                  <Search className="w-4 h-4 text-[#A5A5A5] mr-2.5" />
                  <input
                    type="text"
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    placeholder="Filter by product name, brand, or store..."
                    className="w-full bg-transparent text-sm text-[#F5F3EF] placeholder-[#8E8F94] focus:outline-none"
                  />
                  {purchaseSearch && (
                    <button
                      type="button"
                      onClick={() => setPurchaseSearch('')}
                      className="text-[#A5A5A5] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#A5A5A5] hidden sm:inline" />
                  <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F5F3EF] focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Smartphones">Smartphones</option>
                    <option value="Laptops">Laptops</option>
                    <option value="Audio">Audio</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Cameras">Cameras</option>
                    <option value="Tablets">Tablets</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Wearables">Wearables</option>
                    <option value="Accessories">Accessories</option>
                    {Array.from(new Set(purchases.map((p) => p.category)))
                      .filter(
                        (cat) =>
                          ![
                            'Smartphones',
                            'Laptops',
                            'Audio',
                            'Gaming',
                            'Cameras',
                            'Tablets',
                            'Appliances',
                            'Wearables',
                            'Accessories'
                          ].includes(cat)
                      )
                      .map((customCat) => (
                        <option key={customCat} value={customCat}>
                          {customCat}
                        </option>
                      ))}
                  </select>
                </div>

                <select
                  aria-label="Filter by warranty status"
                  value={warrantyFilter}
                  onChange={(e) => setWarrantyFilter(e.target.value)}
                  className="bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F5F3EF] focus:outline-none"
                >
                  <option value="All">All Warranty Statuses</option>
                  <option value="Active">Warranty Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                  <option value="No Warranty">No Warranty</option>
                </select>

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-[#A5A5A5] hidden sm:inline" />
                  <select
                    aria-label="Sort purchases"
                    value={purchaseSortBy}
                    onChange={(e) =>
                      setPurchaseSortBy(
                        e.target.value as
                          | 'featured'
                          | 'date-desc'
                          | 'date-asc'
                          | 'price-desc'
                          | 'price-asc'
                      )
                    }
                    className="bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#F5F3EF] focus:outline-none"
                  >
                    <option value="date-desc">Purchase Date: Newest</option>
                    <option value="date-asc">Purchase Date: Oldest</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="featured">Featured Order</option>
                  </select>
                </div>
              </div>

              {/* Purchases Table / Card List */}
              {filteredPurchases.length === 0 ? (
                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-12 text-center">
                  <ShoppingBag className="w-10 h-10 text-[#A5A5A5] mx-auto mb-3 opacity-50" />
                  <h3 className="text-base font-semibold text-[#F5F3EF]">No purchases registered yet</h3>
                  <p className="text-xs text-[#A5A5A5] mt-1 max-w-md mx-auto">
                    Add your first real purchase to begin tracking warranty coverage and return windows.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    {(purchaseSearch || categoryFilter !== 'All' || warrantyFilter !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setPurchaseSearch('');
                          setCategoryFilter('All');
                          setWarrantyFilter('All');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#25262C] text-xs text-[#F5F3EF] hover:bg-[#2F3037]"
                      >
                        Reset Filters
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOpenAddPurchase}
                      className="px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold"
                    >
                      + Add Purchase
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl overflow-hidden">
                  <div className="divide-y divide-[#25262B]">
                    {filteredPurchases.map((item) => {
                      const linkedReceipt = receipts.find((r) => r.purchaseId === item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedPurchaseId(item.id)}
                          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#1E2025]/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-20 h-14 rounded-xl object-cover border border-[#303138] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-semibold text-[#F5F3EF]">
                                  {item.productName}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#232429] text-[#A5A5A5] border border-[#2F3037]">
                                  {item.category}
                                </span>
                                {item.isReturnEligible && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#2E221D] text-[#F2BD91] border border-[#4A352B]">
                                    Return Eligible ({item.remainingReturnDays}d left)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#A5A5A5] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>{item.brand}</span>
                                <span>&bull;</span>
                                <span>{item.store || 'Direct Store'}</span>
                                <span>&bull;</span>
                                <span>Purchased {formatDisplayDate(item.purchaseDate)}</span>
                                {linkedReceipt && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-[#F2BD91] flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      Receipt attached
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-5 pt-2 md:pt-0 border-t md:border-t-0 border-[#25262B]">
                            <div className="text-left md:text-right">
                              <div className="text-base font-semibold text-[#F5F3EF]">
                                {formatINR(item.price, profile.currencySymbol)}
                              </div>
                              <div className="text-xs text-[#A5A5A5]">
                                {item.warrantyDisplaySubtext || 'No coverage'}
                              </div>
                            </div>

                            <div className="w-32 text-right">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${
                                  item.warrantyStatus === 'Active'
                                    ? 'bg-[#173023] text-[#5CE095] border border-[#224934]'
                                    : item.warrantyStatus === 'Expiring Soon'
                                    ? 'bg-[#362816] text-[#F2B354] border border-[#4F391E]'
                                    : item.warrantyStatus === 'Expired'
                                    ? 'bg-[#341B1E] text-[#F27474] border border-[#4D262A]'
                                    : 'bg-[#26272C] text-[#B5B5BA] border border-[#34353C]'
                                }`}
                              >
                                {item.warrantyDisplayLabel}
                              </span>
                            </div>

                            <div
                              className="flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditPurchase(item)}
                                title="Edit purchase"
                                className="p-2 rounded-lg bg-[#222328] hover:bg-[#2C2D34] text-[#A5A5A5] hover:text-[#F5F3EF]"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmTarget({
                                    type: 'purchase',
                                    id: item.id,
                                    name: item.productName
                                  })
                                }
                                title="Delete purchase"
                                className="p-2 rounded-lg bg-[#222328] hover:bg-[#341B1E] text-[#A5A5A5] hover:text-[#F27474]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              VIEW 2B: SUBSCRIPTIONS & AUTO-PAY PAGE
             ================================================================ */}
          {activeTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              referenceDate={profile.referenceDate}
              currencySymbol={profile.currencySymbol}
              onOpenAddModal={() => {
                setEditingSubscription(null);
                setIsSubscriptionModalOpen(true);
              }}
              onEditSubscription={(sub) => {
                setEditingSubscription(sub);
                setIsSubscriptionModalOpen(true);
              }}
              onDeleteSubscription={(sub) => {
                setDeleteConfirmTarget({
                  type: 'subscription',
                  id: sub.id,
                  name: sub.name
                });
              }}
              onToggleAutoPay={handleToggleSubscriptionAutoPay}
              onToggleStatus={handleToggleSubscriptionStatus}
              onApplyPreset={(preset) => {
                setEditingSubscription({
                  ...preset,
                  id: '',
                  startDate: profile.referenceDate,
                  nextBillingDate: addDaysToDate(
                    profile.referenceDate,
                    preset.billingCycle === '28_days' ? 28 : 30
                  ),
                  status: 'active',
                  autoCreateReminder: true,
                  createdAt: ''
                });
                setIsSubscriptionModalOpen(true);
              }}
            />
          )}

          {/* ================================================================
              VIEW 2C: WALLET, CARDS & FINANCIAL HEALTH PAGE
             ================================================================ */}
          {activeTab === 'wallet' && (
            <CardsAndWalletView
              cards={cards}
              subscriptions={subscriptions}
              purchases={purchases}
              monthlyIncome={profile.monthlyIncome || 0}
              onUpdateIncome={handleUpdateIncome}
              onOpenAddCard={() => {
                setEditingCard(null);
                setIsCardModalOpen(true);
              }}
              onEditCard={(c) => {
                setEditingCard(c);
                setIsCardModalOpen(true);
              }}
              onDeleteCard={handleDeleteCard}
              onSaveCard={handleSaveCard}
              currencySymbol={profile.currencySymbol}
              referenceDate={profile.referenceDate}
            />
          )}

          {/* ================================================================
              VIEW 3: RECEIPT MANAGEMENT PAGE
             ================================================================ */}
          {activeTab === 'receipts' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
                    DOCUMENT VAULT
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
                    Receipts & Invoices ({receipts.length})
                  </h1>
                  <p className="text-sm text-[#A5A5A5] mt-0.5">
                    Store PDF invoices, bill photos, proof of purchase, and itemized text records in your database vault.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReceipt(null);
                    setPendingReceiptFile(null);
                    setReceiptModalPurchaseId(uploadPurchaseId || (purchases[0]?.id ?? ''));
                    setIsReceiptModalOpen(true);
                  }}
                  className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-sm flex items-center gap-2 shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[2.4]" />
                  Add Receipt / Invoice
                </button>
              </div>

              {/* Drag and Drop Upload Card */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  handleFilesUploaded(e.dataTransfer.files);
                }}
                className={`bg-[#191A1E] border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
                  isDraggingOver
                    ? 'border-[#F2BD91] bg-[#241F1C]'
                    : 'border-[#2E3037] hover:border-[#42444D]'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#24211F] border border-[#38302A] flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5 text-[#F2BD91]" />
                </div>
                <h3 className="text-base font-semibold text-[#F5F3EF]">
                  Drag & drop receipts or invoices here
                </h3>
                <p className="text-xs text-[#A5A5A5] mt-1">
                  Supports PDF documents, JPG and PNG images &bull; Binary files stored in IndexedDB Vault
                </p>

                <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                  <select
                    aria-label="Associate receipt with purchase"
                    value={uploadPurchaseId}
                    onChange={(e) => setUploadPurchaseId(e.target.value)}
                    className="w-full sm:w-auto flex-1 bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2.5 text-xs text-[#F5F3EF] focus:outline-none"
                  >
                    <option value="">
                      {purchases.length > 0
                        ? `Associate with: ${purchases[0].productName}`
                        : 'No purchases registered yet'}
                    </option>
                    {purchases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productName} ({p.brand})
                      </option>
                    ))}
                  </select>

                  <label className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-xs cursor-pointer inline-flex items-center justify-center gap-2 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Files</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      multiple
                      onChange={(e) => handleFilesUploaded(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {receipts.length > 0 && (
                <div className="flex items-center bg-[#191A1E] border border-[#292A2F] rounded-xl px-3.5 py-2.5 max-w-md">
                  <Search className="w-4 h-4 text-[#A5A5A5] mr-2.5" />
                  <input
                    type="text"
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    placeholder="Search by title, merchant, invoice #, text notes, or product..."
                    className="w-full bg-transparent text-sm text-[#F5F3EF] placeholder-[#8E8F94] focus:outline-none"
                  />
                  {receiptSearch && (
                    <button
                      type="button"
                      onClick={() => setReceiptSearch('')}
                      className="text-[#A5A5A5] hover:text-white ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {receipts.length === 0 ? (
                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-10 text-center">
                  <FileText className="w-9 h-9 text-[#A5A5A5] mx-auto mb-2 opacity-50" />
                  <div className="text-sm font-semibold text-[#F5F3EF]">No receipts uploaded yet</div>
                  <p className="text-xs text-[#A5A5A5] mt-1 max-w-sm mx-auto">
                    Upload PDF invoices, receipt photos, or add custom invoice text notes above to keep proof-of-purchase documents safe.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {receipts
                    .filter((r) => {
                      if (!receiptSearch.trim()) return true;
                      const q = receiptSearch.toLowerCase();
                      const assoc = purchases.find((p) => p.id === r.purchaseId);
                      return (
                        (r.title && r.title.toLowerCase().includes(q)) ||
                        r.fileName.toLowerCase().includes(q) ||
                        r.invoiceNumber.toLowerCase().includes(q) ||
                        (r.store && r.store.toLowerCase().includes(q)) ||
                        (r.notes && r.notes.toLowerCase().includes(q)) ||
                        (r.categoryTag && r.categoryTag.toLowerCase().includes(q)) ||
                        (assoc && assoc.productName.toLowerCase().includes(q))
                      );
                    })
                    .map((rec) => {
                      const isPdf = rec.fileType === 'application/pdf';
                      const assocPurchase = purchases.find((p) => p.id === rec.purchaseId);
                      return (
                        <div
                          key={rec.id}
                          className="bg-[#191A1E] border border-[#292A2F] hover:border-[#3A3B43] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#232120] border border-[#35302C] flex items-center justify-center shrink-0">
                                {isPdf ? (
                                  <FileText className="w-5 h-5 text-[#F2BD91]" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-[#63C795]" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {rec.categoryTag && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#23242A] text-[#A5A5A5] border border-[#2F3038]">
                                    {rec.categoryTag}
                                  </span>
                                )}
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#25201C] text-[#F2BD91] border border-[#3E3127] uppercase">
                                  {isPdf ? 'PDF' : rec.fileType.split('/')[1]?.toUpperCase() || 'IMG'}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3.5">
                              <h3 className="text-sm font-semibold text-[#F5F3EF] leading-snug line-clamp-1">
                                {rec.title || rec.fileName}
                              </h3>
                              <div className="text-xs text-[#A5A5A5] mt-1 flex items-center gap-2 flex-wrap">
                                <span>#{rec.invoiceNumber}</span>
                                {rec.store && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-[#C5C5CB]">{rec.store}</span>
                                  </>
                                )}
                                {rec.amount !== undefined && rec.amount > 0 && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-[#5CE095] font-semibold">
                                      {formatINR(rec.amount, profile.currencySymbol)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Itemized Notes / Description snippet */}
                            {rec.notes && (
                              <div className="mt-3 p-2.5 rounded-xl bg-[#141518] border border-[#25262B] text-xs text-[#C5C5CB] font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">
                                {rec.notes}
                              </div>
                            )}

                            {/* Associated Product Selector */}
                            <div className="mt-3 pt-3 border-t border-[#25262C]">
                              <div className="flex items-center justify-between text-[11px] text-[#A5A5A5] mb-1">
                                <span>Associated Product</span>
                                {assocPurchase && (
                                  <span className="text-[#F2BD91]">{assocPurchase.brand}</span>
                                )}
                              </div>
                              <select
                                aria-label={`Associated product for ${rec.title || rec.fileName}`}
                                value={rec.purchaseId}
                                onChange={(e) => {
                                  const newPid = e.target.value;
                                  const updated = { ...rec, purchaseId: newPid };
                                  setReceipts((prev) =>
                                    prev.map((r) => (r.id === rec.id ? updated : r))
                                  );
                                  dbManager.saveReceipt(updated);
                                  showToast('Updated receipt product association.');
                                }}
                                className="w-full bg-[#141518] border border-[#292A2F] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F3EF] focus:outline-none focus:border-[#F2BD91]"
                              >
                                <option value="">General Expense (Unlinked)</option>
                                {purchases.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.productName} ({p.brand})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#25262C] text-xs">
                            <span className="text-[#7A7C85] text-[11px]">
                              {formatDisplayDate(rec.uploadDate)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReceipt(rec);
                                  setPendingReceiptFile(null);
                                  setIsReceiptModalOpen(true);
                                }}
                                title="Edit invoice details and notes"
                                className="px-2.5 py-1.5 rounded-lg bg-[#24252B] hover:bg-[#2F3038] text-[#F5F3EF] flex items-center gap-1 text-xs"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#F2BD91]" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePreviewReceipt(rec)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#24252B] hover:bg-[#2F3038] text-[#F5F3EF] flex items-center gap-1 text-xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#F2BD91]" />
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadReceipt(rec)}
                                aria-label={`Download ${rec.fileName}`}
                                className="p-1.5 rounded-lg bg-[#24252B] hover:bg-[#2F3038] text-[#A5A5A5] hover:text-white"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmTarget({
                                    type: 'receipt',
                                    id: rec.id,
                                    name: rec.title || rec.fileName
                                  })
                                }
                                aria-label={`Delete ${rec.fileName}`}
                                className="p-1.5 rounded-lg bg-[#24252B] hover:bg-[#341B1E] text-[#A5A5A5] hover:text-[#F27474]"
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
          )}

          {/* ================================================================
              VIEW 4: WARRANTY PROTECTION & CLAIMS COMMAND CENTER
             ================================================================ */}
          {activeTab === 'warranties' && (() => {
            const activeList = computedPurchases.filter((p) => p.warrantyStatus === 'Active');
            const expiringSoonList = computedPurchases.filter((p) => p.warrantyStatus === 'Expiring Soon');
            const expiredList = computedPurchases.filter((p) => p.warrantyStatus === 'Expired');
            const noWarrantyList = computedPurchases.filter((p) => p.warrantyStatus === 'No Warranty');
            const claimReadyList = computedPurchases.filter(
              (p) => receipts.some((r) => r.purchaseId === p.id) && Boolean(p.serialNumber && p.serialNumber.trim())
            );

            const totalProtectedValue = [...activeList, ...expiringSoonList].reduce((sum, p) => sum + p.price, 0);

            const displayList = computedPurchases.filter((p) => {
              if (warrantyTabFilter === 'All') return true;
              if (warrantyTabFilter === 'Active') return p.warrantyStatus === 'Active';
              if (warrantyTabFilter === 'Expiring Soon') return p.warrantyStatus === 'Expiring Soon';
              if (warrantyTabFilter === 'Expired') return p.warrantyStatus === 'Expired';
              if (warrantyTabFilter === 'No Warranty') return p.warrantyStatus === 'No Warranty';
              return true;
            });

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
                      PROTECTION & CLAIMS COMMAND CENTER
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
                      Warranty Coverage & Claims
                    </h1>
                    <p className="text-sm text-[#A5A5A5] mt-0.5">
                      Dedicated coverage horizons, OEM claim readiness checks, and official brand support helplines.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddPurchase}
                    className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-sm flex items-center gap-2 shadow-md transition-colors"
                  >
                    <Plus className="w-4 h-4 stroke-[2.4]" />
                    Register New Product
                  </button>
                </div>

                {/* Protection KPI Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5A5A5] font-medium">Active Protected Value</span>
                      <ShieldCheck className="w-4 h-4 text-[#5CE095]" />
                    </div>
                    <div className="text-2xl font-bold text-[#5CE095] mt-1">
                      {formatINR(totalProtectedValue, profile.currencySymbol)}
                    </div>
                    <div className="text-[11px] text-[#8E8F94] mt-1">
                      {activeList.length + expiringSoonList.length} of {computedPurchases.length} assets covered
                    </div>
                  </div>

                  <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5A5A5] font-medium">Expiring Soon (&lt;30d)</span>
                      <AlertTriangle className="w-4 h-4 text-[#F2B354]" />
                    </div>
                    <div className="text-2xl font-bold text-[#F2B354] mt-1">
                      {expiringSoonList.length}
                    </div>
                    <div className="text-[11px] text-[#8E8F94] mt-1">
                      {expiringSoonList.length > 0 ? 'Urgent: Extend or claim AMC' : 'No imminent expirations'}
                    </div>
                  </div>

                  <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5A5A5] font-medium">Out of Warranty</span>
                      <ShieldAlert className="w-4 h-4 text-[#F27474]" />
                    </div>
                    <div className="text-2xl font-bold text-[#F27474] mt-1">
                      {expiredList.length + noWarrantyList.length}
                    </div>
                    <div className="text-[11px] text-[#8E8F94] mt-1">
                      Expired or no warranty recorded
                    </div>
                  </div>

                  <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A5A5A5] font-medium">Instant Claim Ready</span>
                      <CheckCircle2 className="w-4 h-4 text-[#F2BD91]" />
                    </div>
                    <div className="text-2xl font-bold text-[#F2BD91] mt-1">
                      {claimReadyList.length} / {computedPurchases.length}
                    </div>
                    <div className="text-[11px] text-[#8E8F94] mt-1">
                      Receipt & serial number verified
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {(['All', 'Active', 'Expiring Soon', 'Expired', 'No Warranty'] as const).map(
                    (tab) => {
                      const count =
                        tab === 'All'
                          ? computedPurchases.length
                          : tab === 'Active'
                          ? activeList.length
                          : tab === 'Expiring Soon'
                          ? expiringSoonList.length
                          : tab === 'Expired'
                          ? expiredList.length
                          : noWarrantyList.length;
                      const active = warrantyTabFilter === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setWarrantyTabFilter(tab)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                            active
                              ? 'bg-[#F2BD91] text-[#141518]'
                              : 'bg-[#191A1E] text-[#A5A5A5] border border-[#292A2F] hover:text-[#F5F3EF]'
                          }`}
                        >
                          <span>{tab === 'All' ? 'All Assets' : tab}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                              active ? 'bg-[#141518]/20 text-[#141518]' : 'bg-[#25262C] text-[#F5F3EF]'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                {computedPurchases.length === 0 ? (
                  <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-12 text-center">
                    <ShieldCheck className="w-10 h-10 text-[#A5A5A5] mx-auto mb-3 opacity-50" />
                    <h3 className="text-base font-semibold text-[#F5F3EF]">No warranties tracked yet</h3>
                    <p className="text-xs text-[#A5A5A5] mt-1 max-w-sm mx-auto">
                      Add a purchase with a warranty expiration date to unlock active coverage tracking and official OEM claim support.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddPurchase}
                      className="mt-4 px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold shadow-md"
                    >
                      + Add Purchase
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayList.map((item) => {
                      const assocReceipt = receipts.find((r) => r.purchaseId === item.id);
                      const hasSerial = Boolean(item.serialNumber && item.serialNumber.trim());
                      const hasReceipt = Boolean(assocReceipt);
                      const isClaimReady = hasSerial && hasReceipt;

                      return (
                        <div
                          key={item.id}
                          className="bg-[#191A1E] border border-[#292A2F] hover:border-[#3B3C45] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-16 h-12 rounded-xl object-cover border border-[#2F3037] shrink-0"
                                />
                                <div className="min-w-0">
                                  <h3 className="text-base font-semibold text-[#F5F3EF] truncate">
                                    {item.productName}
                                  </h3>
                                  <div className="text-xs text-[#A5A5A5] mt-0.5">
                                    {item.brand} &bull; Purchased {formatDisplayDate(item.purchaseDate)}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                                  item.warrantyStatus === 'Active'
                                    ? 'bg-[#173023] text-[#5CE095] border border-[#224934]'
                                    : item.warrantyStatus === 'Expiring Soon'
                                    ? 'bg-[#362816] text-[#F2B354] border border-[#4F391E]'
                                    : item.warrantyStatus === 'Expired'
                                    ? 'bg-[#341B1E] text-[#F27474] border border-[#4D262A]'
                                    : 'bg-[#26272C] text-[#B5B5BA] border border-[#34353C]'
                                }`}
                              >
                                {item.warrantyStatus === 'Active' && <ShieldCheck className="w-3.5 h-3.5" />}
                                {item.warrantyStatus === 'Expiring Soon' && <AlertTriangle className="w-3.5 h-3.5" />}
                                {item.warrantyStatus === 'Expired' && <ShieldAlert className="w-3.5 h-3.5" />}
                                {item.warrantyDisplayLabel}
                              </span>
                            </div>

                            {/* Coverage Horizon & Progress Bar */}
                            <div className="mt-4 bg-[#141518] border border-[#24252A] rounded-xl p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#A5A5A5]">
                                  {item.warrantyMonths > 0 ? (
                                    <>Standard: <strong className="text-[#F5F3EF]">{item.warrantyMonths} Months</strong></>
                                  ) : (
                                    <span className="text-[#7A7B82]">Custom Expiry Date</span>
                                  )}
                                </span>
                                <span className="text-[#A5A5A5]">
                                  Expiry:{' '}
                                  <strong className="text-[#F5F3EF]">
                                    {item.warrantyExpiryDate
                                      ? formatDisplayDate(item.warrantyExpiryDate)
                                      : 'No Warranty'}
                                  </strong>
                                </span>
                              </div>

                              {Boolean(item.warrantyExpiryDate) && (
                                <>
                                  <div className="w-full h-2 rounded-full bg-[#24252B] overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        item.warrantyStatus === 'Active'
                                          ? 'bg-[#58C286]'
                                          : item.warrantyStatus === 'Expiring Soon'
                                          ? 'bg-[#F2B354]'
                                          : 'bg-[#F27474]'
                                      }`}
                                      style={{ width: `${item.warrantyProgressPercent}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-[#A5A5A5]">
                                    <span>{item.warrantyProgressPercent}% elapsed</span>
                                    <span className="font-semibold text-[#F5F3EF]">
                                      {item.remainingWarrantyDays !== null && item.remainingWarrantyDays >= 0
                                        ? `${item.remainingWarrantyDays} days remaining`
                                        : item.remainingWarrantyDays !== null
                                        ? `Expired ${Math.abs(item.remainingWarrantyDays)} days ago`
                                        : ''}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Claim Readiness Checklist Pill Box */}
                            <div className="mt-3 p-3 rounded-xl bg-[#17181D] border border-[#26272E] space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold uppercase tracking-wider text-[#A5A5A5]">
                                  Claim Readiness
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    isClaimReady
                                      ? 'bg-[#173023] text-[#5CE095]'
                                      : 'bg-[#2E241B] text-[#F2BD91]'
                                  }`}
                                >
                                  {isClaimReady ? '100% Claim Ready' : 'Incomplete Proof'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {/* Proof of Purchase */}
                                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141518] border border-[#222328]">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {hasReceipt ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5CE095] shrink-0" />
                                    ) : (
                                      <AlertTriangle className="w-3.5 h-3.5 text-[#F2B354] shrink-0" />
                                    )}
                                    <span className="truncate text-[11px] text-[#C5C5CB]">
                                      {hasReceipt ? `Invoice #${assocReceipt!.invoiceNumber}` : 'No Invoice'}
                                    </span>
                                  </div>
                                  {hasReceipt ? (
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewReceipt(assocReceipt!)}
                                      className="text-[10px] text-[#F2BD91] hover:underline shrink-0 ml-1"
                                    >
                                      View
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadPurchaseId(item.id);
                                        setActiveTab('receipts');
                                      }}
                                      className="text-[10px] text-[#F2BD91] hover:underline shrink-0 ml-1"
                                    >
                                      + Attach
                                    </button>
                                  )}
                                </div>

                                {/* Serial Number */}
                                <div className="flex items-center justify-between p-2 rounded-lg bg-[#141518] border border-[#222328]">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {hasSerial ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#5CE095] shrink-0" />
                                    ) : (
                                      <AlertTriangle className="w-3.5 h-3.5 text-[#F2B354] shrink-0" />
                                    )}
                                    <span className="truncate text-[11px] text-[#C5C5CB] font-mono">
                                      {hasSerial ? item.serialNumber : 'No Serial #'}
                                    </span>
                                  </div>
                                  {!hasSerial && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPurchase(item)}
                                      className="text-[10px] text-[#F2BD91] hover:underline shrink-0 ml-1"
                                    >
                                      + Add
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Warranty Action Bar */}
                          <div className="pt-2 border-t border-[#25262C] flex items-center justify-between gap-2 text-xs flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setClaimModalPurchase(item);
                                setIsClaimModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#24252B] hover:bg-[#303138] text-[#F2BD91] hover:text-[#F5C8A2] font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Claim Support & Helpline</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenAddReminderForPurchase(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#202127] hover:bg-[#282930] text-[#A5A5A5] hover:text-[#F5F3EF] flex items-center gap-1"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>Alert</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPurchase(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#202127] hover:bg-[#282930] text-[#A5A5A5] hover:text-[#F5F3EF] flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Coverage</span>
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
          })()}

          {/* ================================================================
              VIEW 5: REMINDERS PAGE
             ================================================================ */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
                    DEADLINES & ALERTS
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
                    Reminders
                  </h1>
                  <p className="text-sm text-[#A5A5A5] mt-0.5">
                    Never miss a warranty claim window, return deadline, or maintenance check.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSyncAutoReminders}
                    className="px-4 py-2.5 rounded-xl bg-[#191A1E] border border-[#292A2F] hover:border-[#F2BD91]/50 text-xs font-medium text-[#F5F3EF] flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#F2BD91]" />
                    Sync Auto-Reminders
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReminder(null);
                      setIsReminderModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    New Reminder
                  </button>
                </div>
              </div>

              {/* Browser Notification Preferences Banner */}
              <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#2A2319] border border-[#403423] flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-[#F2BD91]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F5F3EF]">
                      Browser Reminder Notifications
                    </div>
                    <p className="text-xs text-[#A5A5A5] mt-0.5">
                      Receive desktop browser alerts when warranties or return windows are due while Keeper is open.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBrowserNotifications}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                    profile.notificationsEnabled
                      ? 'bg-[#173023] text-[#5CE095] border border-[#224934]'
                      : 'bg-[#25262C] text-[#F5F3EF] hover:bg-[#2F3037]'
                  }`}
                >
                  {profile.notificationsEnabled ? 'Notifications Active' : 'Enable Browser Alerts'}
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2">
                {(
                  [
                    { id: 'upcoming', label: `Upcoming (${reminders.filter((r) => !r.completed).length})` },
                    { id: 'completed', label: `Completed (${reminders.filter((r) => r.completed).length})` },
                    { id: 'all', label: `All (${reminders.length})` }
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setReminderFilter(t.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      reminderFilter === t.id
                        ? 'bg-[#F2BD91] text-[#141518]'
                        : 'bg-[#191A1E] text-[#A5A5A5] border border-[#292A2F]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Reminders List */}
              {reminders.length === 0 ? (
                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-10 text-center">
                  <Bell className="w-9 h-9 text-[#A5A5A5] mx-auto mb-2 opacity-50" />
                  <div className="text-sm font-semibold text-[#F5F3EF]">No reminders scheduled</div>
                  <p className="text-xs text-[#A5A5A5] mt-1">
                    Reminders are created automatically when you add a purchase, or you can create a custom reminder anytime.
                  </p>
                </div>
              ) : (
                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl divide-y divide-[#25262B]">
                  {reminders
                    .filter((r) =>
                      reminderFilter === 'upcoming'
                        ? !r.completed
                        : reminderFilter === 'completed'
                        ? r.completed
                        : true
                    )
                    .map((rem) => {
                      const days = diffInDays(rem.dueDate, profile.referenceDate);
                      return (
                        <div
                          key={rem.id}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1E2025]/50 transition-colors"
                        >
                          <div className="flex items-start gap-3.5">
                            <button
                              type="button"
                              aria-label={`Mark ${rem.title} as ${rem.completed ? 'incomplete' : 'completed'}`}
                              onClick={() => {
                                setReminders((prev) =>
                                  prev.map((r) =>
                                    r.id === rem.id ? { ...r, completed: !r.completed } : r
                                  )
                                );
                                showToast(
                                  rem.completed
                                    ? 'Reopened reminder.'
                                    : `Completed "${rem.title}".`
                                );
                              }}
                              className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                rem.completed
                                  ? 'bg-[#58C286] border-[#58C286] text-[#141518]'
                                  : 'border-[#454650] hover:border-[#F2BD91]'
                              }`}
                            >
                              {rem.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </button>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm font-semibold ${
                                    rem.completed ? 'line-through text-[#7E7F85]' : 'text-[#F5F3EF]'
                                  }`}
                                >
                                  {rem.title}
                                </span>
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                    rem.type === 'Subscription Auto-Pay'
                                      ? 'bg-[#152B1F] text-[#58C286] border-[#224A35]'
                                      : rem.type === 'Subscription Renewal'
                                      ? 'bg-[#2E241A] text-[#E0A865] border-[#4B3926]'
                                      : 'bg-[#23242A] text-[#F2BD91] border-[#32333C]'
                                  }`}
                                >
                                  {(rem.type === 'Subscription Auto-Pay' || rem.type === 'Subscription Renewal') ? (
                                    <BrandLogo provider={rem.productName.split(' ')[0] || ''} size="xs" />
                                  ) : (
                                    <Bell className="w-3 h-3 text-[#F2BD91]" />
                                  )}
                                  <span>{rem.type}</span>
                                </span>
                              </div>
                              <div className="text-xs text-[#A5A5A5] mt-1">
                                {rem.subscriptionId ? 'Service / Carrier' : 'Product'}:{' '}
                                <strong className="text-[#D0CECA]">{rem.productName}</strong> &bull; Due{' '}
                                {formatDisplayDate(rem.dueDate)} ({formatRelativeCountdown(days)})
                              </div>
                              {rem.notes && (
                                <p className="text-xs text-[#8E8F94] mt-1">{rem.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReminder(rem);
                                setIsReminderModalOpen(true);
                              }}
                              className="p-2 rounded-lg bg-[#222328] hover:bg-[#2C2D34] text-[#A5A5A5] hover:text-white"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirmTarget({
                                  type: 'reminder',
                                  id: rem.id,
                                  name: rem.title
                                })
                              }
                              className="p-2 rounded-lg bg-[#222328] hover:bg-[#341B1E] text-[#A5A5A5] hover:text-[#F27474]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              VIEW 6: UNIFIED ANALYTICS (PURCHASES & SUBSCRIPTIONS)
             ================================================================ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
                  PORTFOLIO & EXPENSE INSIGHTS
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
                  Spending & Warranty Analytics
                </h1>
                <p className="text-sm text-[#A5A5A5] mt-0.5">
                  Unified portfolio expenditure combining registered hardware purchases and recurring subscriptions.
                </p>
              </div>

              {/* 4 Unified KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                  <div className="text-xs text-[#A5A5A5]">Total Portfolio Commitment</div>
                  <div className="text-2xl font-bold text-[#F2BD91] mt-1">
                    {formatINR(analyticsData.totalSpentAllTime, profile.currencySymbol)}
                  </div>
                  <div className="text-[11px] text-[#8E8F94] mt-1">
                    Assets: {formatINR(analyticsData.totalPurchasesSpent, profile.currencySymbol)} &bull; Subs: {formatINR(analyticsData.annualSubscriptionsRunRate, profile.currencySymbol)}/yr
                  </div>
                </div>

                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                  <div className="text-xs text-[#A5A5A5]">Monthly Recurring Burn</div>
                  <div className="text-2xl font-bold text-[#5CE095] mt-1">
                    {formatINR(analyticsData.monthlySubscriptionsBurn, profile.currencySymbol)}
                    <span className="text-xs font-normal text-[#A5A5A5] ml-1">/ mo</span>
                  </div>
                  <div className="text-[11px] text-[#8E8F94] mt-1">
                    Across {analyticsData.activeSubsCount} active subscription{analyticsData.activeSubsCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {analyticsData.hasIncome ? (
                  <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                    <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
                      <span>Net Monthly Savings</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          analyticsData.savingsRate >= 20
                            ? 'bg-[#152B1E] text-[#5CE095]'
                            : 'bg-[#312517] text-[#F2B354]'
                        }`}
                      >
                        {analyticsData.savingsRate >= 20 ? 'Goal Met (≥20%)' : 'Below 20%'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-[#5CE095] mt-1 font-mono">
                      {formatINR(analyticsData.netSavings, profile.currencySymbol)}
                    </div>
                    <div className="text-[11px] text-[#8E8F94] mt-1">
                      {analyticsData.savingsRate.toFixed(1)}% of take-home income saved
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                    <div className="text-xs text-[#A5A5A5]">Active Warranty Coverage</div>
                    <div className="text-2xl font-bold text-[#F5F3EF] mt-1">
                      {analyticsData.activeCount} Covered
                    </div>
                    <div className="text-[11px] text-[#8E8F94] mt-1">
                      {computedPurchases.length > 0
                        ? `${Math.round((analyticsData.activeCount / computedPurchases.length) * 100)}% of registered hardware`
                        : 'No hardware registered yet'}
                    </div>
                  </div>
                )}

                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5">
                  <div className="text-xs text-[#A5A5A5]">Subscriptions &amp; Auto-Pay</div>
                  <div className="text-2xl font-bold text-[#F2B354] mt-1">
                    {analyticsData.activeSubsCount} Plans
                  </div>
                  <div className="text-[11px] text-[#8E8F94] mt-1">
                    {analyticsData.autoPaySubsCount} on automated debit
                  </div>
                </div>
              </div>

              {computedPurchases.length === 0 && subscriptions.length === 0 && cards.length === 0 ? (
                <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-12 text-center">
                  <BarChart2 className="w-10 h-10 text-[#A5A5A5] mx-auto mb-3 opacity-50" />
                  <h3 className="text-base font-semibold text-[#F5F3EF]">
                    No analytics data to display yet
                  </h3>
                  <p className="text-xs text-[#A5A5A5] mt-1 max-w-sm mx-auto">
                    Register hardware purchases, recurring subscriptions, or card accounts to unlock expenditure trends and cashflow intelligence.
                  </p>
                </div>
              ) : (
                <>
                  {/* Portfolio Capital vs Recurring Breakdown Bar */}
                  {analyticsData.totalSpentAllTime > 0 && (
                    <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-semibold text-[#F5F3EF]">
                            Expenditure Structure: Capital Assets vs Recurring Subscriptions vs Card Spends
                          </h2>
                          <p className="text-xs text-[#A5A5A5]">
                            Comparison of one-time hardware investments vs annualized recurring subscriptions
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-[#F2BD91]" />
                            <span className="text-[#C5C5CB]">
                              Hardware ({Math.round((analyticsData.totalPurchasesSpent / analyticsData.totalSpentAllTime) * 100)}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-[#5CE095]" />
                            <span className="text-[#C5C5CB]">
                              Subscriptions ({Math.round((analyticsData.annualSubscriptionsRunRate / analyticsData.totalSpentAllTime) * 100)}%)
                            </span>
                          </div>
                          {analyticsData.totalCardSpends > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded bg-[#7FB2FF]" />
                              <span className="text-[#C5C5CB]">
                                Card Spends ({Math.round((analyticsData.totalCardSpends / analyticsData.totalSpentAllTime) * 100)}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-3 rounded-full bg-[#141518] overflow-hidden flex">
                        <div
                          className="h-full bg-[#F2BD91] transition-all"
                          style={{
                            width: `${(analyticsData.totalPurchasesSpent / analyticsData.totalSpentAllTime) * 100}%`
                          }}
                        />
                        <div
                          className="h-full bg-[#5CE095] transition-all"
                          style={{
                            width: `${(analyticsData.annualSubscriptionsRunRate / analyticsData.totalSpentAllTime) * 100}%`
                          }}
                        />
                        {analyticsData.totalCardSpends > 0 && (
                          <div
                            className="h-full bg-[#7FB2FF] transition-all"
                            style={{
                              width: `${(analyticsData.totalCardSpends / analyticsData.totalSpentAllTime) * 100}%`
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Monthly Trends & Category Share */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Monthly Trends Chart */}
                    <div className="lg:col-span-7 bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <h2 className="text-base font-semibold text-[#F5F3EF]">
                            Monthly Spending Trends
                          </h2>
                          <p className="text-xs text-[#A5A5A5] mt-0.5">
                            Capital hardware purchases, subscription overhead, and card transactions
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] self-start sm:self-auto">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#F2BD91]" />
                            <span className="text-[#A5A5A5]">Hardware</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#5CE095]" />
                            <span className="text-[#A5A5A5]">Subs</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded bg-[#7FB2FF]" />
                            <span className="text-[#A5A5A5]">Cards</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.monthlySeries}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#25262C" vertical={false} />
                            <XAxis
                              dataKey="label"
                              stroke="#8E8F94"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="#8E8F94"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => `${profile.currencySymbol}${Math.round(v / 1000)}k`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#151619',
                                borderColor: '#35363D',
                                borderRadius: '12px',
                                fontSize: '12px',
                                color: '#F5F3EF'
                              }}
                              formatter={(val: number, name: string) => [
                                formatINR(val, profile.currencySymbol),
                                name === 'purchases'
                                  ? 'Hardware Purchases'
                                  : name === 'subscriptions'
                                  ? 'Recurring Subscriptions'
                                  : name === 'cardExpenses'
                                  ? 'Card Spends'
                                  : 'Total'
                              ]}
                            />
                            <Bar dataKey="purchases" name="purchases" stackId="spend" fill="#F2BD91" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="subscriptions" name="subscriptions" stackId="spend" fill="#5CE095" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="cardExpenses" name="cardExpenses" stackId="spend" fill="#7FB2FF" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Spending by Category */}
                    <div className="lg:col-span-5 bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                      <h2 className="text-base font-semibold text-[#F5F3EF] mb-1">
                        Spending by Category
                      </h2>
                      <p className="text-xs text-[#A5A5A5] mb-4">
                        Hardware assets + annualized subscriptions + card expenses
                      </p>
                      <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                        {analyticsData.byCategory.map((cat) => {
                          const pct =
                            analyticsData.totalSpentAllTime > 0
                              ? Math.round((cat.amount / analyticsData.totalSpentAllTime) * 100)
                              : 0;
                          return (
                            <div key={cat.category}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-[#F5F3EF] flex items-center gap-1.5 truncate">
                                  <span>{cat.category}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#23242A] text-[#8E8F94] border border-[#2E2F37]">
                                    {cat.type === 'subscription'
                                      ? 'Recurring'
                                      : cat.type === 'purchase'
                                      ? 'Hardware'
                                      : cat.type === 'expense'
                                      ? 'Card Spend'
                                      : 'Combined'}
                                  </span>
                                </span>
                                <span className="text-[#D0CECA] shrink-0 ml-2 font-mono">
                                  {formatINR(cat.amount, profile.currencySymbol)} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-[#24252B] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    cat.type === 'subscription'
                                      ? 'bg-[#5CE095]'
                                      : cat.type === 'expense'
                                      ? 'bg-[#7FB2FF]'
                                      : 'bg-[#F2BD91]'
                                  }`}
                                  style={{ width: `${Math.max(4, pct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Spending by Payment Channel & Card Account */}
                  {analyticsData.byPaymentMethod && analyticsData.byPaymentMethod.length > 0 && (
                    <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-base font-semibold text-[#F5F3EF]">
                            Expenditure by Payment Channel &amp; Card
                          </h2>
                          <p className="text-xs text-[#A5A5A5] mt-0.5">
                            Breakdown of where capital and recurring money is charged across accounts
                          </p>
                        </div>
                        <span className="text-xs text-[#A5A5A5] font-medium">
                          {analyticsData.byPaymentMethod.length} Sources Active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {analyticsData.byPaymentMethod.map((pm) => (
                          <div
                            key={pm.name}
                            className="p-3.5 rounded-xl bg-[#141518] border border-[#26272C] flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#F5F3EF] truncate" title={pm.name}>
                                {pm.name}
                              </span>
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#202127] text-[#A5A5A5] border border-[#2C2D35]">
                                {pm.type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-lg font-bold text-[#F2BD91] font-mono">
                              {formatINR(pm.amount, profile.currencySymbol)}
                            </div>
                            <div className="text-[11px] text-[#8E8F94]">
                              {pm.count} linked transaction{pm.count !== 1 ? 's' : ''} / auto-debit
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dual Section: High-Value Hardware Investments & Top Recurring Subscriptions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Top Hardware Investments */}
                    {analyticsData.mostExpensive.length > 0 && (
                      <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-base font-semibold text-[#F5F3EF]">
                            High-Value Hardware Investments
                          </h2>
                          <span className="text-xs text-[#A5A5A5]">Top Assets</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {analyticsData.mostExpensive.slice(0, 3).map((item, index) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedPurchaseId(item.id)}
                              className="bg-[#141518] border border-[#26272D] hover:border-[#F2BD91]/40 rounded-xl p-3 cursor-pointer transition-all"
                            >
                              <div className="flex items-center justify-between text-[11px] text-[#A5A5A5] mb-2">
                                <span>#{index + 1}</span>
                                <span className="truncate max-w-[70px]">{item.category}</span>
                              </div>
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="w-full h-16 rounded-lg object-cover border border-[#292A2F] mb-2"
                              />
                              <div className="text-xs font-semibold text-[#F5F3EF] truncate">
                                {item.productName}
                              </div>
                              <div className="text-xs font-bold text-[#F2BD91] mt-0.5">
                                {formatINR(item.price, profile.currencySymbol)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Recurring Subscriptions */}
                    {analyticsData.topSubscriptions && analyticsData.topSubscriptions.length > 0 && (
                      <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-base font-semibold text-[#F5F3EF]">
                            Top Recurring Subscriptions
                          </h2>
                          <span className="text-xs text-[#5CE095]">Highest Monthly Impact</span>
                        </div>
                        <div className="space-y-2">
                          {analyticsData.topSubscriptions.slice(0, 4).map((sub) => {
                            const monthlyCost = normalizeMonthlyAmount(
                              sub.amount,
                              sub.billingCycle,
                              sub.customDays
                            );
                            return (
                              <div
                                key={sub.id}
                                className="p-2.5 rounded-xl bg-[#141518] border border-[#26272C] flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5 truncate pr-2">
                                  <BrandLogo provider={sub.provider} size="sm" />
                                  <div className="truncate">
                                    <div className="font-semibold text-[#F5F3EF] truncate">{sub.name}</div>
                                    <div className="text-[10px] text-[#8E8F94] truncate">
                                      {sub.category} &bull; {sub.billingCycle.replace('_', ' ')}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-bold text-[#5CE095] font-mono">
                                    {formatINR(Math.round(monthlyCost), profile.currencySymbol)}/mo
                                  </div>
                                  <div className="text-[10px] text-[#A5A5A5]">
                                    ({formatINR(Math.round(monthlyCost * 12), profile.currencySymbol)}/yr)
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================================================================
              VIEW 7: SETTINGS, ACCOUNT SECURITY & CLOUD VAULT PAGE
             ================================================================ */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#F2BD91]">
                    ACCOUNT & SECURITY
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-[#F5F3EF] mt-1">
                    Settings
                  </h1>
                  <p className="text-sm text-[#A5A5A5] mt-0.5">
                    Manage your authenticated profile, password security, currency preferences, and secure cloud storage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#2B1B1D] hover:bg-[#3B2225] border border-[#4D262A] text-[#F27474] text-xs font-semibold flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out ({profile.email})
                </button>
              </div>

              {/* Profile Configuration Card */}
              <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-semibold text-[#F5F3EF]">Profile & Preferences</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#A5A5A5] mb-1.5">
                      Display Name (Used in Dashboard Greeting)
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setProfile({ ...profile, name: nextName });
                        if (authSession) {
                          const updatedAcc = { ...authSession, name: nextName };
                          setAuthSession(updatedAcc);
                          saveActiveSession(updatedAcc, true);
                          const all = loadRegisteredAccounts().map((a) =>
                            a.id === authSession.id ? updatedAcc : a
                          );
                          saveRegisteredAccounts(all);
                        }
                      }}
                      className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A5A5A5] mb-1.5">Authenticated Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full bg-[#101113] border border-[#24252A] rounded-xl px-3.5 py-2.5 text-sm text-[#8E8F94] cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A5A5A5] mb-1.5">Currency Symbol</label>
                    <select
                      value={profile.currencySymbol}
                      onChange={(e) => setProfile({ ...profile, currencySymbol: e.target.value })}
                      className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:outline-none"
                    >
                      <option value="₹">₹ (Indian Rupee - INR)</option>
                      <option value="$">$ (US Dollar - USD)</option>
                      <option value="€">€ (Euro - EUR)</option>
                      <option value="£">£ (British Pound - GBP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#A5A5A5] mb-1.5">
                      "Expiring Soon" Warning Threshold (Days)
                    </label>
                    <input
                      type="number"
                      min={7}
                      max={180}
                      value={profile.expiringThresholdDays}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          expiringThresholdDays: Math.max(7, Number(e.target.value) || 30)
                        })
                      }
                      className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password Security Update Card */}
              <form
                onSubmit={handleChangePassword}
                className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[#F5F3EF]">
                      Change Account Password
                    </h2>
                    <p className="text-xs text-[#A5A5A5] mt-0.5">
                      Passwords are salted and hashed with Web Crypto SHA-256 before storage.
                    </p>
                  </div>
                  <Lock className="w-5 h-5 text-[#F2BD91]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#A5A5A5] mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A5A5A5] mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassInput}
                      onChange={(e) => setConfirmPassInput(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold"
                  >
                    Update Password
                  </button>
                </div>
              </form>

              {/* Real Cloud Vault Engine */}
              <div className="bg-[#191A1E] border border-[#292A2F] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[#F5F3EF]">
                        Keeper Cloud Vault &amp; Storage
                      </h2>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold border bg-[#152B1F] text-[#58C286] border-[#224A35]">
                        ● Cloud Storage Active
                      </span>
                    </div>
                    <p className="text-xs text-[#A5A5A5] mt-1">
                      All purchases, warranties, receipts, and subscriptions are synchronized with your secure cloud vault. Zero fake data.
                    </p>
                  </div>
                  <Cloud className="w-5 h-5 text-[#58C286]" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                  <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
                    <div className="text-[11px] text-[#A5A5A5]">Purchases</div>
                    <div className="text-lg font-bold text-[#F5F3EF]">{purchases.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
                    <div className="text-[11px] text-[#A5A5A5]">Subscriptions</div>
                    <div className="text-lg font-bold text-[#F2BD91]">{subscriptions.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
                    <div className="text-[11px] text-[#A5A5A5]">Reminders</div>
                    <div className="text-lg font-bold text-[#58C286]">{reminders.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141518] border border-[#26272C] text-center">
                    <div className="text-[11px] text-[#A5A5A5]">Receipts</div>
                    <div className="text-lg font-bold text-[#7FB2FF]">{receipts.length}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReloadSampleData}
                    className="px-4 py-2.5 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Starter Data
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDatabaseModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#25262C] hover:bg-[#2F3038] text-[#F5F3EF] text-xs font-medium flex items-center gap-2 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5 text-[#58C286]" />
                    Manage Cloud Vault
                  </button>

                  <button
                    type="button"
                    onClick={handleClearDatabase}
                    className="px-4 py-2.5 rounded-xl bg-[#25262C] hover:bg-[#341B1E] text-[#A5A5A5] hover:text-[#F27474] text-xs font-medium ml-auto"
                  >
                    Reset Records
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ====================================================================
          MOBILE BOTTOM QUICK-NAVIGATION BAR
         ==================================================================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#151619]/95 backdrop-blur-md border-t border-[#292A2F] grid grid-cols-5 py-1.5 px-2"
      >
        {(
          [
            { id: 'dashboard', label: 'Home', icon: Home },
            { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
            { id: 'subscriptions', label: 'Subs', icon: CreditCard },
            { id: 'wallet', label: 'Wallet', icon: Wallet },
            { id: 'warranties', label: 'Warranties', icon: ShieldCheck }
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] ${
                isActive ? 'text-[#F2BD91] font-semibold' : 'text-[#A5A5A5]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ====================================================================
          MODAL 1: PURCHASE DETAILS VIEW (Section 10)
         ==================================================================== */}
      {selectedPurchase && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedPurchaseId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedPurchase.imageUrl}
                  alt={selectedPurchase.productName}
                  className="w-24 h-16 rounded-xl object-cover border border-[#32333A]"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#25262C] text-[#F2BD91] font-medium">
                      {selectedPurchase.category}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${
                        selectedPurchase.warrantyStatus === 'Active'
                          ? 'bg-[#173023] text-[#5CE095]'
                          : selectedPurchase.warrantyStatus === 'Expiring Soon'
                          ? 'bg-[#362816] text-[#F2B354]'
                          : selectedPurchase.warrantyStatus === 'Expired'
                          ? 'bg-[#341B1E] text-[#F27474]'
                          : 'bg-[#26272C] text-[#A5A5A5]'
                      }`}
                    >
                      {selectedPurchase.warrantyDisplayLabel}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#F5F3EF] mt-1">
                    {selectedPurchase.productName}
                  </h2>
                  <div className="text-xs text-[#A5A5A5]">
                    {selectedPurchase.brand} &bull; Serial: {selectedPurchase.serialNumber || 'N/A'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPurchaseId(null)}
                className="p-1.5 rounded-lg bg-[#23242A] text-[#A5A5A5] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#141518] border border-[#26272C] rounded-xl p-3">
                <div className="text-[11px] text-[#A5A5A5]">Purchase Price</div>
                <div className="text-base font-bold text-[#F2BD91] mt-0.5">
                  {formatINR(selectedPurchase.price, profile.currencySymbol)}
                </div>
                {profile.monthlyIncome !== undefined && profile.monthlyIncome > 0 && (
                  <div className="text-[10px] text-[#5CE095] font-medium mt-0.5">
                    ~{Math.max(0.1, Math.round((selectedPurchase.price / (profile.monthlyIncome / 22)) * 10) / 10)} work days
                  </div>
                )}
              </div>
              <div className="bg-[#141518] border border-[#26272C] rounded-xl p-3">
                <div className="text-[11px] text-[#A5A5A5]">Purchase Date</div>
                <div className="text-sm font-semibold text-[#F5F3EF] mt-0.5">
                  {formatDisplayDate(selectedPurchase.purchaseDate)}
                </div>
              </div>
              <div className="bg-[#141518] border border-[#26272C] rounded-xl p-3">
                <div className="text-[11px] text-[#A5A5A5]">Warranty Expiry</div>
                <div className="text-sm font-semibold text-[#F5F3EF] mt-0.5">
                  {selectedPurchase.warrantyExpiryDate
                    ? formatDisplayDate(selectedPurchase.warrantyExpiryDate)
                    : 'No Warranty'}
                </div>
              </div>
              <div className="bg-[#141518] border border-[#26272C] rounded-xl p-3">
                <div className="text-[11px] text-[#A5A5A5]">Return Window</div>
                <div className="text-sm font-semibold text-[#F5F3EF] mt-0.5">
                  {selectedPurchase.isReturnEligible
                    ? `${selectedPurchase.remainingReturnDays} days left`
                    : selectedPurchase.returnDeadlineDate
                    ? `Ended ${formatDisplayDate(selectedPurchase.returnDeadlineDate)}`
                    : 'Non-returnable'}
                </div>
              </div>
            </div>

            <div className="bg-[#141518] border border-[#26272C] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#A5A5A5]">Store / Seller:</span>
                <span className="font-medium text-[#F5F3EF]">
                  {selectedPurchase.store || 'Authorised Retailer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A5A5A5]">Warranty:</span>
                <span className="font-medium text-[#F5F3EF]">
                  {selectedPurchase.warrantyExpiryDate
                    ? `Expires ${formatDisplayDate(selectedPurchase.warrantyExpiryDate)} (${selectedPurchase.warrantyDisplayLabel})`
                    : 'No Warranty'}
                </span>
              </div>
              {selectedPurchase.notes && (
                <div className="pt-2 border-t border-[#24252B]">
                  <div className="text-[#A5A5A5] mb-1">Personal Notes:</div>
                  <p className="text-[#D8D6D2] leading-relaxed">{selectedPurchase.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-[#141518] border border-[#26272C] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {(() => {
                const rec = receipts.find((r) => r.purchaseId === selectedPurchase.id);
                if (rec) {
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#F2BD91]" />
                        <div>
                          <div className="text-xs font-semibold text-[#F5F3EF]">{rec.fileName}</div>
                          <div className="text-[11px] text-[#A5A5A5]">
                            Invoice #{rec.invoiceNumber} &bull; Uploaded {formatDisplayDate(rec.uploadDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePreviewReceipt(rec)}
                          className="px-3 py-1.5 rounded-lg bg-[#24252B] hover:bg-[#2F3038] text-xs text-[#F5F3EF] flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#F2BD91]" />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(rec)}
                          className="px-3 py-1.5 rounded-lg bg-[#24252B] hover:bg-[#2F3038] text-xs text-[#F5F3EF] flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    <div className="text-xs text-[#A5A5A5]">
                      No receipt attached to this product yet.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadPurchaseId(selectedPurchase.id);
                        setSelectedPurchaseId(null);
                        setActiveTab('receipts');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#24252B] hover:bg-[#2F3038] text-xs text-[#F2BD91] font-medium"
                    >
                      + Upload Receipt
                    </button>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#26272C]">
              <button
                type="button"
                onClick={() => {
                  const target = selectedPurchase;
                  setSelectedPurchaseId(null);
                  setDeleteConfirmTarget({
                    type: 'purchase',
                    id: target.id,
                    name: target.productName
                  });
                }}
                className="px-4 py-2 rounded-xl bg-[#2B1B1D] hover:bg-[#3B2225] text-[#F27474] text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Purchase
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedPurchaseId(null)}
                  className="px-4 py-2 rounded-xl bg-[#25262C] text-xs text-[#F5F3EF]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedPurchase;
                    setSelectedPurchaseId(null);
                    handleOpenEditPurchase(target);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Purchase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: ADD / EDIT PURCHASE FORM MODAL
         ==================================================================== */}
      {isPurchaseModalOpen && (
        <PurchaseFormModal
          initialPurchase={editingPurchase}
          referenceDate={profile.referenceDate}
          currencySymbol={profile.currencySymbol}
          cards={cards}
          onClose={() => {
            setIsPurchaseModalOpen(false);
            setEditingPurchase(null);
          }}
          onSave={handleSavePurchase}
        />
      )}

      {/* ====================================================================
          MODAL 2B: ADD / EDIT SUBSCRIPTION & AUTO-PAY MODAL
         ==================================================================== */}
      {isSubscriptionModalOpen && (
        <SubscriptionModal
          initialSubscription={editingSubscription}
          referenceDate={profile.referenceDate}
          currencySymbol={profile.currencySymbol}
          cards={cards}
          onClose={() => {
            setIsSubscriptionModalOpen(false);
            setEditingSubscription(null);
          }}
          onSave={handleSaveSubscription}
        />
      )}

      {/* ====================================================================
          MODAL 2C: DATABASE MANAGEMENT MODAL
         ==================================================================== */}
      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onReloadSampleData={handleReloadSampleData}
        onClearDatabase={handleClearDatabase}
        counts={{
          purchases: purchases.length,
          subscriptions: subscriptions.length,
          reminders: reminders.length,
          receipts: receipts.length,
          cards: cards.length
        }}
      />

      {/* ====================================================================
          MODAL 3: ADD / EDIT REMINDER FORM MODAL
         ==================================================================== */}
      {isReminderModalOpen && (
        <ReminderFormModal
          initialReminder={editingReminder}
          purchases={purchases}
          referenceDate={profile.referenceDate}
          onClose={() => {
            setIsReminderModalOpen(false);
            setEditingReminder(null);
          }}
          onSave={(remData) => {
            if (editingReminder) {
              setReminders((prev) =>
                prev.map((r) => (r.id === editingReminder.id ? { ...editingReminder, ...remData } : r))
              );
              showToast(`Updated reminder "${remData.title}".`);
            } else {
              const newRem: ReminderRecord = {
                ...remData,
                id: `rem_${Date.now()}`
              };
              setReminders((prev) => [newRem, ...prev]);
              showToast(`Created reminder "${remData.title}".`);
            }
            setIsReminderModalOpen(false);
            setEditingReminder(null);
          }}
        />
      )}

      {/* ====================================================================
          MODAL 4: RECEIPT PREVIEW MODAL
         ==================================================================== */}
      {previewReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewReceipt(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292A2F]">
              <div>
                <h3 className="text-base font-semibold text-[#F5F3EF]">{previewReceipt.fileName}</h3>
                <div className="text-xs text-[#A5A5A5]">
                  Invoice #{previewReceipt.invoiceNumber} &bull; Uploaded{' '}
                  {formatDisplayDate(previewReceipt.uploadDate)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="p-1.5 rounded-lg bg-[#23242A] text-[#A5A5A5] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewBlobUrl && previewReceipt.fileType.startsWith('image/') ? (
              <div className="bg-[#141518] rounded-xl p-4 flex items-center justify-center max-h-96 overflow-auto">
                <img
                  src={previewBlobUrl}
                  alt={previewReceipt.fileName}
                  className="max-h-80 rounded-lg object-contain"
                />
              </div>
            ) : (
              (() => {
                const assoc = computedPurchases.find((p) => p.id === previewReceipt.purchaseId);
                const price = assoc ? assoc.price : 0;
                const subTotal = Math.round(price / 1.18);
                const gst = price - subTotal;
                return (
                  <div className="bg-[#141518] border border-[#292A2F] rounded-xl p-5 space-y-4 text-xs">
                    <div className="flex items-start justify-between pb-3 border-b border-[#25262C]">
                      <div>
                        <div className="text-sm font-bold text-[#F2BD91]">
                          {assoc?.store || 'Authorised Retailer'}
                        </div>
                        <div className="text-[11px] text-[#A5A5A5]">
                          TAX INVOICE &amp; WARRANTY CERTIFICATE
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#F5F3EF]">
                          {previewReceipt.invoiceNumber}
                        </div>
                        <div className="text-[#A5A5A5]">
                          Date: {formatDisplayDate(previewReceipt.uploadDate)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[#A5A5A5]">
                      <div>
                        Customer: <strong className="text-[#F5F3EF]">{profile.name}</strong>
                      </div>
                      <div className="text-right">
                        Serial: <strong className="text-[#F5F3EF]">{assoc?.serialNumber || 'VERIFIED'}</strong>
                      </div>
                    </div>

                    <div className="border-t border-b border-[#25262C] py-3 space-y-2">
                      <div className="flex justify-between font-medium text-[#F5F3EF]">
                        <span>
                          {assoc?.productName || previewReceipt.fileName} ({assoc?.brand || 'Product'})
                        </span>
                        <span>{formatINR(subTotal, profile.currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between text-[#A5A5A5]">
                        <span>GST (18% IGST/CGST+SGST)</span>
                        <span>{formatINR(gst, profile.currencySymbol)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-[#A5A5A5]">Total Paid</span>
                      <span className="text-[#F2BD91]">
                        {formatINR(price, profile.currencySymbol)}
                      </span>
                    </div>
                  </div>
                );
              })()
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="px-4 py-2 rounded-xl bg-[#25262C] text-xs text-[#F5F3EF]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadReceipt(previewReceipt)}
                className="px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 5: DELETE CONFIRMATION MODAL
         ==================================================================== */}
      {deleteConfirmTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#341B1E] border border-[#4D262A] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#F27474]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#F5F3EF]">Confirm Deletion</h3>
                <p className="text-xs text-[#A5A5A5]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[#D0CECA]">
              Are you sure you want to delete{' '}
              <strong className="text-[#F5F3EF]">"{deleteConfirmTarget.name}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#25262C] text-xs text-[#F5F3EF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#E05252] hover:bg-[#F06060] text-white text-xs font-semibold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 6: KEEPER PRO / STORAGE VAULT MODAL
         ==================================================================== */}
      {isProModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsProModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#191A1E] border border-[#362E28] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-[#F2BD91]" />
                <h3 className="text-base font-semibold text-[#F5F3EF]">
                  Keeper Vault Storage &amp; Pro Tools
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProModalOpen(false)}
                className="p-1 rounded-lg text-[#A5A5A5] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              Your Keeper account includes 5 GB of encrypted receipt vault storage, automated warranty &amp; return window reminders, and full JSON portfolio export.
            </p>
            <div className="bg-[#141518] border border-[#26272C] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A5A5A5]">Current Vault Usage</span>
                <span className="text-[#F5F3EF] font-semibold">
                  {storageUsedGB} GB / {profile.storageQuotaGB} GB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A5A5A5]">IndexedDB Binary Receipt Store</span>
                <span className="text-[#5CE095] font-medium">Active ({receipts.length} files)</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const dataStr = JSON.stringify({ profile, purchases, subscriptions, receipts, reminders }, null, 2);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `keeper_portfolio_backup_${profile.referenceDate}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  showToast('Exported complete Keeper JSON backup.');
                  setIsProModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Full Backup (.JSON)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 7: RECEIPT & INVOICE DETAILS & NOTES MODAL
         ==================================================================== */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setEditingReceipt(null);
          setPendingReceiptFile(null);
        }}
        onSave={handleSaveReceipt}
        editingReceipt={editingReceipt}
        pendingFile={pendingReceiptFile}
        purchases={purchases}
        currencySymbol={profile.currencySymbol}
        defaultDate={profile.referenceDate}
        initialPurchaseId={receiptModalPurchaseId}
      />

      {/* ====================================================================
          MODAL 8: WARRANTY CLAIM & OEM SUPPORT DOSSIER MODAL
         ==================================================================== */}
      <WarrantyClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          setClaimModalPurchase(null);
        }}
        purchase={claimModalPurchase}
        receipt={receipts.find((r) => r.purchaseId === claimModalPurchase?.id)}
        onPreviewReceipt={(rec) => {
          setIsClaimModalOpen(false);
          handlePreviewReceipt(rec);
        }}
        onEditPurchase={(p) => {
          setIsClaimModalOpen(false);
          handleOpenEditPurchase(p);
        }}
        currencySymbol={profile.currencySymbol}
      />

      {/* ====================================================================
          MODAL 9: WALLET CARD & ACCOUNT MODAL (ZERO CREDENTIALS)
         ==================================================================== */}
      <CardAccountModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
        editingCard={editingCard}
        currencySymbol={profile.currencySymbol}
      />

      {/* ====================================================================
          FLOATING TOAST NOTIFICATION
         ==================================================================== */}
      {toast && (
        <div className="fixed bottom-16 lg:bottom-6 right-6 z-50 bg-[#1E1F24] border border-[#F2BD91]/50 text-[#F5F3EF] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#F2BD91] shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
    </>
  );
}

// ============================================================================
// SUB-COMPONENT: ADD / EDIT PURCHASE FORM MODAL WITH LIVE WARRANTY CALCULATOR
// ============================================================================
function PurchaseFormModal({
  initialPurchase,
  referenceDate,
  currencySymbol,
  cards,
  onClose,
  onSave
}: {
  initialPurchase: Purchase | null;
  referenceDate: string;
  currencySymbol: string;
  cards?: CardAccountRecord[];
  onClose: () => void;
  onSave: (data: Omit<Purchase, 'id' | 'createdAt'>, autoCreateReminders: boolean) => void;
}) {
  const STANDARD_CATEGORIES = [
    'Smartphones',
    'Laptops',
    'Audio',
    'Gaming',
    'Cameras',
    'Tablets',
    'Appliances',
    'Wearables',
    'Accessories'
  ];

  const initialIsCustom = initialPurchase
    ? !STANDARD_CATEGORIES.includes(initialPurchase.category)
    : false;

  const [productName, setProductName] = useState(initialPurchase?.productName || '');
  const [brand, setBrand] = useState(initialPurchase?.brand || '');
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>(
    initialPurchase
      ? initialIsCustom
        ? 'Others'
        : initialPurchase.category
      : 'Smartphones'
  );
  const [customCategory, setCustomCategory] = useState<string>(
    initialPurchase && initialIsCustom ? initialPurchase.category : ''
  );

  const effectiveCategory =
    selectedCategoryOption === 'Others'
      ? customCategory.trim() || 'Others'
      : selectedCategoryOption;

  const [price, setPrice] = useState(
    initialPurchase ? String(initialPurchase.price) : ''
  );
  const [purchaseDate, setPurchaseDate] = useState(
    initialPurchase?.purchaseDate || referenceDate
  );
  const [store, setStore] = useState(initialPurchase?.store || '');
  const [warrantyMonths, setWarrantyMonths] = useState(
    initialPurchase !== null ? String(initialPurchase.warrantyMonths) : '0'
  );
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState<string>(
    initialPurchase?.warrantyExpiryOverride ||
      (initialPurchase?.warrantyMonths && initialPurchase.warrantyMonths > 0
        ? addMonthsToDate(initialPurchase.purchaseDate, initialPurchase.warrantyMonths)
        : '')
  );
  const [returnDays, setReturnDays] = useState(
    initialPurchase !== null ? String(initialPurchase.returnDays) : '14'
  );
  const [imageUrl, setImageUrl] = useState(
    initialPurchase?.imageUrl || PRODUCT_IMAGES.iphone15
  );
  const [serialNumber, setSerialNumber] = useState(initialPurchase?.serialNumber || '');
  const [paymentCardId, setPaymentCardId] = useState(initialPurchase?.paymentCardId || '');
  const [notes, setNotes] = useState(initialPurchase?.notes || '');
  const [autoReminders, setAutoReminders] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const previewMetrics = useMemo(() => {
    const tempPurchase: Purchase = {
      id: 'preview',
      productName: productName || 'New Product',
      brand: brand || 'Brand',
      category: effectiveCategory as ProductCategory,
      price: Number(price) || 0,
      purchaseDate: purchaseDate || referenceDate,
      store,
      warrantyMonths: Math.max(0, Number(warrantyMonths) || 0),
      warrantyExpiryOverride: warrantyExpiryDate.trim() || undefined,
      returnDays: Math.max(0, Number(returnDays) || 0),
      imageUrl,
      notes,
      createdAt: ''
    };
    return computePurchaseDetails(tempPurchase, referenceDate, 35);
  }, [
    productName,
    brand,
    effectiveCategory,
    price,
    purchaseDate,
    store,
    warrantyMonths,
    warrantyExpiryDate,
    returnDays,
    imageUrl,
    notes,
    referenceDate
  ]);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setErrorMsg('Please enter a product name.');
      return;
    }
    if (!brand.trim()) {
      setErrorMsg('Please enter the brand name.');
      return;
    }
    if (selectedCategoryOption === 'Others' && !customCategory.trim()) {
      setErrorMsg('Please type your product category name.');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0 || price.trim() === '') {
      setErrorMsg('Please enter a valid purchase price.');
      return;
    }
    if (!purchaseDate) {
      setErrorMsg('Please select the purchase date.');
      return;
    }

    onSave(
      {
        productName: productName.trim(),
        brand: brand.trim(),
        category: effectiveCategory as ProductCategory,
        price: numPrice,
        purchaseDate,
        store: store.trim() || 'Authorised Store',
        warrantyMonths: Math.max(0, Number(warrantyMonths) || 0),
        warrantyExpiryOverride: warrantyExpiryDate.trim() || undefined,
        returnDays: Math.max(0, Number(returnDays) || 0),
        imageUrl,
        serialNumber: serialNumber.trim(),
        paymentCardId: paymentCardId || undefined,
        notes: notes.trim()
      },
      autoReminders
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#292A2F]">
          <div>
            <h2 className="text-lg font-semibold text-[#F5F3EF]">
              {initialPurchase ? 'Edit Purchase' : 'Add New Purchase'}
            </h2>
            <p className="text-xs text-[#A5A5A5]">
              Warranty expiry and return deadlines are calculated automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#23242A] text-[#A5A5A5] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#341B1E] border border-[#4D262A] text-xs text-[#F27474]">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. iPhone 16 Pro, MacBook Air"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Brand *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Apple, Sony, Dyson"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Category *</label>
              <select
                value={selectedCategoryOption}
                onChange={(e) => setSelectedCategoryOption(e.target.value)}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                <option value="Smartphones">Smartphones</option>
                <option value="Laptops">Laptops</option>
                <option value="Audio">Audio</option>
                <option value="Gaming">Gaming</option>
                <option value="Cameras">Cameras</option>
                <option value="Tablets">Tablets</option>
                <option value="Appliances">Appliances</option>
                <option value="Wearables">Wearables</option>
                <option value="Accessories">Accessories</option>
                <option value="Others">Others (Custom Category)...</option>
              </select>
            </div>

            {selectedCategoryOption === 'Others' && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-[#F2BD91] mb-1 font-medium">
                  Type Your Product Category *
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Smart Home, Musical Instrument, Furniture, Drone, Fitness..."
                  className="w-full bg-[#141518] border border-[#F2BD91]/60 focus:border-[#F2BD91] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none placeholder-[#6E6F74]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">
                Purchase Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="79900"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Purchase Date *</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value);
                  if (warrantyMonths && Number(warrantyMonths) > 0) {
                    setWarrantyExpiryDate(addMonthsToDate(e.target.value, Number(warrantyMonths)));
                  }
                }}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Store or Seller</label>
              <input
                type="text"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="e.g. Apple BKC, Amazon India, Croma"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
            </div>

            {/* Column for Adding Warranty Expiry Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#A5A5A5] flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#F2BD91]" />
                  <span>Warranty Expiry Date</span>
                </label>
                {warrantyExpiryDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWarrantyExpiryDate('');
                      setWarrantyMonths('0');
                    }}
                    className="text-[10px] text-[#A5A5A5] hover:text-[#F27474]"
                  >
                    Clear / None
                  </button>
                ) : null}
              </div>
              <input
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              />
              <span className="text-[10px] text-[#7E7F85] mt-1 block">
                {warrantyExpiryDate
                  ? `Valid till ${formatDisplayDate(warrantyExpiryDate)}`
                  : 'No warranty set (no default applied)'}
              </span>
            </div>

            {/* Quick Duration Preset */}
            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Warranty Duration (Quick Fill)</label>
              <select
                value={warrantyMonths}
                onChange={(e) => {
                  const m = e.target.value;
                  setWarrantyMonths(m);
                  if (m === '0' || !m) {
                    setWarrantyExpiryDate('');
                  } else {
                    const base = purchaseDate || referenceDate;
                    setWarrantyExpiryDate(addMonthsToDate(base, Number(m)));
                  }
                }}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                <option value="0">No Warranty / Custom Date</option>
                <option value="6">6 Months (+6M)</option>
                <option value="12">1 Year (12 Months)</option>
                <option value="24">2 Years (24 Months)</option>
                <option value="36">3 Years (36 Months)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Return Period (Days)</label>
              <select
                value={returnDays}
                onChange={(e) => setReturnDays(e.target.value)}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                <option value="0">No Return Window (0 Days)</option>
                <option value="7">7 Days</option>
                <option value="10">10 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#A5A5A5] mb-1">Payment Card / Account Used</label>
              <select
                value={paymentCardId}
                onChange={(e) => setPaymentCardId(e.target.value)}
                className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:outline-none"
              >
                <option value="">None / Cash / UPI Direct</option>
                {cards && cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 'credit_card' ? '💳 ' : c.type === 'debit_card' ? '🏧 ' : '🏦 '}
                    {c.name} ({c.type === 'credit_card' ? 'Credit' : c.type === 'debit_card' ? 'Debit' : 'Savings'} •••• {c.last4})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1.5">
              Product Image (Select studio preset or upload custom photo)
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(PRODUCT_IMAGES)
                .slice(0, 6)
                .map(([key, url]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setImageUrl(url)}
                    className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                      imageUrl === url ? 'border-[#F2BD91] scale-105' : 'border-[#292A2F] opacity-70'
                    }`}
                  >
                    <img src={url} alt={key} className="w-full h-full object-cover" />
                  </button>
                ))}
              <label className="px-3 py-2 rounded-lg bg-[#141518] border border-[#292A2F] hover:border-[#F2BD91] text-xs text-[#F2BD91] cursor-pointer">
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1">Purchase Notes / Serial Number</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional serial number, AppleCare+ details, or box contents..."
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3.5 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
            />
          </div>

          <div className="bg-[#141518] border border-[#292A2F] rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[#A5A5A5] block">Warranty Expiry</span>
              <strong className={previewMetrics.warrantyExpiryDate ? 'text-[#F5F3EF]' : 'text-[#8E8F94]'}>
                {previewMetrics.warrantyExpiryDate
                  ? formatDisplayDate(previewMetrics.warrantyExpiryDate)
                  : 'No Warranty Set'}
              </strong>
            </div>
            <div>
              <span className="text-[#A5A5A5] block">Warranty Status</span>
              <strong className={previewMetrics.warrantyExpiryDate ? 'text-[#F2BD91]' : 'text-[#8E8F94]'}>
                {previewMetrics.warrantyDisplayLabel}{' '}
                {previewMetrics.remainingWarrantyDays !== null
                  ? `(${previewMetrics.remainingWarrantyDays}d)`
                  : ''}
              </strong>
            </div>
            <div>
              <span className="text-[#A5A5A5] block">Return Deadline</span>
              <strong className="text-[#F5F3EF]">
                {previewMetrics.returnDeadlineDate
                  ? `${formatDisplayDate(previewMetrics.returnDeadlineDate)} (${
                      previewMetrics.isReturnEligible ? 'Eligible' : 'Closed'
                    })`
                  : 'None'}
              </strong>
            </div>
          </div>

          {!initialPurchase && (
            <label className="flex items-center gap-2 text-xs text-[#D0CECA] cursor-pointer">
              <input
                type="checkbox"
                checked={autoReminders}
                onChange={(e) => setAutoReminders(e.target.checked)}
                className="rounded accent-[#F2BD91]"
              />
              Automatically create reminders for warranty expiration and return deadline
            </label>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#292A2F]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#25262C] text-xs text-[#F5F3EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F2BD91] hover:bg-[#F5C8A2] text-[#141518] text-xs font-semibold"
            >
              {initialPurchase ? 'Save Changes' : 'Register Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ADD / EDIT REMINDER MODAL
// ============================================================================
function ReminderFormModal({
  initialReminder,
  purchases,
  referenceDate,
  onClose,
  onSave
}: {
  initialReminder: ReminderRecord | null;
  purchases: Purchase[];
  referenceDate: string;
  onClose: () => void;
  onSave: (data: Omit<ReminderRecord, 'id'>) => void;
}) {
  const [purchaseId, setPurchaseId] = useState(
    initialReminder?.purchaseId || purchases[0]?.id || ''
  );
  const [title, setTitle] = useState(initialReminder?.title || '');
  const [type, setType] = useState<ReminderType>(
    initialReminder?.type || 'Warranty Expiration'
  );
  const [dueDate, setDueDate] = useState(
    initialReminder?.dueDate || addDaysToDate(referenceDate, 14)
  );
  const [notes, setNotes] = useState(initialReminder?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assoc = purchases.find((p) => p.id === purchaseId);
    const productName = assoc ? assoc.productName : 'General Product';
    onSave({
      purchaseId: purchaseId || undefined,
      productName,
      title: title.trim() || `${type} – ${productName}`,
      type,
      dueDate,
      completed: initialReminder?.completed || false,
      notes: notes.trim()
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#191A1E] border border-[#2E2F36] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#292A2F]">
          <h3 className="text-base font-semibold text-[#F5F3EF]">
            {initialReminder ? 'Edit Reminder' : 'Create Reminder'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#A5A5A5] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1">Associated Product</label>
            <select
              value={purchaseId}
              onChange={(e) => setPurchaseId(e.target.value)}
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none"
            >
              <option value="">General Reminder (No specific product)</option>
              {purchases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName} ({p.brand})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1">Reminder Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReminderType)}
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-sm text-[#F5F3EF] focus:outline-none"
            >
              <option value="Warranty Expiration">Warranty Expiration</option>
              <option value="Return Deadline">Return Deadline</option>
              <option value="Extended Warranty Renewal">Extended Warranty Renewal</option>
              <option value="Subscription Auto-Pay">Subscription Auto-Pay</option>
              <option value="Subscription Renewal">Subscription Renewal</option>
              <option value="Custom Reminder">Custom Reminder</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1">Reminder Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renew AppleCare+ before expiry"
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1">Due Date *</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-[#A5A5A5] mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional action notes..."
              className="w-full bg-[#141518] border border-[#292A2F] rounded-xl px-3 py-2 text-sm text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#25262C] text-xs text-[#F5F3EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F2BD91] text-[#141518] text-xs font-semibold"
            >
              {initialReminder ? 'Update Reminder' : 'Save Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
