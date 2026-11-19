import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'dns';
import {
  PurchaseModel,
  SubscriptionModel,
  ReminderModel,
  ReceiptModel,
  CardAccountModel,
  ProfileModel
} from './models/schemas.js';
import authRoutes from './routes/auth.js';
import { getTransporter } from './utils/mailer.js';

// Resolve DNS SRV queries on Windows via public Google / Cloudflare DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('[Server] DNS setup notice:', e.message);
}

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// Database state tracker
let dbState = {
  connected: false,
  source: 'none',
  uri: '',
  dbName: ''
};

async function connectDatabase() {
  const atlasUri = process.env.MONGODB_URI;
  const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/keeper';

  if (mongoose.connection.readyState === 1) {
    dbState.connected = true;
    return;
  }

  // 1. Try Remote MongoDB Atlas (Same cluster as CiNE)
  if (atlasUri) {
    try {
      console.log('[DB] Connecting to MongoDB Atlas cluster...');
      await mongoose.connect(atlasUri, {
        serverSelectionTimeoutMS: 6000,
        bufferCommands: false
      });
      dbState = {
        connected: true,
        source: 'MongoDB Atlas (CiNE Cluster)',
        uri: atlasUri.replace(/:[^:@]+@/, ':****@'),
        dbName: mongoose.connection.name || 'keeper'
      };
      console.log(`[DB] Connected to MongoDB Atlas! (Database: ${dbState.dbName})`);
      return;
    } catch (err) {
      console.warn(`[DB] Atlas connection notice: ${err.message}. Trying local MongoDB on 27017...`);
    }
  }

  // 2. Try Local MongoDB on port 27017
  try {
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 3000,
      bufferCommands: false
    });
    dbState = {
      connected: true,
      source: 'Local MongoDB (127.0.0.1:27017)',
      uri: localUri,
      dbName: mongoose.connection.name || 'keeper'
    };
    console.log(`[DB] Connected to Local MongoDB on 127.0.0.1:27017/keeper!`);
  } catch (err) {
    console.error(`[DB] Could not connect to local MongoDB: ${err.message}`);
    dbState = {
      connected: false,
      source: 'disconnected',
      uri: '',
      dbName: ''
    };
  }
}

// Ensure database connection middleware
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDatabase();
    } catch (e) {
      // proceed to let route handle error gracefully
    }
  }
  next();
});

// Authentication routes (Brevo / Nodemailer OTP + MongoDB)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    app: 'KEEPER Database Backend',
    connected: mongoose.connection.readyState === 1,
    source: dbState.source,
    database: dbState.dbName || (mongoose.connection.readyState === 1 ? mongoose.connection.name : 'keeper'),
    readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString()
  });
});

