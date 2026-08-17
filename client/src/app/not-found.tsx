import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="app-card max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Ballotly Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain"
          />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
            Error 404
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
          <p className="text-sm text-slate-500">
            The page, election ballot, or administrative resource you requested does not exist or has been moved.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="flex-1 py-2.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="flex-1 py-2.5 px-4 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
