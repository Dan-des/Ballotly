'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Vote as VoteIcon,
  Mail,
  Phone,
  Clock,
  Hash,
  CreditCard,
  BarChart3,
  ArrowRight,
  LockIcon,
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

interface Poll {
  id: string;
  title: string;
  description: string;
  options: string[];
  categories?: { title: string; options: string[] }[];
  trackingMethod: string;
  isResultPublic: boolean;
  requireWhitelist?: boolean;
  startsAt: string;
  expiresAt: string;
  isExpired: boolean;
  voteCount: number;
}

interface SubmittedVote {
  id: string;
  selectedOption: string;
  timestamp: string;
}

function getTrackingInfo(method: string | undefined) {
  const m = String(method || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const needsEmail = m.includes('email') || m === 'both';
  const needsPhone = m.includes('phone');
  const needsStudentId = m.includes('student') || m.includes('studentid') || m === 'both';
  const needsVoterId = m.includes('voter');
  const isNone = m === 'none';
  const isConfigured = !isNone && (needsEmail || needsPhone || needsStudentId || needsVoterId);

  let label = 'IDENTITY VERIFICATION';
  if (needsEmail && needsPhone) label = 'IDENTITY VERIFICATION — Email & Phone Number';
  else if (needsEmail && needsStudentId) label = 'IDENTITY VERIFICATION — Email & Student ID';
  else if (needsEmail) label = 'IDENTITY VERIFICATION — Email Address';
  else if (needsPhone) label = 'IDENTITY VERIFICATION — Phone Number';
  else if (needsStudentId) label = 'IDENTITY VERIFICATION — Student / Matriculation ID';
  else if (needsVoterId) label = 'IDENTITY VERIFICATION — Voter / Membership ID';

  return { normalized: m, needsEmail, needsPhone, needsStudentId, needsVoterId, isConfigured, label };
}

function formatCountdown(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isClosed: true };
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    isClosed: false,
  };
}

