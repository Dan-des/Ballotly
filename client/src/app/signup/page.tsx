'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, User, Mail, Lock, ArrowRight, ArrowLeft,
  AlertCircle, Loader2, CheckCircle, RefreshCw, KeyRound,
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/api';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    <div className="w-full max-w-md space-y-6 animate-fadeIn">
      {/* Brand Header */}
      <div className="text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 shadow-lg shadow-indigo-500/10 mb-3 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ballotly Logo" className="w-full h-full object-cover rounded-xl" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold mb-3">
          Ballotly Setup
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Admin Account</h1>
        <p className="text-sm text-slate-500 mt-2">
          Register as an election manager to launch custom polls, set duration timers, and manage governance elections.
        </p>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google OAuth */}
        <button
          onClick={handleGoogleOAuth}
          type="button"
          className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.99]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Sign Up with Google</span>
        </button>

        <div className="flex items-center">
          <div className="flex-grow border-t border-slate-200" />
          <span className="px-3 text-xs text-slate-400 font-medium">OR REGISTER WITH EMAIL</span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <input
                id="signup-name" type="text" required autoComplete="name"
                placeholder="Your full name"
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="signup-email" type="email" required autoComplete="email"
                placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password" type="password" required autoComplete="new-password"
                placeholder="Minimum 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="signup-confirm-password" type="password" required autoComplete="new-password"
                placeholder="Re-type your password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
            </div>
          </div>

          <button
            type="submit" disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Sending code…</span></>
            ) : (
              <><span>Continue</span><ArrowRight className="w-4 h-4" /></>
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

  // Start resend countdown immediately
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow a single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setErrorMessage(null);
    // Auto-advance to next input
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
    // Focus the next empty slot or last
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
          // Reset digits and go back after delay
          setTimeout(() => onBack(), 2500);
        } else {
          // Clear digits to re-enter
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

  // Auto-submit when all 6 digits are filled
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
      // We need the original registration data — ask user to go back if needed
      // For resend we call send-otp again; the backend upserts so it's safe
      // But we don't have password here, so we'll hit the backend with a dedicated resend endpoint
      // Since we stored OtpToken, the backend just needs to re-generate for the same email.
      // We call send-otp via a lightweight resend path.
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
      setSuccessMessage('A new code has been sent to your inbox!');
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
    <div className="w-full max-w-md space-y-6 animate-fadeIn">
      {/* Brand Header */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Ballotly</span>
        </Link>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Check your inbox</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          We sent a 6-digit verification code to<br />
          <span className="font-semibold text-slate-700">{maskEmail(email)}</span>
        </p>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">

        {/* Success banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 6-digit OTP input boxes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4 text-center">
            Enter verification code
          </label>
          <div className="flex items-center justify-center gap-3" onPaste={handlePaste}>
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
                className={`
                  w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 outline-none transition-all duration-150
                  ${digit
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-500/20'
                    : 'border-slate-200 bg-white text-slate-900 focus:border-indigo-400 focus:bg-indigo-50/50'
                  }
                  ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">Code expires in 10 minutes</p>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={!isComplete || isVerifying}
          className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>Verifying…</span></>
          ) : (
            <><span>Verify & Create Account</span><CheckCircle className="w-4 h-4" /></>
          )}
        </button>

        {/* Resend & Back row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Change email
          </button>

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:text-slate-400 disabled:cursor-not-allowed text-indigo-600 hover:text-indigo-700"
          >
            {isResending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sending…</span></>
            ) : cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" /><span>Resend code</span></>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out both; }
      `}</style>
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
