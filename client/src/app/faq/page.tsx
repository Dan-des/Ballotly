import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Ballotly',
  description: 'Find answers to common questions regarding voter verification, ballot secrecy, whitelist rosters, audit logs, and PWA installation.',
};

const faqs = [
  {
    question: 'How does Ballotly verify voters and prevent double voting?',
    answer:
      'Ballotly uses dynamic tracking methods chosen by the election administrator (such as Student ID, Email, Phone Number, or Voter ID). When a ballot is submitted, the platform verifies the identifier and records a cryptographic deduplication record. Any subsequent attempt to submit with the same identifier is blocked.',
  },
  {
    question: 'Are voter choices completely secret and confidential?',
    answer:
      'Yes. Voter identification is used exclusively for eligibility verification. The ballot choices are recorded with anonymized sequence labels in the audit log, preventing administrators or third parties from connecting a specific voter to their chosen candidate.',
  },
  {
    question: 'How does the Restricted Voter Whitelist work?',
    answer:
      'When an administrator enables "Require Whitelist", only voters whose email, phone, or Student ID is listed in the pre-approved roster can cast a ballot. Unregistered or unauthorized individuals are rejected with an explicit verification notice.',
  },
  {
    question: 'What tracking methods can an organizer select?',
    answer:
      'Ballotly supports six verification models: Email Address only, Phone Number only, Email + Phone (both required), Student / Matriculation ID, Email + Student ID, and Custom Voter / Membership ID.',
  },
  {
    question: 'How do Multi-Position Category Elections work?',
    answer:
      'Organizers can create elections featuring multiple offices on a single ballot (for example: President, Vice President, General Secretary). Voters make one choice per category and submit their unified ballot in a single streamlined submission.',
  },
  {
    question: 'How can administrators export election results and audit reports?',
    answer:
      'Administrators can navigate to the Detailed Results page for any election to print formal audit certificates or download raw, anonymized CSV audit logs for accreditation records.',
  },
  {
    question: 'Can Ballotly be installed as an app on mobile devices?',
    answer:
      'Yes. Ballotly is a full Progressive Web App (PWA). On iOS (Safari), tap "Share" and select "Add to Home Screen". On Android (Chrome), tap the menu and select "Install App" to run Ballotly as a standalone mobile application.',
  },
];

export default function FAQPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-8 py-16">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 mb-4"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Frequently Asked Questions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything you need to know about election security, verification protocols, and platform features.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="app-card p-6 sm:p-7 space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-start gap-3">
              <span className="text-blue-600 font-mono text-sm">{String(index + 1).padStart(2, '0')}.</span>
              <span>{faq.question}</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed pl-8">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 app-card p-8 text-center space-y-4 bg-slate-50 border-dashed">
        <h3 className="text-base font-bold text-slate-900">Have an institutional question not answered here?</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Contact our technical team for assistance with institutional integration, whitelist formatting, or custom deployment configurations.
        </p>
        <div className="pt-2">
          <a
            href="mailto:support@ballotly.com"
            className="inline-block py-2.5 px-5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Contact Election Support
          </a>
        </div>
      </div>
    </main>
  );
}
