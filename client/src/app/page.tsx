'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BallotlyLogo from '@/components/BallotlyLogo';
import ScrollReveal from '@/components/ScrollReveal';
import { isStandalonePwa } from '@/lib/pwa';

export default function LandingPage() {
  const router = useRouter();
  const [isPwa, setIsPwa] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'share' | 'results'>('create');
  const [selectedCandidate, setSelectedCandidate] = useState<'OA' | 'CN'>('OA');
  const [animatedTurnout, setAnimatedTurnout] = useState(1420);
  const [resultsAnimated, setResultsAnimated] = useState(false);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('main');

  useEffect(() => {
    // 1. Check if running inside installed PWA / standalone mobile app
    if (isStandalonePwa()) {
      setIsPwa(true);
      const token = localStorage.getItem('voting_admin_token');
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    // 2. In browser mode: check authentication status for dynamic nav actions
    const token = localStorage.getItem('voting_admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Subtle live simulated turnout ticker
  useEffect(() => {
    if (activeTab === 'share') {
      const interval = setInterval(() => {
        setAnimatedTurnout((prev) => (prev >= 1435 ? 1420 : prev + 1));
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Trigger results progress bar animation upon switching to results tab
  useEffect(() => {
    if (activeTab === 'results') {
      setResultsAnimated(false);
      const timer = setTimeout(() => setResultsAnimated(true), 60);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // If in PWA standalone mode, render a minimal loader while redirection takes place
  if (isPwa) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Launching Ballotly...</span>
        </div>
      </main>
    );
  }

  const handleCopyPageUrl = async () => {
    try {
      if (typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.origin);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Ballotly - Institutional Digital Voting & Elections Platform',
          text: 'Run verified, transparent, and secure digital elections with zero double-voting.',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://ballotlyng.vercel.app',
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      handleCopyPageUrl();
    }
  };

  const faqItems = [
    {
      category: 'Verification & Anti-Fraud',
      question: 'How does Ballotly prevent double voting and duplicate ballots?',
      answer:
        'Ballotly uses dynamic tracking methods chosen by election administrators, including Student ID, Matriculation Number, Institutional Email, Phone Number, or Voter ID. When a ballot is cast, the platform generates a cryptographic deduplication record. Any subsequent attempt using the same identifier is blocked automatically.',
    },
    {
      category: 'Ballot Confidentiality',
      question: 'Are voter choices completely confidential and secret?',
      answer:
        'Yes. Voter identifiers are used strictly for eligibility verification and deduplication. Ballot submissions are dissociated from voter identities upon recording, guaranteeing that election organizers and third parties cannot trace individual candidate selections back to a voter.',
    },
    {
      category: 'Roster & Whitelist Control',
      question: 'How does the Restricted Voter Whitelist work?',
      answer:
        'Administrators can upload or paste an authorized roster of eligible identifiers (such as student matriculation IDs or department emails). When whitelist enforcement is enabled, unlisted individuals are rejected with an explicit authorization notice.',
    },
    {
      category: 'Multi-Position Elections',
      question: 'Can we conduct multi-office elections on a single unified ballot?',
      answer:
        'Yes. Ballotly allows organizers to configure multiple executive positions (such as President, Vice President, General Secretary, and Treasurer) on one unified ballot. Voters select their candidates across categories and submit their unified vote in a single step.',
    },
    {
      category: 'Audits & Official Exports',
      question: 'How do administrators export certified election results and logs?',
      answer:
        'Organizers can access the Results Center to view real-time tally breakdowns, download raw anonymized CSV audit logs, or print official election certificates with verification timestamps for accreditation records.',
    },
    {
      category: 'PWA Mobile App Setup',
      question: 'Can Ballotly be installed as a standalone mobile app?',
      answer:
        'Yes. Ballotly is a full Progressive Web App (PWA). On mobile devices, voters and organizers can add Ballotly to their home screen to launch it as a standalone app with direct access to voting and organizer controls.',
    },
  ];

  const filteredFaqs = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(faqSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <BallotlyLogo size={34} withText href="/" />
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600">
              <a href="#showcase" className="hover:text-blue-600 transition-colors">
                Live Showcase
              </a>
              <a href="#capabilities" className="hover:text-blue-600 transition-colors">
                Capabilities
              </a>
              <a href="#process" className="hover:text-blue-600 transition-colors">
                How It Works
              </a>
              <a href="#use-cases" className="hover:text-blue-600 transition-colors">
                Use Cases
              </a>
              <a href="#faq" className="hover:text-blue-600 transition-colors">
                FAQ
              </a>
              <a href="#polling-station" className="hover:text-blue-600 transition-colors">
                Polling Centers
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="btn-press px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <span>Go to Dashboard</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-press px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="btn-press px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Create a Poll</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <ScrollReveal direction="down" delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Institutional Digital Elections &amp; Multi-Position Ballots
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={80}>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
              Verified Digital Voting and Governance for Organizations
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={160}>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Ballotly provides cryptographic ballot verification, multi-office governance elections, and voter deduplication. Designed for professional bodies, labor unions, associations, and campus student elections.
            </p>
          </ScrollReveal>

          {/* Primary Action Buttons */}
          <ScrollReveal direction="up" delay={240}>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="btn-press w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Create a Poll</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>

              <a
                href="#showcase"
                className="btn-press w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Explore Live Showcase</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </ScrollReveal>

          {/* Trust Highlights */}
          <ScrollReveal direction="up" delay={320}>
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Integrity</span>
                <span className="text-xs font-semibold text-slate-900">Zero Double-Voting</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Structure</span>
                <span className="text-xs font-semibold text-slate-900">Multi-Position Ballots</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Control</span>
                <span className="text-xs font-semibold text-slate-900">Whitelist Verification</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Compliance</span>
                <span className="text-xs font-semibold text-slate-900">CSV Audit Exports</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Interactive Platform Showcase (Screenshots / UI Previews) ─ */}
      <section id="showcase" className="py-16 bg-slate-100/70 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <ScrollReveal direction="down" delay={0}>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Interactive Product Walkthrough
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Experience the Full Election Lifecycle
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Select a workflow tab below to preview the actual interface for ballot configuration, distribution, and real-time result audits.
              </p>
            </div>
          </ScrollReveal>

          {/* Tab Selector Buttons */}
          <ScrollReveal direction="up" delay={60}>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`btn-press px-4 py-2.5 text-xs font-bold rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'create'
                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-extrabold">1</span>
                <span>Create a Poll</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('share')}
                className={`btn-press px-4 py-2.5 text-xs font-bold rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'share'
                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-extrabold">2</span>
                <span>Share Live Link</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`btn-press px-4 py-2.5 text-xs font-bold rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'results'
                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-extrabold">3</span>
                <span>View &amp; Export Results</span>
              </button>
            </div>
          </ScrollReveal>

          {/* Interactive UI Mockup Card Container */}
          <ScrollReveal direction="up" delay={120}>
            <div className="max-w-4xl mx-auto bg-white border border-slate-300 rounded-xl overflow-hidden transition-all duration-300">
              {/* Showcase Card Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {activeTab === 'create'
                      ? 'Poll Builder & Ballot Setup'
                      : activeTab === 'share'
                      ? 'Voter Access & Distribution Hub'
                      : 'Live Audit & Results Portal'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Live Preview
                  </span>
                </div>
              </div>

              {/* Tab 1: Create a Poll Mockup */}
              {activeTab === 'create' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Annual Executive Election 2026</h3>
                      <p className="text-xs text-slate-500">Multi-Category Ballot Setup with Roster Whitelist</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
                      Mode: Category Election
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Category 1 */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Office 1: President &amp; Chairman
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">Click Candidate to Test Selection</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate('OA')}
                          className={`p-3 rounded-md flex items-center justify-between text-left transition-all duration-200 border ${
                            selectedCandidate === 'OA'
                              ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/15'
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                              OA
                            </div>
                            <div className="text-xs">
                              <p className="font-semibold text-slate-900">Oluwaseun Adeleke</p>
                              <p className="text-[10px] text-slate-500">Faculty of Technology</p>
                            </div>
                          </div>
                          {selectedCandidate === 'OA' && (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCandidate('CN')}
                          className={`p-3 rounded-md flex items-center justify-between text-left transition-all duration-200 border ${
                            selectedCandidate === 'CN'
                              ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/15'
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                              CN
                            </div>
                            <div className="text-xs">
                              <p className="font-semibold text-slate-900">Chioma Nnamdi</p>
                              <p className="text-[10px] text-slate-500">School of Governance</p>
                            </div>
                          </div>
                          {selectedCandidate === 'CN' && (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Verification Settings */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Voter Verification &amp; Security Rules
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-white border border-slate-200 rounded text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Primary Key</p>
                          <p className="font-semibold text-slate-800">Student / Matric ID</p>
                        </div>
                        <div className="p-2 bg-white border border-slate-200 rounded text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Access Rule</p>
                          <p className="font-semibold text-slate-800">Whitelist Roster Required</p>
                        </div>
                        <div className="p-2 bg-white border border-slate-200 rounded text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Voter Privacy</p>
                          <p className="font-semibold text-slate-800">Cryptographically Anonymized</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      href="/login"
                      className="btn-press px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>Launch Ballot in Dashboard</span>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}

              {/* Tab 2: Share Live Poll Link Mockup */}
              {activeTab === 'share' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-base font-bold text-slate-900">Live Election Ballot Distribution</h3>
                    <p className="text-xs text-slate-500">Direct Voter Link &amp; Verified QR Code Access Point</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 uppercase tracking-wider block text-[10px] mb-1">
                          Encrypted Voter Access Link
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value="https://ballotlyng.vercel.app/vote/pol_9281a8"
                            className="w-full bg-slate-100 border border-slate-300 rounded px-3 py-2 text-xs font-mono text-slate-700"
                          />
                          <button
                            type="button"
                            onClick={handleCopyPageUrl}
                            className="btn-press px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold whitespace-nowrap"
                          >
                            {shareCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                          Multi-Channel Broadcast
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleNativeShare}
                            className="btn-press px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-xs hover:bg-blue-100 transition-colors"
                          >
                            Native Mobile Share
                          </button>
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold text-xs">
                            WhatsApp Roster Broadcast
                          </span>
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold text-xs">
                            Email Notification Dispatch
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-[11px] font-semibold text-emerald-800">
                            Live Turnout Counter: {animatedTurnout.toLocaleString()} / 1,850 Eligible Ballots Cast ({((animatedTurnout / 1850) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Demo Panel */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
                      <div className="w-32 h-32 mx-auto bg-white border border-slate-300 p-2 rounded flex items-center justify-center">
                        <svg className="w-28 h-28 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                          <path d="M10 10h30v30h-30z M50 10h10v10h-10z M70 10h20v20h-20z M20 20h10v10h-10z M10 50h10v10h-10z M10 70h30v30h-30z M20 80h10v10h-10z M50 50h20v10h-20z M80 50h10v20h-10z M50 70h10v20h-10z M70 80h20v20h-20z" />
                        </svg>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700">Scan at Physical Polling Station</p>
                      <p className="text-[10px] text-slate-500">Directs instantly to authenticated mobile ballot</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: View & Export Results Mockup */}
              {activeTab === 'results' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Election Audit &amp; Certified Results</h3>
                      <p className="text-xs text-slate-500">Live Cryptographic Vote Tally with Verified Audit Seal</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Audited &amp; Sealed
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Candidate Vote Tally Bars with Dynamic Animation */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>Oluwaseun Adeleke (Candidate 1)</span>
                          <span>864 votes (60.8%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                            style={{ width: resultsAnimated ? '60.8%' : '0%' }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>Chioma Nnamdi (Candidate 2)</span>
                          <span>556 votes (39.2%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-slate-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: resultsAnimated ? '39.2%' : '0%' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Audit Ledger Proof */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1 font-mono">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Integrity Ledger Hash</p>
                      <p className="text-slate-800 text-[11px] truncate">
                        SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-semibold">
                          Download CSV Audit Log
                        </span>
                        <span className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-semibold">
                          Print Official Certificate
                        </span>
                      </div>

                      <Link
                        href="/login"
                        className="btn-press px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>Access Results Portal</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Core Capabilities (2x2 Grid Layout) ────────────────────── */}
      <section id="capabilities" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="space-y-10">
          <ScrollReveal direction="down" delay={0}>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Institutional Governance Architecture
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Engineered for Absolute Transparency
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Four foundational pillars that ensure constitutional compliance, voter confidence, and verifiable integrity.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Capability 1 */}
            <ScrollReveal direction="up" delay={0}>
              <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all duration-200 h-full">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900">Multi-Position Unified Ballots</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Configure comprehensive elections with multiple executive offices (such as President, Vice President, Secretary) on one clean, unified ballot. Voters make selections across categories in a single streamlined session.
                </p>
              </div>
            </ScrollReveal>

            {/* Capability 2 */}
            <ScrollReveal direction="up" delay={80}>
              <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all duration-200 h-full">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900">Roster &amp; Whitelist Verification</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Protect elections by restricting ballot access to verified rosters. Administrators can enforce Student ID, Institutional Email, Phone Number, or Voter ID checks to prevent unauthorized submissions.
                </p>
              </div>
            </ScrollReveal>

            {/* Capability 3 */}
            <ScrollReveal direction="up" delay={160}>
              <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all duration-200 h-full">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900">Anonymized Secret Balloting</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Voter identity verification is strictly decoupled from recorded votes. Cryptographic sequence markers ensure complete voter anonymity while permanently preventing double-voting.
                </p>
              </div>
            </ScrollReveal>

            {/* Capability 4 */}
            <ScrollReveal direction="up" delay={240}>
              <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all duration-200 h-full">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  04
                </div>
                <h3 className="text-base font-bold text-slate-900">Verifiable CSV Audit Logs</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Download timestamped, anonymized audit ledgers for scrutiny by electoral committees, judicial boards, or academic councils. Print official certified tally reports with cryptographic verification seals.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Step-by-Step Election Process (01-04 Flow) ─────────────── */}
      <section id="process" className="py-16 bg-slate-100/70 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <ScrollReveal direction="down" delay={0}>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Implementation Lifecycle
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Four Simple Steps to Launch an Election
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                From ballot structure setup to final certified audit certification.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScrollReveal direction="up" delay={0}>
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all duration-200 h-full">
                <span className="text-xs font-mono font-bold text-blue-600">STEP 01</span>
                <h4 className="text-sm font-bold text-slate-900">Build Ballot Structure</h4>
                <p className="text-xs text-slate-600">
                  Define election title, office categories, candidate profiles, photos, and voting time windows.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={80}>
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all duration-200 h-full">
                <span className="text-xs font-mono font-bold text-blue-600">STEP 02</span>
                <h4 className="text-sm font-bold text-slate-900">Set Verification Rules</h4>
                <p className="text-xs text-slate-600">
                  Choose verification parameters and upload authorized voter rosters for whitelist enforcement.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={160}>
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all duration-200 h-full">
                <span className="text-xs font-mono font-bold text-blue-600">STEP 03</span>
                <h4 className="text-sm font-bold text-slate-900">Distribute Live Links</h4>
                <p className="text-xs text-slate-600">
                  Share short links and QR codes via email, WhatsApp, or physical polling station posters.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={240}>
              <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all duration-200 h-full">
                <span className="text-xs font-mono font-bold text-blue-600">STEP 04</span>
                <h4 className="text-sm font-bold text-slate-900">Audit &amp; Export Results</h4>
                <p className="text-xs text-slate-600">
                  Monitor live tallies, export official CSV audit reports, and generate formal certificates.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Use Cases Section ────────────────────────────────────────── */}
      <section id="use-cases" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="space-y-10">
          <ScrollReveal direction="down" delay={0}>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Deployment Sectors
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Trusted Across Diverse Organizations
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Tailored governance tools designed for student councils, academic institutions, and professional associations.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScrollReveal direction="up" delay={0}>
              <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all duration-200 h-full">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Education &amp; Campuses</span>
                <h3 className="text-base font-bold text-slate-900">Student Councils &amp; Faculty Elections</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Conduct high-turnout campus elections for Student Union Governments, Faculty associations, and departmental leadership with matriculation ID verification and zero vote duplication.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={100}>
              <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-all duration-200 h-full">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Professional Governance</span>
                <h3 className="text-base font-bold text-slate-900">Associations &amp; Trade Unions</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Run executive board elections, policy referendums, and branch leadership ballots with secure membership roster whitelists and immutable audit logs.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Campus Polling Center & Directions Integration ─────────── */}
      <section id="polling-station" className="py-16 bg-slate-100/70 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <ScrollReveal direction="down" delay={0}>
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Physical Oversight &amp; Polling Venues
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Campus Polling Station &amp; Support Hub Locator
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Find physical assistance venues, on-site ballot verification stations, and electoral commission helpdesks.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={80}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Station Selector List */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedStation('main')}
                  className={`btn-press w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedStation === 'main'
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
                      : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">Station A</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${selectedStation === 'main' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Active Hub
                    </span>
                  </div>
                  <h4 className="text-sm font-bold mt-1">Central University Auditorium</h4>
                  <p className={`text-xs mt-1 ${selectedStation === 'main' ? 'text-blue-100' : 'text-slate-500'}`}>
                    West Wing Hall 1 - Main Ballot Assistance Desk
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStation('tech')}
                  className={`btn-press w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedStation === 'tech'
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
                      : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">Station B</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${selectedStation === 'tech' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Active Hub
                    </span>
                  </div>
                  <h4 className="text-sm font-bold mt-1">Faculty of Engineering Complex</h4>
                  <p className={`text-xs mt-1 ${selectedStation === 'tech' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Block C Concourse - Digital Kiosk &amp; Verification
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStation('law')}
                  className={`btn-press w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedStation === 'law'
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
                      : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">Station C</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${selectedStation === 'law' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Active Hub
                    </span>
                  </div>
                  <h4 className="text-sm font-bold mt-1">Senate &amp; Governance Building</h4>
                  <p className={`text-xs mt-1 ${selectedStation === 'law' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Ground Floor Room 12 - Electoral Secretariat
                  </p>
                </button>
              </div>

              {/* Interactive Direction & Map Card */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                      Selected Venue Directions
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedStation === 'main'
                        ? 'Central University Auditorium (Main Campus)'
                        : selectedStation === 'tech'
                        ? 'Faculty of Engineering Complex (North Wing)'
                        : 'Senate & Governance Secretariat'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Hours: 08:00 - 18:00 WAT</span>
                </div>

                {/* Stylized Geometric Venue Map Layout */}
                <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 h-48 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0f172a" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#gridPattern)" />
                    </svg>
                  </div>

                  <div className="relative z-10 text-center space-y-2 max-w-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto text-xs font-bold animate-subtle-pulse">
                      P
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedStation === 'main'
                        ? 'Station A: Central Auditorium Plaza'
                        : selectedStation === 'tech'
                        ? 'Station B: Engineering North Hub'
                        : 'Station C: Electoral Secretariat Hall'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Accessible via Campus Ring Road. Verification tablets and accessibility assistance staff on-site.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-semibold text-slate-800 block">Accessibility Access</span>
                    <span className="text-slate-500 text-[11px]">Wheelchair ramps and digital screen-reader terminals available.</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="font-semibold text-slate-800 block">Verification Protocol</span>
                    <span className="text-slate-500 text-[11px]">Bring physical student ID card or institutional credential for entry.</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Interactive FAQ Section ──────────────────────────────────── */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="space-y-8">
          <ScrollReveal direction="down" delay={0}>
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Got Questions?
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Clear answers on voter confidentiality, anti-fraud algorithms, whitelist rosters, and PWA setup.
              </p>

              <div className="pt-3 max-w-md mx-auto">
                <input
                  type="text"
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                  placeholder="Search questions (e.g. whitelist, privacy, export)..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
                No matching questions found for &ldquo;{faqSearchQuery}&rdquo;.
              </div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <ScrollReveal key={index} direction="up" delay={index * 40}>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-colors hover:border-slate-300">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="btn-press w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                            {faq.category}
                          </span>
                          <h3 className="text-sm font-semibold text-slate-900">{faq.question}</h3>
                        </div>
                        <svg
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-blue-600' : ''
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── Social Sharing Hub ───────────────────────────────────────── */}
      <section className="py-12 bg-slate-100/70 border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <ScrollReveal direction="up" delay={0}>
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Spread the Word
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Share Ballotly with Your Organization and Electoral Committees
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="btn-press px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Share Platform</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPageUrl}
                className="btn-press px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{shareCopied ? 'Link Copied' : 'Copy Website URL'}</span>
              </button>

              <a
                href="https://twitter.com/intent/tweet?text=Run%20transparent,%20verified,%20and%20secure%20digital%20elections%20with%20Ballotly:%20https://ballotlyng.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-press px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
              >
                Share on X
              </a>

              <a
                href="https://api.whatsapp.com/send?text=Run%20transparent,%20verified,%20and%20secure%20digital%20elections%20with%20Ballotly:%20https://ballotlyng.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-press px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
              >
                Share on WhatsApp
              </a>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── High-Impact Closing Call to Action ──────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ScrollReveal direction="up" delay={0}>
          <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              Ready to Begin?
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Launch Your Next Institutional Election with Ballotly
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Create multi-category ballots, enforce verification rosters, and generate tamper-proof audit trails in minutes.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="btn-press w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Create a Poll</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/login"
                className="btn-press w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Organizer Sign In</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
