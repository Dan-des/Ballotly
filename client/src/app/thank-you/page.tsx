'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SocialShare from '@/components/SocialShare';
import BallotlyLogo from '@/components/BallotlyLogo';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const pollId = searchParams.get('pollId') || '';
  const pollTitle = searchParams.get('title') || 'Campus Election';
  const receiptId = searchParams.get('receipt') || '';
  const isPublic = searchParams.get('isPublic') === 'true';

  const [currentUrl, setCurrentUrl] = useState('');
  const [receiptCopied, setReceiptCopied] = useState(false);
  const [displayReceipt, setDisplayReceipt] = useState(receiptId || '');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(`${window.location.origin}/vote/${pollId}`);
    }
  }, [pollId]);

  useEffect(() => {
    if (!receiptId && pollId) {
      const stored = sessionStorage.getItem(`receipt_${pollId}`);
      if (stored) {
        setDisplayReceipt(stored);
      }
    }
  }, [pollId, receiptId]);

  return (
    <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="app-card max-w-lg w-full p-8 sm:p-10 space-y-8">
        <div className="flex justify-center">
          <BallotlyLogo size={52} />
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Ballot Successfully Recorded
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Thank You For Voting
          </h1>
          <p className="text-sm text-slate-500">
            Your vote for <span className="font-semibold text-slate-700">{pollTitle}</span> has been securely logged.
          </p>
        </div>

        {/* Cryptographic Receipt Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-500 border-b border-slate-200 pb-2">
            <span>Official Ballot Receipt</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-800 font-semibold">
                {displayReceipt}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(displayReceipt);
                  setReceiptCopied(true);
                  setTimeout(() => setReceiptCopied(false), 2000);
                }}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2 py-0.5 rounded transition-colors"
                title="Copy receipt identifier"
              >
                {receiptCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Verification Timestamp</span>
            <span className="text-slate-700 font-medium">{new Date().toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Status</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified &amp; Sealed
            </span>
          </div>
        </div>

        {/* Social Sharing Component */}
        {pollId && (
          <div className="pt-2 border-t border-slate-100">
            <SocialShare
              url={currentUrl}
              title={`I just voted in "${pollTitle}" on Ballotly!`}
              description={`Cast your ballot securely in ${pollTitle}.`}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          {isPublic && pollId && (
            <Link
              href={`/vote/${pollId}/live-results`}
              className="flex-1 py-2.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center"
            >
              View Live Results
            </Link>
          )}
          <Link
            href="/"
            className="flex-1 py-2.5 px-4 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-center"
          >
            Back to Portal
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="app-card max-w-lg w-full p-8 text-center text-sm text-slate-500">
          Loading verification receipt...
        </div>
      </main>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
