'use client';

import React from 'react';
import Link from 'next/link';

interface BallotlyLogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
  textClassName?: string;
  subtext?: string;
  href?: string;
  animated?: boolean;
}

export default function BallotlyLogo({
  size = 36,
  className = '',
  withText = false,
  textClassName = '',
  subtext,
  href,
  animated = true,
}: BallotlyLogoProps) {
  const icon = (
    <div
      className={`relative flex items-center justify-center shrink-0 ${
        animated ? 'group-hover:scale-105 group-hover:rotate-1 transition-all duration-200' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="blBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="blCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
          <filter id="blCardShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* App Icon Base Tile */}
        <rect width="512" height="512" rx="116" fill="url(#blBgGrad)" />

        {/* Subtle Inner Border */}
        <rect
          x="2"
          y="2"
          width="508"
          height="508"
          rx="114"
          stroke="#ffffff"
          strokeOpacity="0.15"
          strokeWidth="4"
        />

        {/* Ballot Box Base Tray / Slot Back */}
        <path
          d="M120 376 C120 366 128 358 138 358 L374 358 C384 358 392 366 392 376 L392 384 C392 394 384 402 374 402 L138 402 C128 402 120 394 120 384 Z"
          fill="#173da6"
        />

        {/* The Ballot Paper (Gliding into the slot) */}
        <g filter="url(#blCardShadow)">
          <path
            d="M168 116 C168 102 179 91 193 91 L319 91 C333 91 344 102 344 116 L344 374 L168 374 Z"
            fill="url(#blCardGrad)"
          />

          {/* Top candidate indicator placeholder lines */}
          <rect x="204" y="136" width="104" height="10" rx="5" fill="#e2e8f0" />
          <rect x="204" y="160" width="70" height="8" rx="4" fill="#cbd5e1" />

          {/* Checkmark Row / Selection Circle */}
          <circle cx="256" cy="242" r="46" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="4" />

          {/* Bold Verified Checkmark */}
          <path
            d="M232 242 L249 259 L283 222"
            stroke="#2563eb"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom ballot line */}
          <rect x="204" y="318" width="104" height="8" rx="4" fill="#e2e8f0" />
          <rect x="204" y="336" width="60" height="8" rx="4" fill="#cbd5e1" />
        </g>

        {/* Front Rim of Ballot Box Slot */}
        <path
          d="M112 372 C112 358 124 348 138 348 L374 348 C388 348 400 358 400 372 L400 388 C400 402 388 412 374 412 L138 412 C124 412 112 402 112 388 Z"
          fill="#1e40af"
        />
        <path
          d="M136 364 L376 364"
          stroke="#60a5fa"
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />
      </svg>
    </div>
  );

  const content = (
    <div className="inline-flex items-center gap-2.5 group">
      {icon}
      {withText && (
        <div className="flex flex-col">
          <span
            className={`font-bold text-slate-900 tracking-tight leading-none flex items-center gap-1 ${
              textClassName || (size > 36 ? 'text-xl' : 'text-lg')
            }`}
          >
            Ballotly
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
          </span>
          {subtext && (
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
