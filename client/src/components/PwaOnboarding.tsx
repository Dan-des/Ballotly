'use client';

import React, { useState, useRef, TouchEvent } from 'react';
import Link from 'next/link';
import BallotlyLogo from '@/components/BallotlyLogo';

interface OnboardingScreen {
  id: number;
  badge: string;
  title: string;
  description: string;
  features: { label: string; value: string }[];
  visualType: 'welcome' | 'ballot' | 'audit';
}

const ONBOARDING_SCREENS: OnboardingScreen[] = [
  {
    id: 0,
    badge: 'Institutional Digital Elections',
    title: 'Verified Institutional Voting on Your Device',
    description:
      'Run transparent, cryptographically secure elections with multi-category ballots, whitelist enforcement, and zero double-voting.',
    features: [
      { label: 'Integrity', value: 'Zero Double-Voting' },
      { label: 'Structure', value: 'Multi-Position Ballots' },
      { label: 'Control', value: 'Whitelist Roster Rules' },
    ],
    visualType: 'welcome',
  },
  {
    id: 1,
    badge: 'Electoral Architecture',
    title: 'Multi-Position Ballots with Whitelist Security',
    description:
      'Configure unified elections across executive offices in a single session. Restrict ballot access to verified student matriculation IDs or member lists.',
    features: [
      { label: 'Offices', value: 'President, VP, Secretary' },
      { label: 'Whitelist', value: 'Student / Member ID Match' },
      { label: 'Privacy', value: 'Anonymized Balloting' },
    ],
    visualType: 'ballot',
  },
  {
    id: 2,
    badge: 'Real-Time Transparency',
    title: 'Live Turnout Monitoring & Certified Audit Logs',
    description:
      'Monitor voting progress in real-time, generate official certified result certificates, and download timestamped CSV audit ledgers.',
    features: [
      { label: 'Monitoring', value: 'Live Real-Time Tallies' },
      { label: 'Verification', value: 'Cryptographic Sequence' },
      { label: 'Compliance', value: 'Official CSV Export' },
    ],
    visualType: 'audit',
  },
];

export default function PwaOnboarding() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const handleNext = () => {
    if (currentScreen < ONBOARDING_SCREENS.length - 1) {
      setCurrentScreen((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    setCurrentScreen(ONBOARDING_SCREENS.length - 1);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (diff > minSwipeDistance) {
      // Swiped Left -> Next
      handleNext();
    } else if (diff < -minSwipeDistance) {
      // Swiped Right -> Back
      handleBack();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const screen = ONBOARDING_SCREENS[currentScreen];

  return (
    <main
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between select-none max-w-md mx-auto relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top App Bar ─────────────────────────────────────────────── */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <BallotlyLogo size={32} />
          <span className="font-bold text-slate-900 tracking-tight text-base flex items-center gap-1">
            Ballotly
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
          </span>
        </div>

        {currentScreen < ONBOARDING_SCREENS.length - 1 && (
          <button
            type="button"
            onClick={handleSkip}
            className="btn-press text-xs font-semibold text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Skip
          </button>
        )}
      </header>

      {/* ── Center Content Carousel ─────────────────────────────────── */}
      <div className="flex-1 px-5 py-4 flex flex-col justify-center animate-in fade-in duration-300">
        {/* Screen Visual Card */}
        <div className="mb-6 flex justify-center">
          {screen.visualType === 'welcome' && (
            <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <BallotlyLogo size={48} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Mobile App Edition
              </div>
            </div>
          )}

          {screen.visualType === 'ballot' && (
            <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Multi-Office Ballot</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Whitelist Active
                </span>
              </div>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    01
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Executive President</p>
                    <p className="text-[10px] text-slate-500">2 Verified Nominees</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                    02
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Vice President</p>
                    <p className="text-[10px] text-slate-500">3 Verified Nominees</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          )}

          {screen.visualType === 'audit' && (
            <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Electoral Audit Ledger</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  100% Certified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Turnout</p>
                  <p className="text-sm font-extrabold text-blue-600">89.4%</p>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Double-Votes</p>
                  <p className="text-sm font-extrabold text-emerald-600">0 Blocked</p>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium text-[11px]">Audit Ledger Ready</span>
                <span className="text-[10px] font-bold text-blue-700 uppercase">CSV / Certificate</span>
              </div>
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-200/80 border border-slate-300 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
            {screen.badge}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {screen.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            {screen.description}
          </p>

          {/* Mini Features Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5">
            {screen.features.map((feat, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700"
              >
                {feat.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Controls & Actions ────────────────────────────────── */}
      <footer className="px-5 pb-8 pt-3 space-y-4 z-10 bg-slate-50">
        {/* Progress Dots Indicator */}
        <div className="flex items-center justify-center gap-2">
          {ONBOARDING_SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentScreen(s.id)}
              aria-label={`Go to screen ${s.id + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentScreen === s.id
                  ? 'w-6 bg-blue-600'
                  : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>

        {/* Navigation Action Buttons */}
        {currentScreen < ONBOARDING_SCREENS.length - 1 ? (
          <div className="flex items-center gap-3">
            {currentScreen > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn-press p-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                aria-label="Previous screen"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="btn-press flex-1 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Next</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Primary Get Started Button */}
            <Link
              href="/signup"
              className="btn-press w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Get Started</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Secondary Sign In Button */}
            <Link
              href="/login"
              className="btn-press w-full py-3.5 px-6 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </footer>
    </main>
  );
}
