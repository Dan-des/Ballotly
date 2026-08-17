import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Ballotly',
  description: 'Learn how Ballotly protects voter anonymity, encrypts ballot submissions, and manages institutional election data.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 mb-4"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mt-1">
          Effective Date: August 17, 2026 | Version 2.0
        </p>
      </div>

      <div className="app-card p-8 sm:p-10 space-y-8 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Overview and Core Commitment</h2>
          <p>
            Ballotly is committed to safeguarding voter privacy and data confidentiality. Our architecture is designed with a fundamental separation between voter verification records and cast ballot choices to guarantee voter secrecy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Voter Secrecy and Cryptographic Anonymity</h2>
          <p>
            When an election utilizes an identity tracking method (such as Student ID, Email, Phone Number, or Voter ID), the identifier is used solely to verify eligibility and prevent double-voting. The ballot selection is encrypted and stored in a manner that prevents linking specific voter identities to their specific candidate selections in public reports.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. Information Collected</h2>
          <div className="space-y-2">
            <p><strong>Organizer Account Information:</strong> Name, administrative email address, encrypted password hash, and OAuth authentication identifiers provided via Google Sign In.</p>
            <p><strong>Voter Verification Data:</strong> Provided student identifiers, email addresses, or phone numbers strictly as defined by the election administrator for whitelist enforcement.</p>
            <p><strong>System Audit Telemetry:</strong> Timestamp of vote submission and anonymized voter sequencing numbers for audit log verification.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Data Retention and Account Deletion</h2>
          <p>
            Organizers maintain full authority over their election data. When an administrator initiates account deletion via the dashboard, all associated polls, whitelist rosters, and vote records are permanently purged from persistent database clusters within 24 hours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">5. Third-Party Infrastructure</h2>
          <p>
            Ballotly utilizes secure global cloud infrastructure providers, including MongoDB Atlas (encrypted database storage) and transactional mail delivery relays (Brevo and Resend), adhering to SOC 2 and GDPR compliance standards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">6. Contact and Privacy Rights</h2>
          <p>
            For questions regarding election privacy protocols or data processing agreements, contact our data protection team at <strong>privacy@ballotly.com</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
