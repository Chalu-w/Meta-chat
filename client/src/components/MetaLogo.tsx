import React from 'react';

interface MetaLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const MetaLogo: React.FC<MetaLogoProps> = ({
  size = 36,
  showText = false,
  className = '',
}) => {
  return (
    <div className={`meta-logo-wrap flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0099ff" />
            <stop offset="45%" stopColor="#0088cc" />
            <stop offset="100%" stopColor="#0055aa" />
          </linearGradient>
          <linearGradient id="logoGlyphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#eaf5ff" />
          </linearGradient>
          <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#0055aa" floodOpacity="0.4" />
          </filter>
        </defs>

        <rect x="24" y="24" width="464" height="464" rx="120" fill="url(#logoBgGrad)" filter="url(#logoShadow)" />
        <path d="M 80 140 A 180 180 0 0 1 432 140" fill="none" stroke="#ffffff" strokeWidth="6" strokeOpacity="0.2" strokeLinecap="round" />
        
        {/* 'M' Letterform & Chat Cloud */}
        <path
          d="M 130 350 L 130 190 C 130 165 152 148 174 158 L 256 220 L 338 158 C 360 148 382 165 382 190 L 382 320 C 382 336 368 350 352 350 L 290 350 L 290 240 L 256 270 L 222 240 L 222 350 Z"
          fill="url(#logoGlyphGrad)"
        />
        {/* Chat Wing Tail */}
        <path
          d="M 130 350 L 88 385 C 80 392 70 386 72 376 L 82 332 C 78 322 76 311 76 300 C 76 250 110 206 158 194 L 158 260 C 141 270 130 288 130 310 Z"
          fill="#ffffff"
          opacity="0.9"
        />
        {/* Connectivity Nodes */}
        <circle cx="256" cy="336" r="14" fill="#0088cc" />
        <circle cx="210" cy="336" r="10" fill="#0088cc" opacity="0.6" />
        <circle cx="302" cy="336" r="10" fill="#0088cc" opacity="0.6" />
      </svg>

      {showText && (
        <span className="font-heading font-bold text-xl tracking-tight text-white select-none">
          Meta Chat
        </span>
      )}
    </div>
  );
};
