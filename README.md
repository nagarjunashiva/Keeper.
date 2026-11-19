# KEEPER — Personal Assets, Subscriptions & Wealth Vault

> **Everything you own, spend, and save. One luxury obsidian vault.**

KEEPER is a full-stack personal purchase, recurring subscription, zero-credential card expense, and warranty management platform built with React, TypeScript, Tailwind CSS, Express, and MongoDB Atlas.

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
