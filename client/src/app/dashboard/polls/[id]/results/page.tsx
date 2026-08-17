'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, BarChart3, Clock, Users, Lock, Printer, Download } from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
import { TableRowSkeleton } from '@/components/SkeletonLoader';

interface ResponseItem {
  id: string;
  voterEmail?: string;
  voterPhone?: string;
  studentId?: string;
  voterId?: string;
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

export default function AdminDetailedResultsPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params?.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (authToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls/${pollId}/admin-results`, {
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
  }, [pollId]);

  useEffect(() => {
    const token = localStorage.getItem('voting_admin_token');
    if (!token) { router.push('/login'); return; }
    fetchResults(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    csvContent += `OFFICIAL ELECTION AUDIT REPORT\n`;
    csvContent += `Poll Title,"${data.poll.title.replace(/"/g, '""')}"\n`;
    csvContent += `Generated Date,"${new Date().toLocaleString()}"\n`;
    csvContent += `Total Votes,${data.stats.totalVotes}\n\n`;

    csvContent += `CANDIDATE BREAKDOWN\n`;
    csvContent += `Option / Candidate,Vote Count,Percentage (%)\n`;
    data.stats.options.forEach((opt) => {
      csvContent += `"${opt.option.replace(/"/g, '""')}",${opt.count},${opt.percentage}%\n`;
    });

    csvContent += `\nANONYMIZED VOTER AUDIT LOG\n`;
    csvContent += `Voter Label,Choice,Timestamp\n`;
    data.responses.forEach((r, idx) => {
      csvContent += `"Voter ${idx + 1}","${r.selectedOption.replace(/"/g, '""')}","${new Date(r.timestamp).toLocaleString()}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ballotly-audit-${data.poll.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="app-card p-8 space-y-4">
          <div className="h-6 w-48 rounded skeleton-shimmer" />
          <TableRowSkeleton columns={3} />
          <TableRowSkeleton columns={3} />
          <TableRowSkeleton columns={3} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 print:hidden">
        <div className="app-card p-10 text-center max-w-md w-full space-y-4">
          <Lock className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-slate-800 text-sm font-semibold">{error || 'No election data available.'}</p>
          <div>
            <Link href="/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const winner = data.stats.options.reduce<{ option: string; count: number; percentage: number } | null>(
    (best, opt) => (!best || opt.count > best.count ? opt : best), null
  );

  return (
    <main className="min-h-screen px-4 py-10 print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:space-y-4">

        {/* Header - Hidden on Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Audit Certificate
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Audit Log
            </span>
          </div>
        </div>

        {/* Print Only Header Banner */}
        <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
          <h1 className="text-xl font-bold text-slate-900">Official Election Audit Certificate</h1>
          <p className="text-xs text-slate-500">Generated on {new Date().toLocaleString()}</p>
        </div>

        {/* Poll overview card */}
        <div className="app-card p-8 print:border print:shadow-none print:rounded-none print:p-4 space-y-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{data.poll.title}</h1>
          {data.poll.description && <p className="text-xs text-slate-500">{data.poll.description}</p>}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              {new Date(data.poll.expiresAt) > new Date() ? 'Active: closes' : 'Closed'}{' '}
              {new Date(data.poll.expiresAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <strong className="text-slate-800 font-mono">{data.stats.totalVotes}</strong> verified ballots
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${data.poll.isResultPublic ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
              {data.poll.isResultPublic ? 'Results Public' : 'Results Private'}
            </span>
          </div>
        </div>

        {/* Results breakdown */}
        <div className="app-card p-8 space-y-5 print:border print:shadow-none print:rounded-none print:p-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 print:hidden" />
            Candidate Vote Breakdown
          </h2>
          {data.stats.totalVotes === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6">No ballots have been submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {data.stats.options.map((opt) => (
                <div key={opt.option} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      {opt.option === winner?.option && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded print:border">WINNER</span>
                      )}
                      <span className="font-semibold text-slate-800">{opt.option}</span>
                    </div>
                    <span className="font-mono text-slate-700 font-bold">{opt.count} votes ({opt.percentage}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 print:border">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${opt.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anonymized voter audit log */}
        {data.responses.length > 0 && (
          <div className="app-card p-8 space-y-4 print:border print:shadow-none print:rounded-none print:p-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Anonymized Voter Audit Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="pb-3 pr-4 font-semibold">Voter Label</th>
                    <th className="pb-3 pr-4 font-semibold">Choice</th>
                    <th className="pb-3 font-semibold">Verification Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.responses.map((r, index) => (
                    <tr key={r.id || index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-slate-700">Voter {index + 1}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">{r.selectedOption}</td>
                      <td className="py-2.5 text-slate-500 font-mono">{new Date(r.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

