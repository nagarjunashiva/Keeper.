import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Mail,
  Lock,
  User,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  Shield,
  CreditCard,
  Zap,
  Calendar,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import type { AuthAccount } from '../App';

interface AuthPortalProps {
  onAuthenticated: (account: AuthAccount, rememberMe: boolean) => void;
}

export function AuthPortal({ onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify-otp' | 'forgot' | 'reset-otp'>('signin');

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Timer for OTP resend
  const [resendCooldown, setResendCooldown] = useState(0);

  // Feedback state
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password strength computation (0..4)
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Enter a password' };
    let s = 0;
    if (password.length >= 6) s += 1;
    if (password.length >= 10) s += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) s += 1;
    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    return { score: s, label: labels[s] };
  }, [password]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: cleanEmail,
            password,
            currencySymbol
          })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to create account.');
          setIsSubmitting(false);
          return;
        }

        setInfoMessage(data.message || 'Verification code sent to your email.');
        setMode('verify-otp');
        setOtp('');
        setResendCooldown(30);
      } else if (mode === 'signin') {
        if (!password) {
          setError('Please enter your password.');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password
          })
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.requiresVerification) {
            setMode('verify-otp');
            setInfoMessage('Please verify your email with the 6-digit code sent to your inbox.');
            setResendCooldown(30);
            setIsSubmitting(false);
            return;
          }
          setError(data.error || 'Invalid email or password.');
          setIsSubmitting(false);
          return;
        }

        if (data.token) {
          localStorage.setItem('keeper_jwt_token', data.token);
        }
        onAuthenticated(data.user, rememberMe);
      } else if (mode === 'verify-otp') {
        const cleanOtp = otp.trim();
        if (cleanOtp.length < 6) {
          setError('Please enter the full 6-digit OTP code.');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            otp: cleanOtp
          })
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Verification failed. Please check the code.');
          setIsSubmitting(false);
          return;
        }

        if (data.token) {
          localStorage.setItem('keeper_jwt_token', data.token);
        }
        onAuthenticated(data.user, rememberMe);
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to request password reset.');
          setIsSubmitting(false);
          return;
        }

        setInfoMessage(data.message || 'Password reset code sent to your email.');
        setMode('reset-otp');
        setOtp('');
        setPassword('');
        setConfirmPassword('');
        setResendCooldown(30);
      } else if (mode === 'reset-otp') {
        const cleanOtp = otp.trim();
        if (cleanOtp.length < 6) {
          setError('Please enter the 6-digit recovery code.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('New password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsSubmitting(false);
          return;
        }

        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            otp: cleanOtp,
            newPassword: password
          })
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to reset password.');
          setIsSubmitting(false);
          return;
        }

        setInfoMessage('Password reset successfully! You can now sign in.');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error connecting to Keeper Vault authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setInfoMessage('');
    try {
      if (mode === 'reset-otp') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() })
        });
        const data = await res.json();
        if (res.ok) {
          setInfoMessage('A fresh recovery code has been sent to your email.');
          setResendCooldown(30);
        } else {
          setError(data.error || 'Failed to resend code.');
        }
      } else {
        const res = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() })
        });
        const data = await res.json();
        if (res.ok) {
          setInfoMessage('A fresh verification code has been sent to your email.');
          setResendCooldown(30);
        } else {
          setError(data.error || 'Failed to resend code.');
        }
      }
    } catch {
      setError('Unable to resend OTP at this time.');
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F5F3EF] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-[#F2BD91]/30 selection:text-[#F2BD91]">
      {/* ====================================================================
          1. FINE GEOMETRIC FINTECH GRID OVERLAY WITH RADIAL VIGNETTE
         ==================================================================== */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(242, 189, 145, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(242, 189, 145, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 25%, transparent 75%)'
        }}
      />

      {/* ====================================================================
          2. CONCENTRIC TITANIUM VAULT RINGS & ARCHITECTURAL DIAL
         ==================================================================== */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* Outermost Ring */}
        <div className="w-[960px] h-[960px] rounded-full border border-white/[0.03] absolute animate-[spin_240s_linear_infinite]" />

        {/* Mid Dashed Vault Ring */}
        <div
          className="w-[720px] h-[720px] rounded-full border border-[#F2BD91]/10 absolute animate-[spin_160s_linear_infinite_reverse]"
          style={{ borderStyle: 'dashed' }}
        />

        {/* Inner Security Ring */}
        <div className="w-[500px] h-[500px] rounded-full border border-emerald-500/[0.08] absolute" />

        {/* Center Precision Vault Crosshairs */}
        <div className="absolute w-[980px] h-[1px] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
        <div className="absolute h-[980px] w-[1px] bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
      </div>

      {/* ====================================================================
          3. CINEMATIC MULTI-LAYER RADIANT GLOW (WARM AMBER + EMERALD AURORA)
         ==================================================================== */}
      {/* Top Center Champagne Amber Glow */}
      <div className="absolute -top-[12%] left-1/2 -translate-x-1/2 w-[720px] h-[480px] bg-gradient-to-b from-[#F2BD91]/20 via-[#E59866]/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Bottom Right Emerald Protection Glow */}
      <div className="absolute -bottom-[15%] -right-[10%] w-[580px] h-[580px] bg-[#5CE095]/12 rounded-full blur-[150px] pointer-events-none" />

      {/* Bottom Left Deep Obsidian Glow */}
      <div className="absolute -bottom-[10%] -left-[10%] w-[500px] h-[500px] bg-[#F2BD91]/8 rounded-full blur-[140px] pointer-events-none" />

      {/* Center Behind Card Halo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[#F2BD91]/8 rounded-full blur-[90px] pointer-events-none" />

      {/* ====================================================================
          4. THE KEEPER VAULT AUTH MODAL (TITANIUM GLASSMORPHISM)
         ==================================================================== */}
      <div className="w-full max-w-md bg-[#131417]/92 border border-[#27282F] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(242,189,145,0.06)] p-6 sm:p-8 relative z-10 backdrop-blur-2xl before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#F2BD91]/50 before:to-transparent">
        {/* Keeper Vault Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#24211D] to-[#17181D] border border-[#3E3228] flex items-center justify-center text-[#F2BD91] shadow-[0_4px_20px_rgba(242,189,145,0.15)] mb-3">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F3EF]">Keeper Vault</h1>
          <p className="text-xs text-[#A5A5A5] mt-1">
            Personal Purchases, Warranty Timeline &amp; Auto-Pay Tracker
          </p>
        </div>

        {/* Tab switchers for Sign In / Sign Up */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="flex p-1 bg-[#101113] rounded-xl border border-[#232429] mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setInfoMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-[#F2BD91] text-[#141518] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
                setInfoMessage('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-[#F2BD91] text-[#141518] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F3EF]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Informational Message */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SIGN UP: Name */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#C5C4C0] mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7A7A7E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nagarjuna Shiva A."
                  className="w-full bg-[#1A1B20] border border-[#2B2C33] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F5F3EF] placeholder-[#666] focus:border-[#F2BD91] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email Input (for Sign In, Sign Up, and Forgot Password) */}
          {(mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
            <div>
              <label className="block text-xs font-medium text-[#C5C4C0] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7A7A7E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#1A1B20] border border-[#2B2C33] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F5F3EF] placeholder-[#666] focus:border-[#F2BD91] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* VERIFY OTP / RESET OTP: Email badge with change link */}
          {(mode === 'verify-otp' || mode === 'reset-otp') && (
            <div className="p-3 rounded-xl bg-[#18191E] border border-[#2B2C33] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#D0CECA] overflow-hidden">
                <Mail className="w-3.5 h-3.5 text-[#F2BD91] shrink-0" />
                <span className="truncate">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setInfoMessage('');
                }}
                className="text-[#F2BD91] hover:underline text-[11px] shrink-0 ml-2"
              >
                Change
              </button>
            </div>
          )}

          {/* VERIFY OTP / RESET OTP: 6-Digit OTP Code Input */}
          {(mode === 'verify-otp' || mode === 'reset-otp') && (
            <div>
              <label className="block text-xs font-medium text-[#C5C4C0] mb-1.5 text-center">
                6-Digit Security Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="w-full bg-[#1A1B20] border border-[#2B2C33] rounded-xl py-3 text-center text-xl font-mono tracking-[0.5em] text-[#F2BD91] placeholder-[#444] focus:border-[#F2BD91] focus:outline-none transition-colors"
                autoFocus
              />
              <div className="flex items-center justify-between mt-2 text-[11px] text-[#A5A5A5]">
                <span>Didn&apos;t receive the email?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOtp}
                  className={`font-medium ${
                    resendCooldown > 0
                      ? 'text-[#666] cursor-not-allowed'
                      : 'text-[#F2BD91] hover:underline'
                  }`}
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          )}

          {/* SIGN UP: Preferred Currency */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[#C5C4C0] mb-1.5">Default Currency</label>
              <select
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full bg-[#1A1B20] border border-[#2B2C33] rounded-xl px-3 py-2.5 text-xs text-[#F5F3EF] focus:border-[#F2BD91] focus:outline-none"
              >
                <option value="₹">₹ INR (Indian Rupee)</option>
                <option value="$">$ USD (US Dollar)</option>
                <option value="€">€ EUR (Euro)</option>
                <option value="£">£ GBP (British Pound)</option>
                <option value="¥">¥ JPY (Japanese Yen)</option>
                <option value="AED">AED (UAE Dirham)</option>
              </select>
            </div>
          )}

          {/* Password Input (for Sign In, Sign Up, and Reset OTP) */}
          {(mode === 'signin' || mode === 'signup' || mode === 'reset-otp') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#C5C4C0]">
                  {mode === 'reset-otp' ? 'New Password' : 'Password'}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setInfoMessage('');
                    }}
                    className="text-[11px] text-[#F2BD91] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7A7A7E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#1A1B20] border border-[#2B2C33] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F5F3EF] placeholder-[#666] focus:border-[#F2BD91] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A7A7E] hover:text-[#D0CECA]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar on Sign Up or Reset */}
              {(mode === 'signup' || mode === 'reset-otp') && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full transition-all ${
                          passwordStrength.score >= step
                            ? step <= 2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-[#26272C]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-[#A5A5A5]">
                    <span>Strength</span>
                    <span>{passwordStrength.label}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirm Password (for Sign Up and Reset OTP) */}
          {(mode === 'signup' || mode === 'reset-otp') && (
            <div>
              <label className="block text-xs font-medium text-[#C5C4C0] mb-1.5">
                Confirm {mode === 'reset-otp' ? 'New Password' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7A7A7E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-[#1A1B20] border border-[#2B2C33] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F5F3EF] placeholder-[#666] focus:border-[#F2BD91] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Remember Me */}
          {mode === 'signin' && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#D0CECA]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded accent-[#F2BD91]"
                />
                Keep me signed in on this device
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#F2BD91] hover:bg-[#e3ac80] text-[#141518] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In to Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signup' ? (
              <>
                <span>Create Account &amp; Send OTP</span>
                <Mail className="w-4 h-4" />
              </>
            ) : mode === 'verify-otp' ? (
              <>
                <span>Verify &amp; Unlock Vault</span>
                <ShieldCheck className="w-4 h-4" />
              </>
            ) : mode === 'forgot' ? (
              <>
                <span>Send 6-Digit Recovery Code</span>
                <Mail className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Update Password &amp; Sign In</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Back navigation for Forgot Password / Reset */}
        {(mode === 'forgot' || mode === 'reset-otp') && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setInfoMessage('');
              }}
              className="text-xs text-[#A5A5A5] hover:text-[#F2BD91] transition-colors"
            >
              &larr; Back to Sign In
            </button>
          </div>
        )}

        
      </div>
    </div>
  );
}
