# KEEPER — Personal Assets, Subscriptions & Wealth Vault

> **Everything you own, spend, and save. One luxury obsidian vault.**

KEEPER is a full-stack personal purchase, recurring subscription, zero-credential card expense, and warranty management platform built with React, TypeScript, Tailwind CSS, Express, and MongoDB Atlas.

---

## 🌟 Key Features

### 1. 🛡️ 100% Zero-Credential Cards & Wallet Hub
- **No Sensitive Data**: Never asks for full 16-digit card numbers, CVVs, ATM PINs, net-banking passwords, or account logins.
- **Card Categories**: Credit Cards, Debit Cards, and Savings Accounts with tailored fields (Credit Limit, Payment Due Days, Daily POS/ATM Limits, Linked Salary Accounts).
- **Photorealistic Visual Cards**: Metallic foil badges (`CREDIT`, `DEBIT`, `BANK A/C`), EMV chip, contactless waves, and luxury gradients (Midnight Obsidian, Sapphire Blue, Ruby Red, Emerald Green, Amber Gold, Titanium Silver).
- **Per-Card Live Expense Tracking**: Auto-calculates total card spend from recurring subscriptions, purchases, and direct swipes.
- **Credit Utilization Meter**: Live color-coded meter maintaining the <30% CIBIL/Experian credit score golden rule.

### 2. 🐖 50/30/20 Savings Rule & Financial Health Intelligence
- **Take-Home Monthly Salary Setting**: Configurable monthly baseline budget with a one-click **Privacy Eye Mask** (`Eye` / `EyeOff`) to conceal sensitive numbers in public.
- **Unified Monthly Outflows**: Combines recurring subscription burn with one-off card expenses.
- **Net Monthly Savings Retained**: Displays exact cash buffer and savings percentage (`e.g. 55% saved`).
- **Health Benchmarks**: Automatic categorization into *Super Saver (>35%)*, *Healthy Buffer (≥20%)*, *Borderline Cushion*, or *Overspending Alert*.

### 3. 📱 Recurring Subscriptions & SIM / 5G Cycle Engine
- **Prepaid & Standard Cycles**: 28-day mobile recharge cycles, custom day cycles, monthly, quarterly, and annual renewals.
- **Auto-Pay Channel Linking**: Maps each subscription directly to its debiting card or UPI AutoPay channel.
- **Automated Alerts**: Creates proactive reminders before renewal charges hit your bank account.

### 4. 📦 Purchase & Warranty Management
- **Hardware & Asset Registry**: Track price, purchase date, store, serial numbers, and custom photos.
- **Auto-Calculated Warranties & Returns**: Dynamic countdowns with real-time status badges (*Active*, *Expiring Soon*, *Expired*).
- **Warranty Claims Assistant**: One-click claim guidance with direct manufacturer support contact routing.

### 5. 📑 Document Vault (Receipts & Invoices)
- **High-Resolution Storage**: Upload receipts (`PDF`, `JPG`, `PNG`) with automatic binary Base64 sync to MongoDB Atlas and local IndexedDB.
- **Metadata Tagging**: Invoice numbers, vendor details, upload dates, and expense association.

### 6. 📊 Unified Portfolio Analytics
- **Stacked Multi-Stream Spending Chart**: Color-coded monthly timeline separating Hardware Assets, Subscriptions, and Card Swipes across trailing 6-month rolling windows.
- **Spending by Payment Channel**: Card-by-card breakdown of where your capital and recurring funds flow.
- **High-Value Assets & Top Recurring Subscriptions**: Ranked rankings of your major investments and ongoing commitments.

### 7. 🔐 Authentication & Cinematic Vault Security
- **Email OTP Verification**: Real-time 6-digit verification codes sent via Brevo / Nodemailer.
- **Cinematic Vault Transitions**: Rotating titanium vault dials with animated biometric locks and ambient particle aura for smooth sign-in and sign-out sequences.
- **Clean Slate Architecture**: Zero fake demo data. Every user starts with a private, isolated vault.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster (or local MongoDB)
- SMTP relay (e.g. Brevo) for email OTP delivery

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd keeper-website
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
PORT=5001
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/keeper?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key

# Brevo / SMTP Relay for OTPs
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_smtp_login
SMTP_PASS=your_smtp_password
SMTP_FROM="Keeper Security" <no-reply@yourdomain.com>
```

### 3. Run the App
Start both frontend and backend concurrently:
```bash
# Terminal 1: Backend Server
node server/server.js

# Terminal 2: Vite Frontend Dev Server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Recharts
- **Backend**: Node.js, Express, Mongoose, Nodemailer, JSON Web Tokens (JWT)
- **Databases**: MongoDB Atlas (Cloud) + IndexedDB (Dual-write offline resilience)
- **Security**: SHA-256 salted hashing, Brevo SMTP OTP verification, Zero-Credential card tokenization

---

## 📄 License
MIT License. Built with precision for privacy-first personal wealth management.
