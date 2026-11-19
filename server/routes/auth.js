import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserModel, ProfileModel } from '../models/schemas.js';
import { sendVerificationOtp, sendWelcomeEmail, sendPasswordResetOtp } from '../utils/mailer.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'keeper_secret_jwt_key_2026_personal_vault';

// Middleware: ensure MongoDB connection
router.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    for (let i = 0; i < 15; i++) {
      if (mongoose.connection.readyState === 1) break;
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connecting or unavailable. Please try again in a few moments.'
    });
  }
  next();
});

// Helper: 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ============================================================
   1. REGISTER (Stores user in MongoDB, dispatches email OTP)
============================================================ */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, currencySymbol } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await UserModel.findOne({ email: cleanEmail });

    if (existing && existing.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please sign in.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    let user = existing;
    if (user) {
      user.name = name.trim();
      user.password = hashedPassword;
      user.otp = otp;
      user.otpExpires = otpExpires;
      user.currencySymbol = currencySymbol || '₹';
      await user.save();
    } else {
      user = new UserModel({
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        isVerified: false,
        otp,
        otpExpires,
        currencySymbol: currencySymbol || '₹'
      });
      await user.save();
    }

    // Send verification email via Nodemailer / Brevo
    let mailResult = { previewUrl: null };
    try {
      mailResult = await sendVerificationOtp(cleanEmail, user.name, otp);
    } catch (mailErr) {
      console.warn(`[Mailer Error] Could not dispatch OTP email: ${mailErr.message}`);
      console.log(`\n========================================`);
      console.log(`[KEEPER OTP DISPATCH]`);
      console.log(`TO: ${cleanEmail} (${user.name})`);
      console.log(`OTP CODE: ${otp}`);
      console.log(`========================================\n`);
    }

    return res.status(201).json({
      success: true,
      requireOtp: true,
      message: `Verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      previewUrl: mailResult.previewUrl
    });
  } catch (err) {
    console.error('[Register Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
});

/* ============================================================
   2. VERIFY OTP (Validates OTP, marks verified, returns token)
============================================================ */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found. Please sign up first.' });
    }

    if (user.isVerified) {
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '14d' });
      return res.json({
        success: true,
        message: 'Account already verified',
        token,
        user: user.toSafeObject()
      });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your email and try again.'
      });
    }

    if (new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    // Mark verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Ensure Profile exists in database
    await ProfileModel.findOneAndUpdate(
      { id: user.id },
      {
        id: user.id,
        name: user.name,
        email: user.email,
        currencySymbol: user.currencySymbol || '₹',
        currency: user.currencySymbol === '$' ? 'USD' : 'INR',
        referenceDate: '2026-11-19',
        expiringThresholdDays: 45,
        baseStorageUsedGB: 0
      },
      { upsert: true, new: true }
    );

    // Send Welcome Email
    sendWelcomeEmail(cleanEmail, user.name).catch(() => {});

    // Issue JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '14d' });

    return res.json({
      success: true,
      message: 'Email verified successfully! Welcome to Keeper.',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    console.error('[Verify OTP Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Verification failed' });
  }
});

/* ============================================================
   3. RESEND OTP
============================================================ */
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    let mailResult = { previewUrl: null };
    try {
      mailResult = await sendVerificationOtp(cleanEmail, user.name, otp);
    } catch (mailErr) {
      console.warn(`[Mailer Error] Resend OTP via SMTP failed: ${mailErr.message}`);
      console.log(`\n========================================`);
      console.log(`[KEEPER OTP RESEND]`);
      console.log(`TO: ${cleanEmail}`);
      console.log(`NEW OTP CODE: ${otp}`);
      console.log(`========================================\n`);
    }

    return res.json({
      success: true,
      message: `A new verification code has been sent to ${cleanEmail}`,
      previewUrl: mailResult.previewUrl
    });
  } catch (err) {
    console.error('[Resend OTP Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to resend code' });
  }
});

/* ============================================================
   4. LOGIN
============================================================ */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    // If not verified, trigger OTP
    if (!user.isVerified) {
      const otp = generateOtp();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      let mailResult = { previewUrl: null };
      try {
        mailResult = await sendVerificationOtp(cleanEmail, user.name, otp);
      } catch (mailErr) {
        console.warn(`[Mailer Error] OTP dispatch failed: ${mailErr.message}`);
        console.log(`\n========================================`);
        console.log(`[KEEPER OTP VERIFICATION REQUIRED]`);
        console.log(`TO: ${cleanEmail}`);
        console.log(`OTP: ${otp}`);
        console.log(`========================================\n`);
      }

      return res.status(403).json({
        success: false,
        requireOtp: true,
        email: cleanEmail,
        message: `Please verify your email before signing in. A verification code was sent to ${cleanEmail}`,
        previewUrl: mailResult.previewUrl
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '14d' });

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    console.error('[Login Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Sign in failed' });
  }
});

/* ============================================================
   5. FORGOT PASSWORD (Dispatches reset OTP to mail)
============================================================ */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset code was sent.'
      });
    }

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetOtp(cleanEmail, user.name, otp);
    } catch (mailErr) {
      console.warn(`[Mailer Error] Reset code via SMTP failed: ${mailErr.message}`);
      console.log(`\n========================================`);
      console.log(`[KEEPER PASSWORD RESET]`);
      console.log(`TO: ${cleanEmail}`);
      console.log(`OTP CODE: ${otp}`);
      console.log(`========================================\n`);
    }

    return res.json({
      success: true,
      message: `Password reset code sent to ${cleanEmail}`,
      email: cleanEmail
    });
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to send reset code' });
  }
});

/* ============================================================
   6. RESET PASSWORD (Verifies reset OTP and updates password)
============================================================ */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user || !user.resetOtp || user.resetOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset code' });
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ success: false, message: 'Password reset code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.isVerified = true;
    await user.save();

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '14d' });

    return res.json({
      success: true,
      message: 'Password updated successfully! You are now logged in.',
      token,
      user: user.toSafeObject()
    });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Password reset failed' });
  }
});

/* ============================================================
   7. GET CURRENT USER (/api/auth/me)
============================================================ */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findOne({ id: decoded.id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: user.toSafeObject()
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

export default router;
