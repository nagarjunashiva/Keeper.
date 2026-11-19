import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  productName: { type: String, required: true },
  brand: { type: String, default: '' },
  category: { type: String, default: 'General' },
  price: { type: Number, default: 0 },
  purchaseDate: { type: String, default: '' },
  store: { type: String, default: '' },
  warrantyMonths: { type: Number, default: 12 },
  warrantyExpiryOverride: { type: String },
  returnDays: { type: Number, default: 14 },
  imageUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  serialNumber: { type: String, default: '' },
  paymentCardId: { type: String, default: '' },
  featuredOrder: { type: Number, default: 1 },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const subscriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  provider: { type: String, required: true },
  category: { type: String, default: 'Mobile & Telecom (SIM / 5G / Fiber)' },
  planName: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  billingCycle: { type: String, default: 'monthly' },
  customDays: { type: Number },
  startDate: { type: String, default: '' },
  nextBillingDate: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  autoPay: { type: Boolean, default: true },
  paymentMethod: { type: String, default: 'UPI AutoPay (PhonePe / GPay / Paytm)' },
  status: { type: String, default: 'active' },
  mobileNumber: { type: String, default: '' },
  reminderDaysBefore: { type: Number, default: 2 },
  autoCreateReminder: { type: Boolean, default: true },
  notes: { type: String, default: '' },
  expenses: { type: Array, default: [] },
  savingsGoal: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const reminderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  purchaseId: { type: String },
  subscriptionId: { type: String },
  productName: { type: String, default: '' },
  title: { type: String, required: true },
  type: { type: String, default: 'Warranty Expiration' },
  dueDate: { type: String, required: true },
  completed: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, { timestamps: true });

const receiptSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  purchaseId: { type: String, default: '' },
  fileName: { type: String, required: true },
  fileType: { type: String, default: 'application/pdf' },
  fileSizeBytes: { type: Number, default: 0 },
  uploadDate: { type: String, default: () => new Date().toISOString() },
  invoiceNumber: { type: String, default: '' },
  title: { type: String, default: '' },
  store: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  categoryTag: { type: String, default: '' },
  fileData: { type: String, default: '' } // Base64 data if saved
}, { timestamps: true });

const cardAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  bank: { type: String, default: 'Bank' },
  type: { type: String, default: 'credit_card' }, // credit_card, debit_card, savings_account
  last4: { type: String, default: '0000' },
  expiryMMYY: { type: String, default: '' },
  billingDueDate: { type: Number, default: 0 },
  statementDate: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  dailyLimit: { type: Number, default: 0 },
  linkedAccountType: { type: String, default: 'Savings Account' },
  currentBalanceOrSavings: { type: Number, default: 0 },
  cardColor: { type: String, default: 'gold' }, // gold, obsidian, emerald, sapphire, ruby
  notes: { type: String, default: '' },
  expenses: { type: Array, default: [] },
  savingsGoal: { type: Number, default: 0 },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const profileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // userId
  name: { type: String, default: 'User' },
  email: { type: String, default: '' },
  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  referenceDate: { type: String, default: '2026-11-19' },
  expiringThresholdDays: { type: Number, default: 45 },
  baseStorageUsedGB: { type: Number, default: 0 },
  monthlyIncome: { type: Number, default: 0 }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  resetOtp: { type: String, default: null },
  resetOtpExpires: { type: Date, default: null },
  currencySymbol: { type: String, default: '₹' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.methods.toSafeObject = function() {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    isVerified: this.isVerified,
    currencySymbol: this.currencySymbol || '₹',
    createdAt: this.createdAt
  };
};

export const PurchaseModel = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
export const SubscriptionModel = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
export const ReminderModel = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
export const ReceiptModel = mongoose.models.Receipt || mongoose.model('Receipt', receiptSchema);
export const CardAccountModel = mongoose.models.CardAccount || mongoose.model('CardAccount', cardAccountSchema);
export const ProfileModel = mongoose.models.Profile || mongoose.model('Profile', profileSchema);
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
