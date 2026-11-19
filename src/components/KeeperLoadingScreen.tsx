import React, { useState, useEffect } from 'react';
import { Package, Shield, Sparkles } from 'lucide-react';

interface KeeperLoadingScreenProps {
  onLoaded?: () => void;
  minDisplayTimeMs?: number;
}

export function KeeperLoadingScreen({
  onLoaded,
  minDisplayTimeMs = 1200
}: KeeperLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusText, setStatusText] = useState('Initializing secure vault...');

  useEffect(() => {
    // Stage 1: Fast start to 35%
    const t1 = setTimeout(() => {
      setProgress(38);
      setStatusText('Connecting to cloud cluster...');
    }, 250);

    // Stage 2: Progress to 75%
    const t2 = setTimeout(() => {
      setProgress(78);
      setStatusText('Syncing cards & warranty timeline...');
    }, 650);

    // Stage 3: Finish to 100%
    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Vault unlocked');
    }, minDisplayTimeMs - 250);

    // Fade out and unmount
    const t4 = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        if (onLoaded) onLoaded();
      }, 500);
    }, minDisplayTimeMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [minDisplayTimeMs, onLoaded]);

  return (
    <div
      className={`fixed inset-0 z-[999] bg-[#08090A] text-[#F5F3EF] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-all duration-700 ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Fine Geometric Architecture Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(242, 189, 145, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(242, 189, 145, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 80%)'
        }}
      />

      {/* 2. Deep Radiant Ambient Lighting Halo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#F2BD91]/12 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-[#5CE095]/8 rounded-full blur-[90px] pointer-events-none" />

      {/* 3. Concentric Rotating Vault Ring Dial */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center mb-8">
        {/* Outer Orbiting Dash Ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-[spin_12s_linear_infinite]"
          viewBox="0 0 160 160"
        >
          <circle
            cx="80"
            cy="80"
            r="74"
            fill="none"
            stroke="#24262E"
            strokeWidth="1.5"
            strokeDasharray="4 8"
          />
          <circle
            cx="80"
            cy="80"
            r="66"
            fill="none"
            stroke="#F2BD91"
            strokeWidth="2"
            strokeDasharray="16 28"
            opacity="0.5"
          />
        </svg>

        {/* Counter-Rotating Inner Ring */}
        <svg
          className="absolute inset-4 w-auto h-auto animate-[spin_8s_linear_infinite_reverse]"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#5CE095"
            strokeWidth="1"
            strokeDasharray="8 14"
            opacity="0.3"
          />
        </svg>

        {/* Center Illuminated Isometric Vault Cube */}
        <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#25221E] via-[#1B1C22] to-[#121316] border border-[#3E3328] flex items-center justify-center shadow-[0_0_35px_rgba(242,189,145,0.25)]">
          <Package className="w-9 h-9 sm:w-10 sm:h-10 text-[#F2BD91] drop-shadow-[0_2px_12px_rgba(242,189,145,0.5)] animate-pulse" />
        </div>
      </div>

      {/* 4. Brand Typography & Tagline */}
      <div className="text-center relative z-10 space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[0.22em] text-[#F5F3EF] uppercase">
            Keeper<span className="text-[#F2BD91]">..</span>
          </h1>
        </div>
        <p className="text-[11px] sm:text-xs text-[#A5A5A5] tracking-wider uppercase font-medium">
          Personal Purchases &bull; Warranty Timeline &bull; Cards
        </p>
      </div>

      {/* 5. Precision Progress Bar Runner */}
      <div className="w-52 sm:w-64 mt-8 relative z-10">
        <div className="h-1 bg-[#1A1B20] border border-white/5 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F2BD91] via-[#E59866] to-[#5CE095] shadow-[0_0_12px_rgba(242,189,145,0.8)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2.5 text-[10px] font-mono text-[#7A7A7E]">
          <span className="tracking-wider uppercase">{statusText}</span>
          <span className="text-[#F2BD91] font-semibold">{progress}%</span>
        </div>
      </div>

      {/* 6. Minimal Bottom Copyright */}
      <div className="absolute bottom-6 text-[10px] font-mono text-[#555660] tracking-widest uppercase pointer-events-none">
        CiNE CLUSTER &bull; KEEPER VAULT OS
      </div>
    </div>
  );
}