export default function VotePage() {
  const params = useParams();
  const pollId = params?.pollId as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form inputs
  const [selectedOption, setSelectedOption] = useState('');
  const [categorySelections, setCategorySelections] = useState<{ [catTitle: string]: string }>({});
  const [voterEmail, setVoterEmail] = useState('');
  const [voterPhone, setVoterPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [voterId, setVoterId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVote, setSuccessVote] = useState<SubmittedVote | null>(null);

  const [timeLeft, setTimeLeft] = useState(formatCountdown(''));

  // Load poll data
  const fetchPoll = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls/${pollId}`);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      if (data.success && data.poll) {
        setPoll(data.poll);
        setTimeLeft(formatCountdown(data.poll.expiresAt));
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [pollId]);

  useEffect(() => { fetchPoll(); }, [fetchPoll]);

  // Countdown ticker
  useEffect(() => {
    if (!poll) return;
    const interval = setInterval(() => {
      setTimeLeft(formatCountdown(poll.expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!poll) return;

    const trackingInfo = getTrackingInfo(poll.trackingMethod);

    // Dynamic Client-side Validation
    if (trackingInfo.needsEmail) {
      if (!voterEmail.trim()) return setErrorMessage('Email address is required.');
      if (!EMAIL_REGEX.test(voterEmail.trim())) return setErrorMessage('Please enter a valid email address.');
    }
    if (trackingInfo.needsPhone) {
      if (!voterPhone.trim()) return setErrorMessage('Phone number is required.');
      if (!PHONE_REGEX.test(voterPhone.trim())) return setErrorMessage('Please enter a valid phone number.');
    }
    if (trackingInfo.needsStudentId) {
      if (!studentId.trim()) return setErrorMessage('Student / Matriculation ID is required.');
    }
    if (trackingInfo.needsVoterId) {
      if (!voterId.trim()) return setErrorMessage('Voter / Membership ID is required.');
    }
    const isCategoryPoll = Boolean(poll.categories && poll.categories.length > 0);

    if (isCategoryPoll) {
      for (const cat of poll.categories!) {
        if (!categorySelections[cat.title]) {
          return setErrorMessage(`Please select a candidate for position: "${cat.title}".`);
        }
      }
    } else {
      if (!selectedOption) return setErrorMessage('Please select a voting option.');
    }

    const payloadSelections = isCategoryPoll
      ? Object.entries(categorySelections).map(([title, sel]) => ({
          categoryTitle: title,
          selectedOption: sel,
        }))
      : undefined;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          selectedOption: !isCategoryPoll ? selectedOption : undefined,
          categorySelections: payloadSelections,
          voterEmail: voterEmail.trim() || undefined,
          email: voterEmail.trim() || undefined,
          voterPhone: voterPhone.trim() || undefined,
          phone: voterPhone.trim() || undefined,
          studentId: studentId.trim() || undefined,
          student_id: studentId.trim() || undefined,
          voterId: voterId.trim() || undefined,
          voter_id: voterId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Vote submission failed.');
      } else {
        setSuccessVote(data.data);
        setPoll((p) => p ? { ...p, voteCount: p.voteCount + 1 } : p);
      }
    } catch {
      setErrorMessage('Unable to connect to voting server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </main>
    );
  }

  if (notFound || !poll) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel p-10 rounded-3xl text-center max-w-md w-full">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Poll Not Found</h1>
          <p className="text-slate-500 text-sm">This poll link is invalid or has been removed.</p>
        </div>
      </main>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (successVote) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="glass-panel p-10 rounded-3xl max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Vote Submitted!</h1>
            <p className="text-slate-500 text-sm">Your vote has been securely recorded.</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-left space-y-1">
            <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider">Your Choice</p>
            <p className="text-slate-800 font-semibold">{successVote.selectedOption}</p>
            <p className="text-xs text-slate-400">{new Date(successVote.timestamp).toLocaleString()}</p>
          </div>
          <Link
            href={`/vote/${pollId}/live-results`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
          >
            <BarChart3 className="w-4 h-4" />
            View Live Results
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    );
  }

  const trackingInfo = getTrackingInfo(poll.trackingMethod);
  const isClosed = timeLeft.isClosed || poll.isExpired;

  // ── Main ballot ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Platform badge */}
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-0.5 shadow-lg shadow-indigo-500/10 mb-2 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ballotly Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold">
            Ballotly Secure Ballot
          </span>
        </div>

        {/* Poll header */}
        <div className="glass-panel p-8 rounded-3xl">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{poll.title}</h1>
          {poll.description && <p className="text-slate-500 text-sm leading-relaxed mb-4">{poll.description}</p>}

          {/* Countdown */}
          {!isClosed ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                Closes in{' '}
                <span className="font-bold text-blue-700">
                  {timeLeft.days > 0 && `${timeLeft.days}d `}
                  {String(timeLeft.hours).padStart(2, '0')}h{' '}
                  {String(timeLeft.minutes).padStart(2, '0')}m{' '}
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <LockIcon className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold text-red-600">This poll has closed. Voting is no longer accepted.</span>
            </div>
          )}

          {/* Whitelist restriction badge */}
          {poll.requireWhitelist && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
              <LockIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Restricted Election:</strong> Voting is limited to authorized voters on the official whitelist.
              </span>
            </div>
          )}
        </div>

        {/* Ballot form */}
        {!isClosed && (
          <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl space-y-6">
            {/* Dynamic Identity Verification Section */}
            {trackingInfo.isConfigured && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {trackingInfo.label}
                </p>

                {trackingInfo.needsEmail && (
                  <div>
                    <label htmlFor="voterEmail" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        id="voterEmail"
                        type="email"
                        value={voterEmail}
                        onChange={(e) => setVoterEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full glass-input rounded-2xl px-4 py-3 pl-11 text-sm"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    </div>
                  </div>
                )}

                {trackingInfo.needsPhone && (
                  <div>
                    <label htmlFor="voterPhone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <input
                        id="voterPhone"
                        type="tel"
                        value={voterPhone}
                        onChange={(e) => setVoterPhone(e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="w-full glass-input rounded-2xl px-4 py-3 pl-11 text-sm"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    </div>
                  </div>
                )}

                {trackingInfo.needsStudentId && (
                  <div>
                    <label htmlFor="studentId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Student / Matriculation ID *
                    </label>
                    <div className="relative">
                      <input
                        id="studentId"
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. CSC/2021/001"
                        className="w-full glass-input rounded-2xl px-4 py-3 pl-11 text-sm uppercase"
                      />
                      <Hash className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    </div>
                  </div>
                )}

                {trackingInfo.needsVoterId && (
                  <div>
                    <label htmlFor="voterId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Voter / Membership ID *
                    </label>
                    <div className="relative">
                      <input
                        id="voterId"
                        type="text"
                        value={voterId}
                        onChange={(e) => setVoterId(e.target.value)}
                        placeholder="e.g. MEM-2024-0099"
                        className="w-full glass-input rounded-2xl px-4 py-3 pl-11 text-sm"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Voting Options / Categories */}
            {poll.categories && poll.categories.length > 0 ? (
              <div className="space-y-6">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cast Your Ballot Across All Positions
                </p>
                {poll.categories.map((cat) => (
                  <div key={cat.title} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <VoteIcon className="w-4 h-4 text-indigo-600" />
                      Position: {cat.title}
                    </h3>
                    <div className="space-y-2">
                      {cat.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            categorySelections[cat.title] === opt
                              ? 'border-indigo-500 bg-indigo-50/70 font-semibold text-indigo-950'
                              : 'border-slate-200 bg-white hover:border-indigo-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`cat-${cat.title}`}
                            value={opt}
                            checked={categorySelections[cat.title] === opt}
                            onChange={() => setCategorySelections((prev) => ({ ...prev, [cat.title]: opt }))}
                            className="accent-indigo-600 w-4 h-4 shrink-0"
                          />
                          <span className="text-xs">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cast Your Vote</p>
                {poll.options.map((option) => (
                  <label
                    key={option}
                    htmlFor={`option-${option}`}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedOption === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <input
                      id={`option-${option}`}
                      type="radio"
                      name="vote-option"
                      value={option}
                      checked={selectedOption === option}
                      onChange={() => setSelectedOption(option)}
                      className="accent-blue-600 w-4 h-4 shrink-0"
                    />
                    <div className="flex items-center gap-2">
                      <VoteIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-800">{option}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Error */}
            {errorMessage && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <VoteIcon className="w-5 h-5" />
                  Submit My Vote
                </>
              )}
            </button>
          </form>
        )}

        {/* Live results link */}
        <div className="text-center">
          <Link
            href={`/vote/${pollId}/live-results`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            View Live Results
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </main>
  );
}
