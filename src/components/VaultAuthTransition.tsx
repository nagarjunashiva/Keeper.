import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  KeyRound,
  Database,
  CheckCircle2
} from 'lucide-react';

interface VaultAuthTransitionProps {
  type: 'signing_in' | 'signing_out';
  userName?: string;
  userEmail?: string;
}

export function VaultAuthTransition({
  type,
  userName,
  userEmail
}: VaultAuthTransitionProps) {
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 350);
    const t2 = setTimeout(() => setPhase(2), 750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const isSignIn = type === 'signing_in';

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0B0D] flex flex-col items-center justify-center p-6 select-none overflow-hidden animate-fadeIn">
      {/* Background Ambient Glow & Radial Mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[140px] opacity-25 transition-all duration-700 ${
            isSignIn ? 'bg-[#F2BD91]' : 'bg-[#E57373]'
          }`}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full blur-[80px] opacity-20 bg-[#5CE095]" />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Central Vault Mechanism */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        {/* Animated Vault Gear Dial */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center mb-7">
          {/* Outer Rotating Concentric Ring with Tick Marks */}
          <svg
            className={`absolute inset-0 w-full h-full ${
              isSignIn ? 'animate-spin' : 'animate-[spin_3s_reverse_infinite]'
            }`}
            style={{ animationDuration: isSignIn ? '8s' : '6s' }}
            viewBox="0 0 160 160"
          >
            <circle
              cx="80"
              cy="80"
              r="74"
              fill="none"
              stroke="#252730"
              strokeWidth="2"
              strokeDasharray="4 8"
            />
            <circle
              cx="80"
              cy="80"
              r="66"
              fill="none"
              stroke={isSignIn ? '#F2BD91' : '#F27474'}
              strokeWidth="1.5"
              strokeDasharray="12 18"
              opacity="0.4"
            />
          </svg>

          {/* Middle Biometric Pulse Circle */}
          <div
            className={`absolute inset-3 rounded-full border border-dashed transition-all duration-700 ${
              isSignIn
                ? phase >= 1
                  ? 'border-[#5CE095]/60 scale-105'
                  : 'border-[#F2BD91]/40'
                : 'border-[#F27474]/50'
            }`}
          />

          {/* Inner Glowing Vault Core */}
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center shadow-2xl border transition-all duration-500 relative overflow-hidden ${
              isSignIn
                ? phase >= 2
                  ? 'bg-gradient-to-br from-[#1B3224] to-[#121E17] border-[#387652] scale-105'
                  : 'bg-gradient-to-br from-[#29221B] to-[#191613] border-[#55402F]'
                : 'bg-gradient-to-br from-[#2D1B1E] to-[#1B1113] border-[#5A2C31]'
            }`}
          >
            {/* Subtle Metallic Sheen */}
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none" />

            {isSignIn ? (
              phase >= 2 ? (
                <div className="flex flex-col items-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-[#5CE095] stroke-[2.2]" />
                </div>
              ) : phase >= 1 ? (
                <Unlock className="w-10 h-10 text-[#5CE095] stroke-[2] transition-transform scale-110" />
              ) : (
                <Lock className="w-9 h-9 text-[#F2BD91] stroke-[2]" />
              )
            ) : phase >= 1 ? (
              <Lock className="w-10 h-10 text-[#F27474] stroke-[2.2] scale-110 transition-transform" />
            ) : (
              <Unlock className="w-9 h-9 text-[#F2BD91] stroke-[2]" />
            )}
          </div>
        </div>

        {/* Text Heading */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#A5A5A5] flex items-center justify-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isSignIn ? 'bg-[#5CE095]' : 'bg-[#F27474]'
              }`}
            />
            <span>{isSignIn ? 'Keeper Cloud Vault' : 'Security Engine'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F3EF]">
            {isSignIn
              ? phase >= 2
                ? `Welcome, ${userName || 'User'}!`
                : 'Unlocking Keeper Vault'
              : phase >= 2
              ? 'Vault Safely Locked'
              : 'Securing Keeper Vault'}
          </h2>

          <p className="text-xs text-[#8E8F94] h-5 transition-all">
            {isSignIn ? (
              phase === 0 ? (
                'Verifying cryptographic token...'
              ) : phase === 1 ? (
                'Decrypting cloud database records...'
              ) : (
                <span className="text-[#5CE095] font-medium flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Ready to enter your private dashboard
                </span>
              )
            ) : phase === 0 ? (
              'Encrypting local database memory...'
            ) : phase === 1 ? (
              'Purging active authentication tokens...'
            ) : (
              <span className="text-[#A5A5A5]">All sessions cleared and protected.</span>
            )}
          </p>
        </div>

        {/* Glowing Progress Beam */}
        <div className="w-48 sm:w-56 bg-[#1A1B22] rounded-full h-1.5 overflow-hidden mt-6 relative border border-[#272935]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isSignIn
                ? phase >= 2
                  ? 'w-full bg-[#5CE095]'
                  : phase === 1
                  ? 'w-3/4 bg-[#F2BD91]'
                  : 'w-1/3 bg-[#F2BD91]'
                : phase >= 2
                ? 'w-full bg-[#F27474]'
                : phase === 1
                ? 'w-3/4 bg-[#E08A5C]'
                : 'w-1/3 bg-[#F2BD91]'
            }`}
          />
        </div>

        {/* User email badge */}
        {userEmail && (
          <div className="mt-4 text-[10px] text-[#6E707A] font-mono px-3 py-1 rounded-full bg-[#141518] border border-[#23242A]">
            {userEmail}
          </div>
        )}
      </div>
    </div>
  );
}