// Load all user records (Strictly real data - returns empty arrays if clean)
app.get('/api/all', async (req, res) => {
  try {
    const userId = req.query.userId || 'demo_user';
    const [purchases, subscriptions, reminders, receipts, cards, profile] = await Promise.all([
      PurchaseModel.find({ userId }).sort({ featuredOrder: 1, createdAt: -1 }),
      SubscriptionModel.find({ userId }).sort({ createdAt: -1 }),
      ReminderModel.find({ userId }).sort({ dueDate: 1 }),
      ReceiptModel.find({ userId }).sort({ uploadDate: -1 }),
      CardAccountModel.find({ userId }).sort({ createdAt: -1 }),
      ProfileModel.findOne({ id: userId })
    ]);

    res.json({
      success: true,
      data: {
        purchases,
        subscriptions,
        reminders,
        receipts,
        cards,
        profile: profile || null
      },
      counts: {
        purchases: purchases.length,
        subscriptions: subscriptions.length,
        reminders: reminders.length,
        receipts: receipts.length,
        cards: cards.length
      },
      database: dbState.source
    });
  } catch (err) {
    console.error('[API Error /all]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Purchases CRUD
app.get('/api/purchases', async (req, res) => {
  try {
    const userId = req.query.userId || 'demo_user';
    const purchases = await PurchaseModel.find({ userId }).sort({ featuredOrder: 1, createdAt: -1 });
    res.json({ success: true, data: purchases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const purchaseData = req.body;
    if (!purchaseData.id) {
      return res.status(400).json({ success: false, error: 'Purchase id is required' });
    }
    const userId = purchaseData.userId || 'demo_user';
    const saved = await PurchaseModel.findOneAndUpdate(
      { id: purchaseData.id },
      { ...purchaseData, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await PurchaseModel.deleteOne({ id });
    await ReminderModel.deleteMany({ purchaseId: id });
    await ReceiptModel.deleteMany({ purchaseId: id });
    res.json({ success: true, message: `Purchase ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Subscriptions CRUD
app.get('/api/subscriptions', async (req, res) => {
  try {
    const userId = req.query.userId || 'demo_user';
    const subs = await SubscriptionModel.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: subs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const subData = req.body;
    if (!subData.id) {
      return res.status(400).json({ success: false, error: 'Subscription id is required' });
    }
    const userId = subData.userId || 'demo_user';
    const saved = await SubscriptionModel.findOneAndUpdate(
      { id: subData.id },
      { ...subData, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await SubscriptionModel.deleteOne({ id });
    await ReminderModel.deleteMany({ subscriptionId: id });
    res.json({ success: true, message: `Subscription ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reminders CRUD
app.get('/api/reminders', async (req, res) => {
  try {
    const userId = req.query.userId || 'demo_user';
    const rems = await ReminderModel.find({ userId }).sort({ dueDate: 1 });
    res.json({ success: true, data: rems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const remData = req.body;
    if (!remData.id) {
      return res.status(400).json({ success: false, error: 'Reminder id is required' });
    }
    const userId = remData.userId || 'demo_user';
    const saved = await ReminderModel.findOneAndUpdate(
      { id: remData.id },
      { ...remData, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ReminderModel.deleteOne({ id });
    res.json({ success: true, message: `Reminder ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Receipts CRUD
app.get('/api/receipts', async (req, res) => {
  try {
    const userId = req.query.userId || 'demo_user';
    const receipts = await ReceiptModel.find({ userId }).sort({ uploadDate: -1 });
    res.json({ success: true, data: receipts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/receipts', async (req, res) => {
  try {
    const recData = req.body;
    if (!recData.id) {
      return res.status(400).json({ success: false, error: 'Receipt id is required' });
    }
    const userId = recData.userId || 'demo_user';
    const saved = await ReceiptModel.findOneAndUpdate(
      { id: recData.id },
      { ...recData, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ReceiptModel.deleteOne({ id });
    res.json({ success: true, message: `Receipt ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cards & Accounts CRUD (Zero credentials stored)
app.get('/api/cards', async (req, res) => {
  try {
    const userId = req.query.userId || 'demo_user';
    const cards = await CardAccountModel.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: cards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const cardData = req.body;
    if (!cardData.id) {
      return res.status(400).json({ success: false, error: 'Card id is required' });
    }
    const userId = cardData.userId || 'demo_user';
    const saved = await CardAccountModel.findOneAndUpdate(
      { id: cardData.id },
      { ...cardData, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await CardAccountModel.deleteOne({ id });
    res.json({ success: true, message: `Card ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// User Profile CRUD
app.get('/api/profile', async (req, res) => {
  try {
    const userId = req.query.userId || 'demo_user';
    const profile = await ProfileModel.findOne({ id: userId });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/profile', async (req, res) => {
  try {
    const profileData = req.body;
    const userId = profileData.id || req.query.userId || 'demo_user';
    const saved = await ProfileModel.findOneAndUpdate(
      { id: userId },
      { ...profileData, id: userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear all database records for user (Clean slate, 0 fake data)
app.post('/api/clear', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 'demo_user';
    await Promise.all([
      PurchaseModel.deleteMany({ userId }),
      SubscriptionModel.deleteMany({ userId }),
      ReminderModel.deleteMany({ userId }),
      ReceiptModel.deleteMany({ userId }),
      CardAccountModel.deleteMany({ userId })
    ]);
    res.json({ success: true, message: 'Clean slate applied: all records cleared from MongoDB.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Root welcome
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family:sans-serif;background:#141518;color:#F6F4EE;padding:40px;min-height:100vh">
      <h1 style="color:#F2BD91">KEEPER Backend API</h1>
      <p>Personal Purchase & Subscription Management System connected to <strong>MongoDB Atlas</strong>.</p>
      <ul>
        <li>Status: <strong>Online</strong></li>
        <li>Database: <strong>${dbState.source}</strong></li>
        <li>Health check: <a style="color:#F2BD91" href="/api/health">/api/health</a></li>
      </ul>
    </div>
  `);
});

// Start server
async function startServer() {
  await connectDatabase();
  await getTransporter(); // Initialize Nodemailer
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` KEEPER Backend Server running on http://localhost:${PORT}`);
    console.log(` Authentication: Real OTP via Brevo / Nodemailer Active`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
  });
}

startServer();
