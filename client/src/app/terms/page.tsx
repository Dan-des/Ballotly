import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Ballotly',
  description: 'Review the terms, institutional standards, and fair voting regulations governing the Ballotly election platform.',
};

export default function TermsOfServicePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 mb-4"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Terms of Service</h1>
        <p className="text-sm text-slate-500 mt-1">
          Effective Date: August 17, 2026 | Version 2.0
        </p>
      </div>

      <div className="app-card p-8 sm:p-10 space-y-8 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or utilizing Ballotly to create, manage, or participate in elections, governance polls, or student council voting, you agree to be bound by these Terms of Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Election Integrity and Fair Voting</h2>
          <p>
            Organizers agree to configure accurate candidate rosters and legitimate voter whitelists. Any intentional manipulation of voter identification lists, unauthorized automated script submissions, or attempts to bypass deduplication controls is strictly prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. Administrative Authority and Poll Lifecycles</h2>
          <p>
            Administrators are responsible for setting appropriate election start times, expiration schedules, and result visibility settings (public vs. private). Active polls cannot be modified once closed to preserve election audit finality.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Limitation of Liability</h2>
          <p>
            Ballotly provides voting infrastructure on an as-is basis. While the platform utilizes fault-tolerant database clusters and cryptographic deduplication, administrators must ensure their whitelist rosters adhere to their institution’s constitutional election bylaws.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">5. Modifications to Service</h2>
          <p>
            Ballotly reserves the right to update or enhance voting security features. Material updates to service terms will be reflected with an updated effective date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">6. Inquiries and Compliance</h2>
          <p>
            For compliance verifications or election governance inquiries, contact <strong>legal@ballotly.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
