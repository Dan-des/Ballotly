'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
import ScrollReveal from '@/components/ScrollReveal';
import BallotlyLogo from '@/components/BallotlyLogo';
import { isStandalonePwa } from '@/lib/pwa';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function getGoogleRedirectUri(): string {
  if (process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}/api/auth/callback/google`;
  }
  return 'https://ballotlyng.vercel.app/api/auth/callback/google';
}

function buildGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [isPwa, setIsPwa] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Non-blocking background warm-up ping and URL hash cleanup on page load
  useEffect(() => {
    if (isStandalonePwa()) {
      setIsPwa(true);
    }
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    fetch(`${getApiBaseUrl()}/health`).catch(() => {});
  }, []);

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
        throw new Error(data.message || 'Login failed. Please verify your credentials.');
      }

      if (data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('voting_admin_token', data.token);
          localStorage.setItem('voting_admin_user', JSON.stringify(data.user || data.admin || {}));
        }
        router.push('/dashboard');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to authentication server. Please check your network.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      setErrorMessage('Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    window.location.href = buildGoogleOAuthUrl();
  };

  return (
    <main className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12">
      <ScrollReveal direction="down" delay={40} className="w-full max-w-md space-y-6">
        {!isPwa && (
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center flex flex-col items-center">
          <div className="mb-2">
            <BallotlyLogo size={52} href={isPwa ? undefined : '/'} />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-2">
            Organizer Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Manage your elections, configure whitelist verification, and inspect verified results.
          </p>
        </div>

        {/* Solid Tactile Card */}
        <div className="app-card p-8 space-y-6 shadow-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google OAuth 2.0 Button */}
          <button
            type="button"
            onClick={handleGoogleOAuth}
            disabled={isLoading}
            className="btn-press w-full py-2.5 px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center my-3">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">or sign in with email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  className="w-full app-input px-3.5 py-2 text-sm pr-10"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full app-input px-3.5 py-2 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-press w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>
        </div>

        {/* Mode Toggle Link */}
        <p className="text-center text-xs text-slate-500">
          Need an organizer account?{' '}
          <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
            Register new account
          </Link>
        </p>
      </ScrollReveal>
    </main>
  );
}
