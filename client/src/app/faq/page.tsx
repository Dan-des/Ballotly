'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, HelpCircle, MessageSquare } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

const faqs = [
  {
    category: 'Security & Verification',
    question: 'How does Ballotly verify voters and prevent double voting?',
    answer:
      'Ballotly uses dynamic tracking methods chosen by the election administrator (such as Student ID, Email, Phone Number, or Voter ID). When a ballot is submitted, the platform verifies the identifier and records a cryptographic deduplication record. Any subsequent attempt to submit with the same identifier is blocked.',
  },
  {
    category: 'Voter Privacy',
    question: 'Are voter choices completely secret and confidential?',
    answer:
      'Yes. Voter identification is used exclusively for eligibility verification. The ballot choices are recorded with anonymized sequence labels in the audit log, preventing administrators or third parties from connecting a specific voter to their chosen candidate.',
  },
  {
    category: 'Access Control',
    question: 'How does the Restricted Voter Whitelist work?',
    answer:
      'When an administrator enables "Require Whitelist", only voters whose email, phone, or Student ID is listed in the pre-approved roster can cast a ballot. Unregistered or unauthorized individuals are rejected with an explicit verification notice.',
  },
  {
    category: 'Verification Methods',
    question: 'What tracking methods can an organizer select?',
    answer:
      'Ballotly supports six verification models: Email Address only, Phone Number only, Email + Phone (both required), Student / Matriculation ID, Email + Student ID, and Custom Voter / Membership ID.',
  },
  {
    category: 'Ballot Structure',
    question: 'How do Multi-Position Category Elections work?',
    answer:
      'Organizers can create elections featuring multiple offices on a single ballot (for example: President, Vice President, General Secretary). Voters make one choice per category and submit their unified ballot in a single streamlined submission.',
  },
  {
    category: 'Audits & Exports',
    question: 'How can administrators export election results and audit reports?',
    answer:
      'Administrators can navigate to the Detailed Results page for any election to print formal audit certificates or download raw, anonymized CSV audit logs for accreditation records.',
  },
  {
    category: 'Mobile & Installation',
    question: 'Can Ballotly be installed as an app on mobile devices?',
    answer:
      'Yes. Ballotly is a full Progressive Web App (PWA). On iOS (Safari), tap "Share" and select "Add to Home Screen". On Android (Chrome), tap the menu and select "Install App" to run Ballotly as a standalone mobile application.',
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <ScrollReveal direction="down" delay={0}>
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="btn-press text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1.5 mb-4"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-blue-600 icon-tilt" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help Center &amp; FAQ</h1>
          </div>
          <p className="text-xs text-slate-500">
            Search verification protocols, security mechanisms, whitelist rules, and platform capabilities.
          </p>

          {/* Live Search Input */}
          <div className="mt-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. whitelist, privacy, export, double voting)..."
              className="w-full app-input pl-10 pr-4 py-2.5 text-xs"
            />
          </div>
        </div>
      </ScrollReveal>

      {/* Accordion FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="app-card p-8 text-center text-xs text-slate-500">
            No matching questions found for &ldquo;{searchQuery}&rdquo;. Try another search term.
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <ScrollReveal key={index} direction="up" delay={index * 50}>
                <div className="app-card-interactive overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        {faq.category}
                      </span>
                      <h2 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {faq.question}
                      </h2>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                      {faq.answer}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })
        )}
      </div>

      {/* Support Box */}
      <ScrollReveal direction="up" delay={250}>
        <div className="mt-10 app-card-interactive p-6 text-center space-y-3 bg-slate-50 border-dashed">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <MessageSquare className="w-4 h-4 icon-float" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Need Custom Institutional Assistance?</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Contact our technical team for assistance with custom roster imports, SSO integrations, or university-wide election setups.
          </p>
          <div className="pt-1">
            <a
              href="mailto:support@ballotly.com"
              className="btn-press inline-block py-2 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
            >
              Contact Election Support
            </a>
          </div>
        </div>
      </ScrollReveal>
    </main>
  );
}

