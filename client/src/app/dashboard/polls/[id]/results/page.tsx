'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, BarChart3, Clock, Users, RefreshCw, Lock, Printer, Download } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

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
      <div className="min-h-screen flex items-center justify-center text-slate-500 print:hidden">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
          <span className="text-sm font-medium">Loading audit results...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 print:hidden">
        <div className="glass-panel p-10 rounded-3xl text-center max-w-md w-full space-y-4">
          <Lock className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-slate-700 font-semibold">{error || 'No data available.'}</p>
          <Link href="/dashboard" className="text-sm text-blue-600 underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const winner = data.stats.options.reduce<{ option: string; count: number; percentage: number } | null>(
    (best, opt) => (!best || opt.count > best.count ? opt : best), null
  );

  return (
    <main className="min-h-screen px-4 py-10 bg-slate-50 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:space-y-4">

        {/* Header - Hidden on Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-indigo-600 font-bold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Report
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Audit Log
            </span>
          </div>
        </div>

        {/* Print Only Header Banner */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <h1 className="text-xl font-bold text-slate-900">Official Election Audit Report</h1>
          <p className="text-xs text-slate-500">Generated on {new Date().toLocaleString()}</p>
        </div>

        {/* Poll overview card */}
        <div className="glass-panel p-8 rounded-3xl print:border print:shadow-none print:rounded-none print:p-4">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{data.poll.title}</h1>
          {data.poll.description && <p className="text-sm text-slate-500 mb-4">{data.poll.description}</p>}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date(data.poll.expiresAt) > new Date() ? 'Active — closes' : 'Closed'}{' '}
              {new Date(data.poll.expiresAt).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <strong className="text-slate-700">{data.stats.totalVotes}</strong> total votes
            </span>
            <span className={`px-2.5 py-1 rounded-full font-semibold ${data.poll.isResultPublic ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
              {data.poll.isResultPublic ? 'Results Public' : 'Results Private'}
            </span>
          </div>
        </div>

        {/* Results breakdown */}
        <div className="glass-panel p-8 rounded-3xl space-y-5 print:border print:shadow-none print:rounded-none print:p-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 print:hidden" />
            Result Breakdown
          </h2>
          {data.stats.totalVotes === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No votes have been cast yet.</p>
          ) : (
            <div className="space-y-4">
              {data.stats.options.map((opt, i) => (
                <div key={opt.option} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {opt.option === winner?.option && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full print:border">WINNER</span>
                      )}
                      <span className="text-sm font-semibold text-slate-800">{opt.option}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-700">{opt.count} votes ({opt.percentage}%)</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden print:border">
                    <div
                      className={`h-full rounded-full ${['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'][i % 5]}`}
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
          <div className="glass-panel p-8 rounded-3xl space-y-4 print:border print:shadow-none print:rounded-none print:p-4">
            <h2 className="text-base font-bold text-slate-800">Anonymized Voter Audit Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider border-b">
                    <th className="pb-3 pr-4 font-semibold">Voter Label</th>
                    <th className="pb-3 pr-4 font-semibold">Choice</th>
                    <th className="pb-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.responses.map((r, index) => (
                    <tr key={r.id || index} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-slate-700">Voter {index + 1}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-800">{r.selectedOption}</td>
                      <td className="py-2.5 text-slate-400">{new Date(r.timestamp).toLocaleString()}</td>
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
