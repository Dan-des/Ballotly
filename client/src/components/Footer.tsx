import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Ballotly Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
              />
              <span className="font-bold text-slate-900 text-lg tracking-tight">Ballotly</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Cryptographically verified institutional voting and governance infrastructure.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">
              Terms of Service
            </Link>
            <Link href="/faq" className="hover:text-blue-600 transition-colors">
              Frequently Asked Questions
            </Link>
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Organizer Dashboard
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Ballotly Platform. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Encryption & Integrity Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
