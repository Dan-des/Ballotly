'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

function buildGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Login failed. Please verify your credentials.');
        return;
      }

      if (data.token) {
        localStorage.setItem('voting_admin_token', data.token);
        localStorage.setItem('voting_admin_user', JSON.stringify(data.user));
        router.push('/dashboard');
      }
    } catch {
      setErrorMessage('Unable to connect to authentication server. Please check your backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      setErrorMessage('Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in the .env.local file.');
      return;
    }
    // Real Google OAuth 2.0 redirect — no hardcoded data
    window.location.href = buildGoogleOAuthUrl();
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 shadow-lg shadow-indigo-500/10 mb-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ballotly Logo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold mb-3">
            Ballotly Platform
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin & Manager Sign In</h1>
          <p className="text-sm text-slate-500 mt-2">
            Access your election dashboard to create polls, manage timers, and configure live results visibility.
          </p>
        </div>

        {/* Light Glassmorphism Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google OAuth 2.0 Button — redirects to Google's real consent screen */}
          <button
            onClick={handleGoogleOAuth}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.99]"
          >
            {/* Official Google Brand SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="px-3 text-xs text-slate-400 font-medium">OR SIGN IN WITH EMAIL</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Mode Toggle Link */}
        <p className="text-center text-xs text-slate-500">
          Don&apos;t have an admin account?{' '}
          <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
            Register new election manager account
          </Link>
        </p>
      </div>
    </main>
  );
}
