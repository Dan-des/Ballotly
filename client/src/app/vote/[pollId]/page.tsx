'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  Clock,
  Calendar,
  Hash,
  CreditCard,
  BarChart3,
  Lock,
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
import { BallotFormSkeleton } from '@/components/SkeletonLoader';
import ScrollReveal from '@/components/ScrollReveal';

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

function getTrackingInfo(method: string | undefined) {
  const m = String(method || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const needsEmail = m.includes('email') || m === 'both';
  const needsPhone = m.includes('phone');
  const needsStudentId = m.includes('student') || m.includes('studentid') || m === 'both';
  const needsVoterId = m.includes('voter');
  const isNone = m === 'none';
  const isConfigured = !isNone && (needsEmail || needsPhone || needsStudentId || needsVoterId);

  let label = 'IDENTITY VERIFICATION';
  if (needsEmail && needsPhone) label = 'IDENTITY VERIFICATION: Email & Phone Number';
  else if (needsEmail && needsStudentId) label = 'IDENTITY VERIFICATION: Email & Student ID';
  else if (needsEmail) label = 'IDENTITY VERIFICATION: Email Address';
  else if (needsPhone) label = 'IDENTITY VERIFICATION: Phone Number';
  else if (needsStudentId) label = 'IDENTITY VERIFICATION: Student / Matriculation ID';
  else if (needsVoterId) label = 'IDENTITY VERIFICATION: Voter / Membership ID';

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

function formatStartCountdown(startsAt: string) {
  const diff = new Date(startsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isStarted: true };
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    isStarted: false,
  };
}

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
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

  const [timeLeft, setTimeLeft] = useState(formatCountdown(''));
  const [startsLeft, setStartsLeft] = useState(formatStartCountdown(''));

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
        if (data.poll.startsAt) {
          setStartsLeft(formatStartCountdown(data.poll.startsAt));
        }
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
      if (poll.startsAt) {
        setStartsLeft(formatStartCountdown(poll.startsAt));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!poll) return;

    const trackingInfo = getTrackingInfo(poll.trackingMethod);

    // Client-side Validation
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
        const receiptId = data.data?.id || `REC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        router.push(`/thank-you?pollId=${poll.id}&title=${encodeURIComponent(poll.title)}&receipt=${receiptId}&isPublic=${poll.isResultPublic}`);
      }
    } catch {
      setErrorMessage('Unable to connect to voting server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading with Skeleton ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-16">
        <BallotFormSkeleton />
      </main>
    );
  }

  if (notFound || !poll) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="app-card p-10 text-center max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Poll Not Found</h1>
          <p className="text-slate-500 text-xs">This election link is invalid or has been concluded.</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block py-2 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const trackingInfo = getTrackingInfo(poll.trackingMethod);
  const isUpcoming = Boolean(poll.startsAt && !startsLeft.isStarted && new Date(poll.startsAt).getTime() > Date.now());
  const isClosed = !isUpcoming && (timeLeft.isClosed || poll.isExpired);

  // ── Main ballot ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Platform badge */}
        <div className="text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 mb-2 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Ballotly Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
            Official Ballotly Election
          </span>
        </div>

        {/* Poll header */}
        <ScrollReveal direction="down" delay={40}>
          <div className="app-card p-8 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{poll.title}</h1>
              {poll.description && (
                <p className="text-slate-600 text-sm leading-relaxed mt-1">{poll.description}</p>
              )}
            </div>

            {/* Countdown */}
            {isUpcoming ? (
              <div className="flex items-center gap-2 text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0 icon-tilt" />
                <span>
                  Voting Opens in{' '}
                  <strong className="text-indigo-950 font-mono">
                    {startsLeft.days > 0 && `${startsLeft.days}d `}
                    {String(startsLeft.hours).padStart(2, '0')}h{' '}
                    {String(startsLeft.minutes).padStart(2, '0')}m{' '}
                    {String(startsLeft.seconds).padStart(2, '0')}s
                  </strong>{' '}
                  ({new Date(poll.startsAt).toLocaleString()})
                </span>
              </div>
            ) : !isClosed ? (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Election Closes in{' '}
                  <strong className="text-slate-900 font-mono">
                    {timeLeft.days > 0 && `${timeLeft.days}d `}
                    {String(timeLeft.hours).padStart(2, '0')}h{' '}
                    {String(timeLeft.minutes).padStart(2, '0')}m{' '}
                    {String(timeLeft.seconds).padStart(2, '0')}s
                  </strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold">This poll has closed. Voting is no longer accepted.</span>
              </div>
            )}

            {/* Whitelist restriction badge */}
            {poll.requireWhitelist && (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Restricted Election:</strong> Voting is limited to authorized individuals on the pre-approved whitelist roster.
                </span>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Scheduled Preview notice if upcoming */}
        {isUpcoming && (
          <ScrollReveal direction="up" delay={80}>
            <div className="app-card p-6 text-center space-y-2 border-indigo-200 bg-indigo-50/40">
              <Calendar className="w-8 h-8 text-indigo-600 mx-auto icon-tilt" />
              <h2 className="text-sm font-bold text-indigo-950">Election Scheduled for Later</h2>
              <p className="text-xs text-indigo-800 max-w-md mx-auto leading-relaxed">
                This election is scheduled to open for voting on <strong>{new Date(poll.startsAt).toLocaleString()}</strong>.
                Please check back at that time to cast your ballot.
              </p>
            </div>
          </ScrollReveal>
        )}

        {/* Ballot form */}
        {!isClosed && !isUpcoming && (
          <ScrollReveal direction="up" delay={100}>
            <form onSubmit={handleSubmit} className="app-card p-8 space-y-6">
              {/* Dynamic Identity Verification Section */}
              {trackingInfo.isConfigured && (
                <div className="space-y-4 pb-4 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {trackingInfo.label}
                  </p>

                  {trackingInfo.needsEmail && (
                    <div>
                      <label htmlFor="voterEmail" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Email Address *
                      </label>
                      <div className="relative input-with-icon">
                        <input
                          id="voterEmail"
                          type="email"
                          value={voterEmail}
                          onChange={(e) => setVoterEmail(e.target.value)}
                          placeholder="your.email@university.edu"
                          className="w-full app-input px-4 py-2.5 pl-11 text-sm"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
                      </div>
                    </div>
                  )}

                  {trackingInfo.needsPhone && (
                    <div>
                      <label htmlFor="voterPhone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Phone Number *
                      </label>
                      <div className="relative input-with-icon">
                        <input
                          id="voterPhone"
                          type="tel"
                          value={voterPhone}
                          onChange={(e) => setVoterPhone(e.target.value)}
                          placeholder="+1 234 567 8900"
                          className="w-full app-input px-4 py-2.5 pl-11 text-sm"
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
                      </div>
                    </div>
                  )}

                  {trackingInfo.needsStudentId && (
                    <div>
                      <label htmlFor="studentId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Student / Matriculation ID *
                      </label>
                      <div className="relative input-with-icon">
                        <input
                          id="studentId"
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g. CSC/2021/001"
                          className="w-full app-input px-4 py-2.5 pl-11 text-sm uppercase font-mono"
                        />
                        <Hash className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
                      </div>
                    </div>
                  )}

                  {trackingInfo.needsVoterId && (
                    <div>
                      <label htmlFor="voterId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Voter / Membership ID *
                      </label>
                      <div className="relative input-with-icon">
                        <input
                          id="voterId"
                          type="text"
                          value={voterId}
                          onChange={(e) => setVoterId(e.target.value)}
                          placeholder="e.g. MEM-2026-0099"
                          className="w-full app-input px-4 py-2.5 pl-11 text-sm"
                        />
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Voting Options / Categories */}
              {poll.categories && poll.categories.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cast Your Ballot Across All Positions
                  </p>
                  {poll.categories.map((cat) => (
                    <div key={cat.title} className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                      <h3 className="font-bold text-sm text-slate-900">
                        Position: {cat.title}
                      </h3>
                      <div className="space-y-2">
                        {cat.options.map((opt) => (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                              categorySelections[cat.title] === opt
                                ? 'border-blue-600 bg-blue-50/50 font-semibold text-blue-900 shadow-sm scale-[1.01]'
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`cat-${cat.title}`}
                              value={opt}
                              checked={categorySelections[cat.title] === opt}
                              onChange={() => setCategorySelections((prev) => ({ ...prev, [cat.title]: opt }))}
                              className="accent-blue-600 w-4 h-4 shrink-0"
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
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Candidate</p>
                  {poll.options.map((option) => (
                    <label
                      key={option}
                      htmlFor={`option-${option}`}
                      className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                        selectedOption === option
                          ? 'border-blue-600 bg-blue-50/50 font-semibold text-blue-900 shadow-sm scale-[1.01]'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
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
                      <span className="text-sm text-slate-800">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Error */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-press w-full py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Ballot'
                )}
              </button>
            </form>
          </ScrollReveal>
        )}

        {/* Live results link */}
        {poll.isResultPublic && (
          <div className="text-center pt-2">
            <Link
              href={`/vote/${pollId}/live-results`}
              className="btn-press inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              View Live Results
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}

