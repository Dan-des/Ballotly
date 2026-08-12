'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  Lock,
  Loader2,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Users,
  Trophy,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

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

// Colour palette for bars (cycles if more than 5 options)
const BAR_COLOURS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
];

export default function LiveResultsPage() {
  const params = useParams();
  const pollId = params?.pollId as string;

  const [stats, setStats] = useState<StatsData | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedMessage, setLockedMessage] = useState('');
  const [pollTitle, setPollTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pollRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/polls/${pollId}`),
        fetch(`${API_BASE_URL}/polls/${pollId}/stats`),
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </main>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel p-10 rounded-3xl text-center max-w-md w-full space-y-4">
          <p className="text-red-500 font-semibold">{error}</p>
          <button onClick={fetchStats} className="text-sm text-blue-600 underline">Try again</button>
        </div>
      </main>
    );
  }

  // ── Locked state ───────────────────────────────────────────────────────────
  if (locked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ballotly
            </span>
          </div>
          <div className="glass-panel p-10 rounded-3xl text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10 text-slate-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 mb-2">Results Viewing Currently Locked</h1>
              {pollTitle && <p className="text-xs font-semibold text-blue-600 mb-3">{pollTitle}</p>}
              <p className="text-sm text-slate-500 leading-relaxed">
                {lockedMessage || 'The organizer has set live results to private for this poll. Results will only become visible once enabled by the organizer or after the election closes.'}
              </p>
            </div>
            <Link
              href={`/vote/${pollId}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              <ArrowLeft className="w-4 h-4" />
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

        {/* Badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ballotly — Live Results
          </span>
        </div>

        {/* Header card */}
        <div className="glass-panel p-8 rounded-3xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{stats.pollTitle}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {stats.isExpired ? 'This poll has closed — final results below.' : 'Live standings update in real-time.'}
              </p>
            </div>
            <button
              onClick={fetchStats}
              className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 transition-all shrink-0"
              title="Refresh results"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Summary stats */}
          <div className="flex gap-3">
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-blue-500 font-semibold">Total Votes</p>
                <p className="text-2xl font-extrabold text-blue-700">{stats.totalVotes.toLocaleString()}</p>
              </div>
            </div>
            {leader && stats.totalVotes > 0 && (
              <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs text-emerald-600 font-semibold">Leading Option</p>
                  <p className="text-sm font-bold text-emerald-800 leading-tight">{leader.option}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results bars */}
        <div className="glass-panel p-8 rounded-3xl space-y-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Vote Distribution</h2>
          </div>
          {stats.totalVotes === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No votes have been cast yet.</p>
          ) : (
            <div className="space-y-4">
              {stats.options
                .sort((a, b) => b.count - a.count)
                .map((opt, i) => (
                  <div key={opt.option} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {opt.option === leader?.option && stats.totalVotes > 0 && (
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className="text-sm font-semibold text-slate-800">{opt.option}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{opt.count} votes</span>
                        <span className="text-sm font-bold text-blue-700">{opt.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${BAR_COLOURS[i % BAR_COLOURS.length]}`}
                        style={{ width: `${opt.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href={`/vote/${pollId}`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Voting Page
          </Link>
        </div>

      </div>
    </main>
  );
}
