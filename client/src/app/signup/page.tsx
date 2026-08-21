'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User, Mail, Eye, EyeOff, ArrowLeft,
  AlertCircle, Loader2, CheckCircle, RefreshCw, KeyRound,
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
import BallotlyLogo from '@/components/BallotlyLogo';
import { isStandalonePwa } from '@/lib/pwa';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const RESEND_COOLDOWN = 60;

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

/** Masks an email for display: d***@gmail.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

// ─── Step 1: Signup Form ────────────────────────────────────────────────────

interface StepOneProps {
  onOtpSent: (email: string) => void;
}

function StepOne({ onOtpSent }: StepOneProps) {
  const [isPwa, setIsPwa] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Background server warm-up and URL hash cleanup
  useEffect(() => {
    if (isStandalonePwa()) {
      setIsPwa(true);
    }
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    fetch(`${getApiBaseUrl()}/health`).catch(() => {});
  }, []);

  const handleGoogleOAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      setErrorMessage('Google OAuth is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    window.location.href = buildGoogleOAuthUrl();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to send verification code. Please try again.');
        return;
      }
      onOtpSent(email.trim().toLowerCase());
    } catch {
      setErrorMessage('Unable to connect to authentication server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
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
          Organizer Registration
        </span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Organizer Account</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Register to launch institutional polls, restrict voters by whitelist, and export audit certificates.
        </p>
      </div>

      <div className="app-card p-8 space-y-6">
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google OAuth */}
        <button
          onClick={handleGoogleOAuth}
          type="button"
          className="w-full py-2.5 px-4 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors flex items-center justify-center gap-2.5"
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
          <span className="px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">or register with email</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                id="signup-name" type="text" required autoComplete="name"
                placeholder="Dr. Jane Smith"
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full app-input px-3.5 py-2 text-sm pr-10"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Work / University Email
            </label>
            <div className="relative">
              <input
                id="signup-email" type="email" required autoComplete="email"
                placeholder="jane.smith@university.edu"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full app-input px-3.5 py-2 text-sm pr-10"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <input
                id="signup-password" type={showPassword ? 'text' : 'password'} required autoComplete="new-password"
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
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

          <div>
            <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="signup-confirm-password" type={showConfirmPassword ? 'text' : 'password'} required autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full app-input px-3.5 py-2 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending verification code...</span></>
            ) : (
              'Continue to Email Verification'
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-500">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Sign in to existing account
        </Link>
      </p>
    </div>
  );
}

// ─── Step 2: OTP Verification ───────────────────────────────────────────────

interface StepTwoProps {
  email: string;
  onBack: () => void;
}

function StepTwo({ email, onBack }: StepTwoProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setErrorMessage(null);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = useCallback(async () => {
    const otp = digits.join('');
    if (otp.length < 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Incorrect code. Please try again.');
        if (data.expired) {
          setTimeout(() => onBack(), 2500);
        } else {
          setDigits(['', '', '', '', '', '']);
          setTimeout(() => inputRefs.current[0]?.focus(), 50);
        }
        return;
      }

      if (data.token) {
        localStorage.setItem('voting_admin_token', data.token);
        localStorage.setItem('voting_admin_user', JSON.stringify(data.user));
        router.push('/dashboard');
      }
    } catch {
      setErrorMessage('Unable to connect to the server. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [digits, email, router, onBack]);

  useEffect(() => {
    if (digits.every((d) => d !== '')) {
      handleVerify();
    }
  }, [digits, handleVerify]);

  const handleResend = async () => {
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to resend code. Please go back and try again.');
        return;
      }
      setSuccessMessage('A new code has been sent to your inbox.');
      setDigits(['', '', '', '', '', '']);
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setErrorMessage('Unable to connect. Please go back and try again.');
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify Your Email</h1>
        <p className="text-xs text-slate-500 mt-1">
          We sent a 6-digit verification code to<br />
          <strong className="text-slate-700 font-mono">{maskEmail(email)}</strong>
        </p>
      </div>

      <div className="app-card p-8 space-y-6">
        {/* Success banner */}
        {successMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 6-digit OTP input boxes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 text-center">
            Enter 6-Digit Code
          </label>
          <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                id={`otp-digit-${i}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isVerifying}
                className="w-11 h-12 text-center text-lg font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors"
              />
            ))}
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2.5">Code expires in 10 minutes</p>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={!isComplete || isVerifying}
          className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isVerifying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></>
          ) : (
            'Verify & Access Dashboard'
          )}
        </button>

        {/* Resend & Back row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Edit email
          </button>

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="flex items-center gap-1 font-semibold transition-colors disabled:text-slate-400 disabled:cursor-not-allowed text-blue-600 hover:text-blue-700"
          >
            {isResending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sending...</span></>
            ) : cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" /><span>Resend code</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root Page ───────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const handleOtpSent = (email: string) => {
    setVerifiedEmail(email);
    setStep('otp');
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
      {step === 'form' ? (
        <StepOne onOtpSent={handleOtpSent} />
      ) : (
        <StepTwo email={verifiedEmail} onBack={() => setStep('form')} />
      )}
    </main>
  );
}
