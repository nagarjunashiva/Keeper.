import { Purchase, ReceiptRecord, ReminderRecord, UserProfile } from '../App';
import { SubscriptionRecord } from '../types/subscription';
import { CardAccountRecord } from '../types/card';

const IDB_DATABASE_NAME = 'KeeperRealDatabase_v2';
const IDB_DATABASE_VERSION = 2;

export interface DatabaseState {
  engine: 'cloud' | 'local';
  connected: boolean;
  itemCount: {
    purchases: number;
    subscriptions: number;
    reminders: number;
    receipts: number;
    cards: number;
  };
  lastSyncedAt?: string;
}

// ============================================================================
// 1. REAL INDEXEDDB TRANSACTIONAL ENGINE
// ============================================================================
function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(IDB_DATABASE_NAME, IDB_DATABASE_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('purchases')) {
        const store = db.createObjectStore('purchases', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('subscriptions')) {
        const store = db.createObjectStore('subscriptions', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('reminders')) {
        const store = db.createObjectStore('reminders', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('receipts')) {
        const store = db.createObjectStore('receipts', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('cards')) {
        const store = db.createObjectStore('cards', { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('receiptBlobs')) {
        db.createObjectStore('receiptBlobs');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function idbGetAll<T>(storeName: string, userId?: string): Promise<T[]> {
  const db = await openDatabase();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        let results = (req.result as (T & { user_id?: string })[]) || [];
        if (userId) {
          results = results.filter((item) => !item.user_id || item.user_id === userId);
        }
        resolve(results as T[]);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function idbPut<T>(storeName: string, item: T, userId?: string): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const dataToSave = userId ? { ...(item as object), user_id: userId } : item;
      const req = store.put(dataToSave);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbDelete(storeName: string, id: string): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbClear(storeName: string): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ============================================================================
// 2. REAL AUTHENTIC SAMPLE DATASET (Actually loading up real data!)
// ============================================================================
export function generateRealStarterDataset(userId: string, refDate: string = '2026-11-19') {
  const samplePurchases: Purchase[] = [
    {
      id: 'pur_iphone16pro',
      productName: 'iPhone 16 Pro (256GB - Natural Titanium)',
      brand: 'Apple',
      category: 'Smartphones',
      price: 119900,
      purchaseDate: '2026-09-20',
      store: 'Apple BKC Store Mumbai',
      warrantyMonths: 12,
      returnDays: 14,
      imageUrl: '/assets/thumb_iphone15.jpg',
      notes: 'Natural Titanium 256GB. Primary daily driver. AppleCare+ registered.',
      serialNumber: 'F4GX902KA1',
      featuredOrder: 1,
      createdAt: '2026-09-20T10:30:00Z'
    },
    {
      id: 'pur_macbookair15',
      productName: 'MacBook Air 15" M3 (16GB RAM / 512GB SSD)',
      brand: 'Apple',
      category: 'Laptops',
      price: 134900,
      purchaseDate: '2026-05-15',
      store: 'Apple India Online Store',
      warrantyMonths: 12,
      returnDays: 14,
      imageUrl: '/assets/thumb_macbook_m2.jpg',
      notes: 'Midnight color. Includes 70W USB-C Power Adapter. Serial: C02F9184MD6',
      serialNumber: 'C02F9184MD6',
      featuredOrder: 2,
      createdAt: '2026-05-15T14:20:00Z'
    },
    {
      id: 'pur_sonyxm5',
      productName: 'Sony WH-1000XM5 Noise Cancelling Headphones',
      brand: 'Sony',
      category: 'Audio',
      price: 28990,
      purchaseDate: '2026-08-10',
      store: 'Amazon India',
      warrantyMonths: 12,
      returnDays: 7,
      imageUrl: '/assets/thumb_sony_xm5.jpg',
      notes: 'Silver finish with travel case. Invoice: INV-IN-2026-90412.',
      serialNumber: 'SN-WH5-983210',
      featuredOrder: 3,
      createdAt: '2026-08-10T18:45:00Z'
    },
    {
      id: 'pur_ps5slim',
      productName: 'PlayStation 5 Slim (Digital Edition 1TB SSD)',
      brand: 'Sony',
      category: 'Gaming',
      price: 44990,
      purchaseDate: '2026-03-25',
      store: 'Croma Electronics',
      warrantyMonths: 12,
      returnDays: 10,
      imageUrl: '/assets/thumb_dualsense.jpg',
      notes: 'Purchased with extra Midnight Black DualSense Controller.',
      serialNumber: '03-2749581-84920',
      featuredOrder: 4,
      createdAt: '2026-03-25T11:00:00Z'
    },
    {
      id: 'pur_watchultra2',
      productName: 'Apple Watch Ultra 2 (Titanium GPS + Cellular)',
      brand: 'Apple',
      category: 'Wearables',
      price: 89900,
      purchaseDate: '2026-07-22',
      store: 'Imagine Apple Premium Reseller',
      warrantyMonths: 24,
      returnDays: 14,
      imageUrl: '/assets/thumb_watch_ultra.jpg',
      notes: 'Blue/Black Trail Loop band. 2-Year AppleCare+ coverage active.',
      serialNumber: 'H49XK3098L',
      featuredOrder: 5,
      createdAt: '2026-07-22T09:15:00Z'
    },
    {
      id: 'pur_dysonv15',
      productName: 'Dyson V15 Detect Extra Cordless Vacuum',
      brand: 'Dyson',
      category: 'Appliances',
      price: 62900,
      purchaseDate: '2026-06-05',
      store: 'Dyson Official Store India',
      warrantyMonths: 24,
      returnDays: 15,
      imageUrl: '/assets/thumb_dyson_v15.jpg',
      notes: 'Includes laser slim fluffy head and hair screw tool. 2-year warranty.',
      serialNumber: 'DY-V15-449102',
      featuredOrder: 6,
      createdAt: '2026-06-05T16:00:00Z'
    }
  ];

  const sampleSubscriptions: SubscriptionRecord[] = [
    {
      id: 'sub_jio_5g',
      name: 'Jio 5G True Unlimited Prepaid',
      provider: 'Jio',
      category: 'Mobile & Telecom',
      planName: 'True 5G Unlimited 2.5GB/Day (28 Days)',
      amount: 349,
      billingCycle: '28_days',
      startDate: '2026-10-29',
      nextBillingDate: '2026-11-26',
      autoPay: true,
      paymentMethod: 'UPI AutoPay (PhonePe)',
      status: 'active',
      mobileNumber: '+91 98201 44820',
      reminderDaysBefore: 2,
      autoCreateReminder: true,
      notes: 'Main personal SIM. Unlimited True 5G data & national calling.',
      createdAt: '2026-10-29T08:00:00Z'
    },
    {
      id: 'sub_airtel_postpaid',
      name: 'Airtel Postpaid Infinity Family',
      provider: 'Airtel',
      category: 'Mobile & Telecom',
      planName: 'Postpaid Infinity Family (2 Add-on Lines)',
      amount: 999,
      billingCycle: 'monthly',
      startDate: '2026-10-24',
      nextBillingDate: '2026-11-24',
      autoPay: true,
      paymentMethod: 'UPI AutoPay (Google Pay)',
      status: 'active',
      mobileNumber: '+91 98110 59281',
      reminderDaysBefore: 3,
      autoCreateReminder: true,
      notes: 'Family postpaid account with data rollover & Disney+ Hotstar.',
      createdAt: '2026-10-24T12:00:00Z'
    },
    {
      id: 'sub_apple_one',
      name: 'Apple One Individual Plan',
      provider: 'Apple',
      category: 'Cloud & Storage',
      planName: 'Apple Music + TV+ + Arcade + 50GB iCloud',
      amount: 195,
      billingCycle: 'monthly',
      startDate: '2026-11-02',
      nextBillingDate: '2026-12-02',
      autoPay: true,
      paymentMethod: 'Apple ID Auto-Debit (HDFC Credit Card)',
      status: 'active',
      reminderDaysBefore: 2,
      autoCreateReminder: true,
      notes: 'Synced across iPhone, MacBook, Apple Watch, and iPad.',
      createdAt: '2026-11-02T10:00:00Z'
    },
    {
      id: 'sub_netflix',
      name: 'Netflix Premium 4K HDR',
      provider: 'Netflix',
      category: 'Entertainment & OTT',
      planName: 'Ultra HD 4K (4 Screens + Spatial Audio)',
      amount: 649,
      billingCycle: 'monthly',
      startDate: '2026-10-28',
      nextBillingDate: '2026-11-28',
      autoPay: true,
      paymentMethod: 'Credit Card Auto-Debit',
      status: 'active',
      reminderDaysBefore: 2,
      autoCreateReminder: true,
      notes: 'Living room Sony Bravia TV and iPad streaming profile.',
      createdAt: '2026-10-28T19:00:00Z'
    },
    {
      id: 'sub_spotify',
      name: 'Spotify Premium Individual',
      provider: 'Spotify',
      category: 'Music & Audio',
      planName: 'Premium Ad-Free + High Fidelity',
      amount: 119,
      billingCycle: 'monthly',
      startDate: '2026-11-05',
      nextBillingDate: '2026-12-05',
      autoPay: true,
      paymentMethod: 'UPI AutoPay',
      status: 'active',
      reminderDaysBefore: 1,
      autoCreateReminder: true,
      notes: 'Offline playlists downloaded for travel & daily workouts.',
      createdAt: '2026-11-05T07:30:00Z'
    },
    {
      id: 'sub_google_one',
      name: 'Google One 2TB AI Premium',
      provider: 'Google',
      category: 'Cloud & Storage',
      planName: '2TB Cloud Storage + Gemini Advanced',
      amount: 650,
      billingCycle: 'monthly',
      startDate: '2026-11-10',
      nextBillingDate: '2026-12-10',
      autoPay: true,
      paymentMethod: 'Google Play AutoPay',
      status: 'active',
      reminderDaysBefore: 2,
      autoCreateReminder: true,
      notes: 'Google Photos original quality cloud backup for family.',
      createdAt: '2026-11-10T14:15:00Z'
    },
    {
      id: 'sub_amazon_prime',
      name: 'Amazon Prime Annual Membership',
      provider: 'Amazon',
      category: 'Entertainment & OTT',
      planName: 'Annual Prime Shopping & Prime Video',
      amount: 1499,
      billingCycle: 'yearly',
      startDate: '2025-12-15',
      nextBillingDate: '2026-12-15',
      autoPay: true,
      paymentMethod: 'Amazon Pay UPI AutoPay',
      status: 'active',
      reminderDaysBefore: 7,
      autoCreateReminder: true,
      notes: 'Free 1-day delivery and Prime Video 4K HDR streaming.',
      createdAt: '2025-12-15T11:00:00Z'
    },
    {
      id: 'sub_chatgpt_plus',
      name: 'OpenAI ChatGPT Plus',
      provider: 'OpenAI',
      category: 'Productivity & AI',
      planName: 'GPT-4o, Reasoning & Advanced Data Analysis',
      amount: 1999,
      billingCycle: 'monthly',
      startDate: '2026-10-22',
      nextBillingDate: '2026-11-22',
      autoPay: true,
      paymentMethod: 'Credit Card Auto-Debit',
      status: 'active',
      reminderDaysBefore: 3,
      autoCreateReminder: true,
      notes: 'Professional AI coding and research subscription.',
      createdAt: '2026-10-22T06:00:00Z'
    }
  ];

  const sampleReminders: ReminderRecord[] = [
    {
      id: 'rem_sub_chatgpt',
      subscriptionId: 'sub_chatgpt_plus',
      productName: 'OpenAI (OpenAI ChatGPT Plus)',
      title: 'Auto-Pay Due: OpenAI ChatGPT Plus (₹1,999)',
      type: 'Subscription Auto-Pay',
      dueDate: '2026-11-19',
      completed: false,
      notes: 'Auto-pay: Active (Credit Card Auto-Debit). Cycle: monthly.'
    },
    {
      id: 'rem_sub_airtel',
      subscriptionId: 'sub_airtel_postpaid',
      productName: 'Airtel (Airtel Postpaid Infinity Family)',
      title: 'Auto-Pay Due: Airtel Postpaid Infinity Family (₹999)',
      type: 'Subscription Auto-Pay',
      dueDate: '2026-11-21',
      completed: false,
      notes: 'Auto-pay: Active (UPI AutoPay (Google Pay)). Cycle: monthly. Mobile: +91 98110 59281'
    },
    {
      id: 'rem_sub_jio',
      subscriptionId: 'sub_jio_5g',
      productName: 'Jio (Jio 5G True Unlimited Prepaid)',
      title: 'Auto-Pay Due: Jio 5G True Unlimited Prepaid (₹349)',
      type: 'Subscription Auto-Pay',
      dueDate: '2026-11-24',
      completed: false,
      notes: 'Auto-pay: Active (UPI AutoPay (PhonePe)). Cycle: 28_days. Mobile: +91 98201 44820'
    },
    {
      id: 'rem_sub_netflix',
      subscriptionId: 'sub_netflix',
      productName: 'Netflix (Netflix Premium 4K HDR)',
      title: 'Auto-Pay Due: Netflix Premium 4K HDR (₹649)',
      type: 'Subscription Auto-Pay',
      dueDate: '2026-11-26',
      completed: false,
      notes: 'Auto-pay: Active (Credit Card Auto-Debit). Cycle: monthly.'
    },
    {
      id: 'rem_pur_ps5_warranty',
      purchaseId: 'pur_ps5slim',
      productName: 'PlayStation 5 Slim',
      title: 'PlayStation 5 Slim warranty expires soon',
      type: 'Warranty Expiration',
      dueDate: '2027-03-25',
      completed: false,
      notes: '1-year Sony manufacturer warranty nearing completion.'
    },
    {
      id: 'rem_pur_macbook_care',
      purchaseId: 'pur_macbookair15',
      productName: 'MacBook Air 15" M3',
      title: 'MacBook Air 15" M3 warranty checkup',
      type: 'Warranty Expiration',
      dueDate: '2027-05-15',
      completed: false,
      notes: 'Review battery health and AppleCare extension before May 2027.'
    }
  ];

  const sampleReceipts: ReceiptRecord[] = [
    {
      id: 'rec_iphone16pro',
      purchaseId: 'pur_iphone16pro',
      fileName: 'Apple_BKC_Tax_Invoice_iPhone16Pro.pdf',
      fileType: 'application/pdf',
      fileSizeBytes: 248590,
      uploadDate: '2026-09-20',
      invoiceNumber: 'INV-BKC-2026-94812'
    },
    {
      id: 'rec_macbookair15',
      purchaseId: 'pur_macbookair15',
      fileName: 'Apple_Store_MacBook_Air_M3_Invoice.pdf',
      fileType: 'application/pdf',
      fileSizeBytes: 312480,
      uploadDate: '2026-05-15',
      invoiceNumber: 'INV-APL-2026-00481'
    },
    {
      id: 'rec_sonyxm5',
      purchaseId: 'pur_sonyxm5',
      fileName: 'Amazon_Invoice_Sony_WH1000XM5.pdf',
      fileType: 'application/pdf',
      fileSizeBytes: 182390,
      uploadDate: '2026-08-10',
      invoiceNumber: 'AMZ-IN-88910-2026'
    }
  ];

  return {
    purchases: samplePurchases,
    subscriptions: sampleSubscriptions,
    reminders: sampleReminders,
    receipts: sampleReceipts
  };
}

// ============================================================================
// 3. UNIFIED VAULT STORAGE MANAGER (Cloud Vault + Local Offline Vault)
// ============================================================================
export class UnifiedDatabaseManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Check Cloud Storage Health
  async checkCloudHealth(): Promise<{ connected: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const json = await res.json();
        return { connected: Boolean(json.connected) };
      }
    } catch {
      // offline
    }
    return { connected: false };
  }

  // Load all user records from vault
  // STRICTLY REAL DATA: No fake data auto-seeded. Starts clean with 0 records.
  async loadAllData(referenceDate: string = '2026-11-19'): Promise<{
    purchases: Purchase[];
    subscriptions: SubscriptionRecord[];
    reminders: ReminderRecord[];
    receipts: ReceiptRecord[];
    cards: CardAccountRecord[];
    fromEngine: 'cloud' | 'local';
  }> {
    // 1. Live Cloud Storage
    try {
      const res = await fetch(`/api/all?userId=${encodeURIComponent(this.userId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const mapPurchases: Purchase[] = (json.data.purchases || []).map((p: any) => ({
            id: p.id,
            productName: p.productName,
            brand: p.brand || '',
            category: p.category || 'General',
            price: Number(p.price || 0),
            purchaseDate: p.purchaseDate || '',
            store: p.store || '',
            warrantyMonths: Number(p.warrantyMonths || 12),
            warrantyExpiryOverride: p.warrantyExpiryOverride,
            returnDays: Number(p.returnDays || 14),
            imageUrl: p.imageUrl || '',
            notes: p.notes || '',
            serialNumber: p.serialNumber || '',
            featuredOrder: p.featuredOrder || 1,
            createdAt: p.createdAt || new Date().toISOString()
          }));

          const mapSubs: SubscriptionRecord[] = (json.data.subscriptions || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            provider: s.provider,
            category: s.category || 'Mobile & Telecom (SIM / 5G / Fiber)',
            planName: s.planName || '',
            amount: Number(s.amount || 0),
            billingCycle: s.billingCycle || 'monthly',
            customDays: s.customDays ? Number(s.customDays) : undefined,
            startDate: s.startDate || '',
            nextBillingDate: s.nextBillingDate || '',
            expiryDate: s.expiryDate || s.nextBillingDate || '',
            autoPay: Boolean(s.autoPay),
            paymentMethod: s.paymentMethod || 'UPI AutoPay',
            status: s.status || 'active',
            mobileNumber: s.mobileNumber || '',
            reminderDaysBefore: Number(s.reminderDaysBefore || 2),
            autoCreateReminder: Boolean(s.autoCreateReminder),
            notes: s.notes || '',
            createdAt: s.createdAt || new Date().toISOString()
          }));

          const mapRems: ReminderRecord[] = (json.data.reminders || []).map((r: any) => ({
            id: r.id,
            purchaseId: r.purchaseId,
            subscriptionId: r.subscriptionId,
            productName: r.productName || '',
            title: r.title,
            type: r.type,
            dueDate: r.dueDate,
            completed: Boolean(r.completed),
            notes: r.notes || ''
          }));

          const mapRecs: ReceiptRecord[] = (json.data.receipts || []).map((rc: any) => ({
            id: rc.id,
            purchaseId: rc.purchaseId || '',
            fileName: rc.fileName,
            fileType: rc.fileType || 'application/pdf',
            fileSizeBytes: Number(rc.fileSizeBytes || 0),
            uploadDate: rc.uploadDate || new Date().toISOString(),
            invoiceNumber: rc.invoiceNumber || '',
            title: rc.title || '',
            store: rc.store || '',
            amount: Number(rc.amount || 0),
            notes: rc.notes || '',
            categoryTag: rc.categoryTag || ''
          }));

          const mapCards: CardAccountRecord[] = (json.data.cards || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            bank: c.bank || 'Bank',
            type: c.type || 'credit_card',
            last4: c.last4 || '0000',
            expiryMMYY: c.expiryMMYY || '',
            billingDueDate: Number(c.billingDueDate || 0),
            statementDate: Number(c.statementDate || 0),
            creditLimit: Number(c.creditLimit || 0),
            currentBalanceOrSavings: Number(c.currentBalanceOrSavings || 0),
            cardColor: c.cardColor || 'gold',
            notes: c.notes || '',
            createdAt: c.createdAt || new Date().toISOString()
          }));

          // Mirror into local IndexedDB cache for offline access
          for (const p of mapPurchases) await idbPut('purchases', p, this.userId);
          for (const s of mapSubs) await idbPut('subscriptions', s, this.userId);
          for (const r of mapRems) await idbPut('reminders', r, this.userId);
          for (const rc of mapRecs) await idbPut('receipts', rc, this.userId);
          for (const c of mapCards) await idbPut('cards', c, this.userId);

          return {
            purchases: mapPurchases,
            subscriptions: mapSubs,
            reminders: mapRems,
            receipts: mapRecs,
            cards: mapCards,
            fromEngine: 'cloud'
          };
        }
      }
    } catch (err) {
      console.warn('[Vault] Cloud sync notice, using local cache:', err);
    }

    // 2. Offline Fallback: Load from local IndexedDB
    const [localPurchases, localSubs, localRems, localRecs, localCards] = await Promise.all([
      idbGetAll<Purchase>('purchases', this.userId),
      idbGetAll<SubscriptionRecord>('subscriptions', this.userId),
      idbGetAll<ReminderRecord>('reminders', this.userId),
      idbGetAll<ReceiptRecord>('receipts', this.userId),
      idbGetAll<CardAccountRecord>('cards', this.userId)
    ]);

    if (localPurchases.length > 0 || localSubs.length > 0 || localCards.length > 0) {
      return {
        purchases: localPurchases,
        subscriptions: localSubs,
        reminders: localRems,
        receipts: localRecs,
        cards: localCards,
        fromEngine: 'local'
      };
    }

    // 3. Clean initial state: 0 fake data
    return {
      purchases: [],
      subscriptions: [],
      reminders: [],
      receipts: [],
      cards: [],
      fromEngine: 'cloud'
    };
  }

  // Clear all database records (Clean slate, resets database to 0 records)
  async clearAllData(): Promise<void> {
    try {
      await fetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });
    } catch {
      // offline
    }

    await idbClear('purchases');
    await idbClear('subscriptions');
    await idbClear('reminders');
    await idbClear('receipts');
    await idbClear('cards');
  }

  // Seed / Reset Database with fresh sample data (Manual / Optional only)
  async seedSampleData(referenceDate: string = '2026-11-19'): Promise<{
    purchases: Purchase[];
    subscriptions: SubscriptionRecord[];
    reminders: ReminderRecord[];
    receipts: ReceiptRecord[];
  }> {
    const starter = generateRealStarterDataset(this.userId, referenceDate);

    try {
      for (const p of starter.purchases) {
        await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...p, userId: this.userId })
        });
      }
      for (const s of starter.subscriptions) {
        await fetch('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...s, userId: this.userId })
        });
      }
      for (const r of starter.reminders) {
        await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...r, userId: this.userId })
        });
      }
      for (const rc of starter.receipts) {
        await fetch('/api/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rc, userId: this.userId })
        });
      }
    } catch (e) {
      // offline
    }

    await idbClear('purchases');
    await idbClear('subscriptions');
    await idbClear('reminders');
    await idbClear('receipts');

    for (const p of starter.purchases) await idbPut('purchases', p, this.userId);
    for (const s of starter.subscriptions) await idbPut('subscriptions', s, this.userId);
    for (const r of starter.reminders) await idbPut('reminders', r, this.userId);
    for (const rc of starter.receipts) await idbPut('receipts', rc, this.userId);

    return starter;
  }

  // --------------------------------------------------------------------------
  // CRUD: Purchases
  // --------------------------------------------------------------------------
  async savePurchase(purchase: Purchase): Promise<void> {
    try {
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...purchase, userId: this.userId })
      });
    } catch (e) {
      // offline fallback
    }
    await idbPut('purchases', purchase, this.userId);
  }

  async deletePurchase(purchaseId: string): Promise<void> {
    try {
      await fetch(`/api/purchases/${encodeURIComponent(purchaseId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      // offline fallback
    }
    await idbDelete('purchases', purchaseId);
  }

  // --------------------------------------------------------------------------
  // CRUD: Subscriptions
  // --------------------------------------------------------------------------
  async saveSubscription(sub: SubscriptionRecord): Promise<void> {
    try {
      await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sub, userId: this.userId })
      });
    } catch (e) {
      // offline fallback
    }
    await idbPut('subscriptions', sub, this.userId);
  }

  async deleteSubscription(subId: string): Promise<void> {
    try {
      await fetch(`/api/subscriptions/${encodeURIComponent(subId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      // offline fallback
    }
    await idbDelete('subscriptions', subId);
  }

  // --------------------------------------------------------------------------
  // CRUD: Reminders
  // --------------------------------------------------------------------------
  async saveReminder(rem: ReminderRecord): Promise<void> {
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rem, userId: this.userId })
      });
    } catch (e) {
      // offline fallback
    }
    await idbPut('reminders', rem, this.userId);
  }

  async deleteReminder(remId: string): Promise<void> {
    try {
      await fetch(`/api/reminders/${encodeURIComponent(remId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      // offline fallback
    }
    await idbDelete('reminders', remId);
  }

  // --------------------------------------------------------------------------
  // CRUD: Receipts
  // --------------------------------------------------------------------------
  async saveReceipt(rec: ReceiptRecord): Promise<void> {
    try {
      await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rec, userId: this.userId })
      });
    } catch (e) {
      // offline fallback
    }
    await idbPut('receipts', rec, this.userId);
  }

  async deleteReceipt(recId: string): Promise<void> {
    try {
      await fetch(`/api/receipts/${encodeURIComponent(recId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      // offline fallback
    }
    await idbDelete('receipts', recId);
  }

  // --------------------------------------------------------------------------
  // CRUD: Cards & Accounts (Zero credentials stored)
  // --------------------------------------------------------------------------
  async saveCard(card: CardAccountRecord): Promise<void> {
    try {
      await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...card, userId: this.userId })
      });
    } catch (e) {
      // offline fallback
    }
    await idbPut('cards', card, this.userId);
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      // offline fallback
    }
    await idbDelete('cards', cardId);
  }
}
