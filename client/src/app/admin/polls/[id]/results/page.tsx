'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, BarChart3, Clock, Users, RefreshCw, Lock } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface ResponseItem {
  id: string;
  studentId?: string;
  voterEmail?: string;
  selectedOption: string;
  timestamp: string;
}

interface ResultsData {
  poll: {
    id: string;
    title: string;
    description: string;
    isResultPublic: boolean;
    expiresAt: string;
    trackingMethod: string;
  };
  stats: {
    totalVotes: number;
    options: { option: string; count: number; percentage: number }[];
  };
  responses: ResponseItem[];
}

export default function DetailedResultsPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params?.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('voting_admin_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchResults(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  const fetchResults = async (authToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/polls/${pollId}/admin-results`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setData(resData);
      } else {
        setError(resData.error || 'Failed to load detailed poll results.');
      }
    } catch {
      setError('Failed to connect to backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-600" />
        <span>Loading detailed election results...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="glass-panel p-8 rounded-3xl border border-slate-200 max-w-md space-y-4">
          <Lock className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Access Restricted or Poll Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'Unable to retrieve election results.'}</p>
          <Link href="/admin/dashboard" className="inline-block py-2.5 px-4 bg-blue-600 text-white rounded-xl text-xs font-semibold">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      {/* Top Navbar */}
      <nav className="glass-panel border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="font-extrabold text-slate-900 text-lg block leading-none">Protected Results Analytics</span>
              <span className="text-xs text-slate-500">Admin Audit Trail & Response Logs</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${data.poll.isResultPublic ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {data.poll.isResultPublic ? 'Public Visibility' : 'Private Visibility'}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-8">
        {/* Title Header */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Campus Election</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">{data.poll.title}</h1>
          {data.poll.description && <p className="text-sm text-slate-600">{data.poll.description}</p>}

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-500 border-t border-slate-200">
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-4 h-4 text-blue-600" /> Total Votes Cast: <strong className="text-slate-900">{data.stats.totalVotes}</strong>
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-4 h-4 text-emerald-600" /> Expires: <strong className="text-slate-900">{new Date(data.poll.expiresAt).toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Candidate Percentage Distribution */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Vote Distribution Breakdown
          </h2>

          <div className="space-y-4">
            {data.stats.options.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-800">{item.option}</span>
                  <span className="text-blue-600">{item.percentage}% ({item.count} votes)</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Response Logs */}
        <div className="glass-panel rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg">Individual Response Audit Trail</h3>
            <p className="text-xs text-slate-500">Timestamped list of all recorded votes for this election poll.</p>
          </div>

          {data.responses.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No votes recorded yet for this poll.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Voter Identifiers</th>
                    <th className="px-6 py-4">Selected Option</th>
                    <th className="px-6 py-4">Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.responses.map((resp) => (
                    <tr key={resp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        {resp.studentId && <span className="font-mono text-xs font-semibold text-slate-900 block">ID: {resp.studentId}</span>}
                        {resp.voterEmail && <span className="text-xs text-slate-500 block">Email: {resp.voterEmail}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full text-xs border border-blue-200">
                          {resp.selectedOption}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(resp.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
