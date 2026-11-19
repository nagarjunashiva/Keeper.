import React from 'react';

export interface BrandLogoProps {
  provider: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandLogo({ provider, size = 'md', className = '' }: BrandLogoProps) {
  const norm = (provider || '').trim().toLowerCase();

  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm'
  }[size];

  // ==========================================================================
  // JIO (Reliance Jio) — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('jio')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-[#0055b8] border border-[#1E3A8A] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-0.5 ${className}`}
        title="Reliance Jio"
      >
        <img
          src="/assets/logos/jio.webp"
          alt="Jio"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // AIRTEL (Bharti Airtel) — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('airtel')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-[#E40000] border border-[#FF3333]/40 flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-0.5 ${className}`}
        title="Bharti Airtel"
      >
        <img
          src="/assets/logos/airtel.webp"
          alt="Airtel"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // VI (Vodafone Idea) — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('vi') || norm.includes('vodafone') || norm.includes('idea')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-black border border-[#2B2C33] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-0.5 ${className}`}
        title="Vi (Vodafone Idea)"
      >
        <img
          src="/assets/logos/vi.webp"
          alt="Vi"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // APPLE / ICLOUD / APPLE ONE — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('apple') || norm.includes('icloud')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1 ${className}`}
        title="Apple"
      >
        <img
          src="/assets/logos/apple.webp"
          alt="Apple"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // NETFLIX — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('netflix')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-black border border-[#2B2C33] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-0.5 ${className}`}
        title="Netflix"
      >
        <img
          src="/assets/logos/netflix.webp"
          alt="Netflix"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // SPOTIFY — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('spotify')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-black border border-[#2B2C33] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-0.5 ${className}`}
        title="Spotify"
      >
        <img
          src="/assets/logos/spotify.webp"
          alt="Spotify"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // AMAZON PRIME / PRIME VIDEO — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('amazon') || norm.includes('prime')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1 ${className}`}
        title="Amazon Prime Video"
      >
        <img
          src="/assets/logos/prime.webp"
          alt="Amazon Prime Video"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // GOOGLE / GOOGLE ONE / YOUTUBE — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('google') || norm.includes('youtube')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1 ${className}`}
        title="Google"
      >
        <img
          src="/assets/logos/google.webp"
          alt="Google"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // OPENAI / CHATGPT — User Provided Official Logo
  // ==========================================================================
  if (norm.includes('openai') || norm.includes('chatgpt') || norm.includes('gpt')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1 ${className}`}
        title="OpenAI ChatGPT"
      >
        <img
          src="/assets/logos/openai.webp"
          alt="OpenAI"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ==========================================================================
  // DISNEY+ / HOTSTAR
  // ==========================================================================
  if (norm.includes('disney') || norm.includes('hotstar')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-[#040814] border border-[#113CCF] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1 ${className}`}
        title="Disney+ Hotstar"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M20 75 C 30 20, 70 20, 80 75"
            stroke="#113CCF"
            strokeWidth="8"
            fill="none"
          />
          <text
            x="50"
            y="65"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="32"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            D+
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // BSNL
  // ==========================================================================
  if (norm.includes('bsnl')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-[#004B87] border border-[#0066B3] flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1 ${className}`}
        title="BSNL"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M30 40 C 35 25, 65 25, 70 40"
            stroke="#FFD100"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <text
            x="50"
            y="56"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="18"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            BSNL
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // MICROSOFT
  // ==========================================================================
  if (norm.includes('microsoft') || norm.includes('xbox') || norm.includes('office')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-[#1E1F24] border border-[#303138] flex items-center justify-center shrink-0 shadow-sm p-1.5 ${className}`}
        title="Microsoft"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="8" y="8" width="40" height="40" fill="#F25022" />
          <rect x="52" y="8" width="40" height="40" fill="#7FBA00" />
          <rect x="8" y="52" width="40" height="40" fill="#00A4EF" />
          <rect x="52" y="52" width="40" height="40" fill="#FFB900" />
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // SONY / PLAYSTATION
  // ==========================================================================
  if (norm.includes('sony') || norm.includes('playstation')) {
    return (
      <div
        className={`${sizeClasses} rounded-xl bg-[#003791] border border-[#1A5ED8] flex items-center justify-center shrink-0 shadow-sm p-1.5 ${className}`}
        title="Sony PlayStation"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="26"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            letterSpacing="1"
          >
            SONY
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================================================
  // DEFAULT / FALLBACK BRAND LOGO
  // ==========================================================================
  const initials = (provider || 'Sub')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses} rounded-xl bg-gradient-to-br from-[#2D2A26] to-[#1E1D1B] border border-[#453A30] text-[#F2BD91] font-bold flex items-center justify-center shrink-0 shadow-sm ${className}`}
      title={provider || 'Subscription'}
    >
      {initials || '⚡'}
    </div>
  );
}
