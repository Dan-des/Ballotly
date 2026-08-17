'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  Lock,
  RefreshCw,
  ArrowLeft,
  Users,
  Trophy,
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
import { BallotFormSkeleton } from '@/components/SkeletonLoader';
import SocialShare from '@/components/SocialShare';

interface StatsOption {
  option: string;
  count: number;
  percentage: number;
}

interface StatsData {
  pollTitle: string;
  totalVotes: number;
  isResultPublic: boolean;
  isExpired: boolean;
  options: StatsOption[];
}

export default function LiveResultsPage() {
  const params = useParams();
  const pollId = params?.pollId as string;

  const [stats, setStats] = useState<StatsData | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedMessage, setLockedMessage] = useState('');
  const [pollTitle, setPollTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pollRes, statsRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/polls/${pollId}`),
        fetch(`${getApiBaseUrl()}/polls/${pollId}/stats`),
      ]);

      if (!pollRes.ok || !statsRes.ok) {
        setError('Failed to load poll details or results.');
        return;
      }

      const pollData = await pollRes.json();
      const statsData = await statsRes.json();

      if (!pollData.success || !statsData.success) {
        setError(pollData.error || statsData.error || 'Failed to load poll details.');
        return;
      }

      const poll = pollData.poll;
      setPollTitle(poll.title || '');

      const isLocked = !poll.isResultPublic && new Date(poll.expiresAt) > new Date();

      if (isLocked || statsData.locked) {
        setLocked(true);
        setLockedMessage(
          'The organizer has set live results to private for this poll. Results will only become visible once enabled by the organizer or after the election closes.'
        );
      } else {
        setLocked(false);
        setStats(statsData.stats);
      }
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  }, [pollId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const leader = stats?.options.reduce<StatsOption | null>(
    (best, opt) => (!best || opt.count > best.count ? opt : best), null
  );

  // ── Loading with Skeleton ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-16">
        <BallotFormSkeleton />
      </main>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="app-card p-8 text-center max-w-md w-full space-y-4">
          <p className="text-red-600 text-xs font-semibold">{error}</p>
          <button
            onClick={fetchStats}
            className="py-2 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // ── Locked state ───────────────────────────────────────────────────────────
  if (locked) {
    return (
      <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="app-card p-8 sm:p-10 text-center max-w-md w-full space-y-6">
          <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Results Currently Private</h1>
            {pollTitle && <p className="text-xs font-semibold text-blue-600">{pollTitle}</p>}
            <p className="text-xs text-slate-500 leading-relaxed">
              {lockedMessage || 'The organizer has set live results to private for this poll. Results will only become visible once enabled by the organizer or after the election closes.'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <Link
              href={`/vote/${pollId}`}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Voting Page
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Full results ───────────────────────────────────────────────────────────
  if (!stats) return null;

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
            Live Election Standings
          </span>
        </div>

        {/* Header card */}
        <div className="app-card p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{stats.pollTitle}</h1>
              <p className="text-xs text-slate-500 mt-1">
                {stats.isExpired ? 'This poll has closed. Final verified results below.' : 'Live standings update in real time.'}
              </p>
            </div>
            <button
              onClick={fetchStats}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
              title="Refresh results"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Votes Cast</p>
                <p className="text-2xl font-bold text-slate-900 font-mono">{stats.totalVotes.toLocaleString()}</p>
              </div>
            </div>
            {leader && stats.totalVotes > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs text-emerald-800 font-semibold uppercase">Leading Candidate</p>
                  <p className="text-sm font-bold text-emerald-950 truncate">{leader.option}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results bars */}
        <div className="app-card p-8 space-y-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Vote Distribution</h2>
          </div>
          {stats.totalVotes === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6">No votes have been recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {stats.options
                .sort((a, b) => b.count - a.count)
                .map((opt) => (
                  <div key={opt.option} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        {opt.option === leader?.option && stats.totalVotes > 0 && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                        <span className="text-slate-800">{opt.option}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-500 font-normal">{opt.count} votes</span>
                        <span className="text-blue-700 font-bold">{opt.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${opt.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Social Share Box */}
        {currentUrl && (
          <div className="app-card p-6">
            <SocialShare
              url={currentUrl}
              title={`Live Standings: "${stats.pollTitle}" on Ballotly`}
              description={`Track verified live election standings for ${stats.pollTitle}.`}
            />
          </div>
        )}

        {/* Back link */}
        <div className="text-center pt-2">
          <Link
            href={`/vote/${pollId}`}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Ballot Page
          </Link>
        </div>

      </div>
    </main>
  );
}

