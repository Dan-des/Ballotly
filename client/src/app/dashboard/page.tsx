'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  BarChart3,
  LogOut,
  Sparkles,
  Layers,
  X,
  Share2,
  ExternalLink,
  Edit3,
  User as UserIcon,
  ChevronDown,
  UserX,
  AlertTriangle,
  QrCode,
  Download,
  Lock,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import { getApiBaseUrl } from '@/lib/api';
import { PollCardSkeleton } from '@/components/SkeletonLoader';

type TrackingMethod = 'email' | 'phone' | 'email_phone' | 'student_id' | 'email_studentid' | 'voter_id';

const TRACKING_OPTIONS: { value: TrackingMethod; label: string; description: string }[] = [
  { value: 'email',           label: 'Email Address',              description: 'Voters identified by email: prevents duplicate email submissions.' },
  { value: 'phone',           label: 'Phone Number',               description: 'Voters identified by phone number.' },
  { value: 'email_phone',     label: 'Email & Phone Number',       description: 'Both email and phone required: strongest dual verification.' },
  { value: 'student_id',      label: 'Student / Matriculation ID', description: 'Voters identified by their institutional student ID.' },
  { value: 'email_studentid', label: 'Email & Student ID',         description: 'Email and student ID both required.' },
  { value: 'voter_id',        label: 'Voter / Membership ID',      description: 'Custom ID for corporate boards, clubs, or union elections.' },
];

export interface PollCategory {
  title: string;
  options: string[];
}

interface PollItem {
  id: string;
  title: string;
  description: string;
  options: string[];
  categories?: PollCategory[];
  trackingMethod: TrackingMethod;
  isResultPublic: boolean;
  expiresAt: string;
  requireWhitelist?: boolean;
  allowedVoters?: string[];
  isExpired: boolean;
  voteCount: number;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [isLoadingPolls, setIsLoadingPolls] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Profile Dropdown & Delete Account State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll Builder State (Create)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [useCategories, setUseCategories] = useState(false);
  const [newCategories, setNewCategories] = useState<PollCategory[]>([
    { title: 'President', options: ['', ''] },
    { title: 'Vice President', options: ['', ''] },
  ]);
  const [newTracking, setNewTracking] = useState<TrackingMethod>('email');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [durDays, setDurDays] = useState(1);
  const [durHours, setDurHours] = useState(0);
  const [durMinutes, setDurMinutes] = useState(0);
  const [newRequireWhitelist, setNewRequireWhitelist] = useState(false);
  const [newAllowedVotersText, setNewAllowedVotersText] = useState('');
  const [qrModalPoll, setQrModalPoll] = useState<PollItem | null>(null);
  const [qrCopied, setQrCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Poll Edit State
  const [editingPoll, setEditingPoll] = useState<PollItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editUseCategories, setEditUseCategories] = useState(false);
  const [editCategories, setEditCategories] = useState<PollCategory[]>([]);
  const [editTracking, setEditTracking] = useState<TrackingMethod>('email');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editRequireWhitelist, setEditRequireWhitelist] = useState(false);
  const [editAllowedVotersText, setEditAllowedVotersText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Share modal
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Handle Google OAuth redirect: token passed via URL params
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('token');
    const oauthUser = urlParams.get('user');
    const oauthError = urlParams.get('error');

    if (oauthError) { router.push(`/login?error=${oauthError}`); return; }

    if (oauthToken && oauthUser) {
      localStorage.setItem('voting_admin_token', oauthToken);
      localStorage.setItem('voting_admin_user', oauthUser);
      window.history.replaceState({}, '', '/dashboard');
    }

    const savedToken = localStorage.getItem('voting_admin_token');
    const savedUser = localStorage.getItem('voting_admin_user');

    if (!savedToken) { router.push('/login'); return; }

    setToken(savedToken);
    if (savedUser) {
      try { setAdminUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }

    // Instant SWR Cache hydration
    try {
      const cachedPolls = sessionStorage.getItem('ballotly_polls_cache');
      if (cachedPolls) {
        const parsed = JSON.parse(cachedPolls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPolls(parsed);
          setIsLoadingPolls(false);
        }
      }
    } catch { /* ignore */ }

    fetchPolls(savedToken);

    // Close profile dropdown on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPolls = async (authToken?: string) => {
    const currentToken = authToken || token || localStorage.getItem('voting_admin_token');
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls`, {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.polls)) {
        setPolls(data.polls);
        try {
          sessionStorage.setItem('ballotly_polls_cache', JSON.stringify(data.polls));
        } catch { /* ignore */ }
      }
    } catch {
      console.error('Error fetching polls.');
    } finally {
      setIsLoadingPolls(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!newTitle.trim()) { setFeedbackMsg({ type: 'error', text: 'Poll title is required.' }); return; }

    const validOpts = !useCategories ? newOptions.map((o) => o.trim()).filter(Boolean) : [];
    const validCats = useCategories
      ? newCategories
          .map((c) => ({
            title: c.title.trim(),
            options: c.options.map((o) => o.trim()).filter(Boolean),
          }))
          .filter((c) => c.title && c.options.length >= 2)
      : [];

    if (!useCategories && validOpts.length < 2) {
      setFeedbackMsg({ type: 'error', text: 'At least 2 candidates/options are required.' });
      return;
    }
    if (useCategories && validCats.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'At least 1 category position with 2 candidates is required.' });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          options: validOpts,
          categories: validCats,
          trackingMethod: newTracking,
          isResultPublic: newIsPublic,
          requireWhitelist: newRequireWhitelist,
          allowedVoters: newAllowedVotersText,
          duration: { days: durDays, hours: durHours, minutes: durMinutes, seconds: 0 },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackMsg({ type: 'error', text: data.error || 'Poll creation failed.' });
        return;
      }
      setFeedbackMsg({ type: 'success', text: `"${data.poll.title}" created successfully!` });
      setShowCreateModal(false);
      resetForm();
      fetchPolls();
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Error connecting to server.' });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewTitle(''); setNewDescription('');
    setNewOptions(['', '']); setNewTracking('email');
    setUseCategories(false);
    setNewCategories([
      { title: 'President', options: ['', ''] },
      { title: 'Vice President', options: ['', ''] },
    ]);
    setNewIsPublic(false); setDurDays(1); setDurHours(0); setDurMinutes(0);
    setNewRequireWhitelist(false); setNewAllowedVotersText('');
  };

  const openEditModal = (poll: PollItem) => {
    setEditingPoll(poll);
    setEditTitle(poll.title);
    setEditDescription(poll.description || '');
    setEditOptions(poll.options && poll.options.length > 0 ? [...poll.options] : ['', '']);
    setEditCategories(
      poll.categories && poll.categories.length > 0
        ? poll.categories.map((c) => ({ title: c.title, options: [...c.options] }))
        : []
    );
    setEditUseCategories(Boolean(poll.categories && poll.categories.length > 0));
    setEditTracking(poll.trackingMethod);
    setEditIsPublic(poll.isResultPublic);
    setEditRequireWhitelist(Boolean(poll.requireWhitelist));
    setEditAllowedVotersText(poll.allowedVoters ? poll.allowedVoters.join('\n') : '');
    const d = new Date(poll.expiresAt);
    const isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditExpiresAt(isoStr);
  };

  const handleUpdatePoll = async () => {
    if (!editingPoll) return;
    if (!editTitle.trim()) { setFeedbackMsg({ type: 'error', text: 'Poll title is required.' }); return; }
    if (!editExpiresAt) { setFeedbackMsg({ type: 'error', text: 'Expiration date/time is required.' }); return; }

    const validOpts = !editUseCategories ? editOptions.map((o) => o.trim()).filter(Boolean) : [];
    const validCats = editUseCategories
      ? editCategories
          .map((c) => ({
            title: c.title.trim(),
            options: c.options.map((o) => o.trim()).filter(Boolean),
          }))
          .filter((c) => c.title && c.options.length >= 2)
      : [];

    if (!editUseCategories && validOpts.length < 2) {
      setFeedbackMsg({ type: 'error', text: 'At least 2 candidates/options are required.' });
      return;
    }
    if (editUseCategories && validCats.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'At least 1 position category with 2 candidates is required.' });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls/${editingPoll.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          options: validOpts,
          categories: validCats,
          trackingMethod: editTracking,
          expiresAt: new Date(editExpiresAt).toISOString(),
          isResultPublic: editIsPublic,
          requireWhitelist: editRequireWhitelist,
          allowedVoters: editAllowedVotersText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to update poll.' });
        return;
      }
      setFeedbackMsg({ type: 'success', text: `"${data.poll.title}" updated successfully!` });
      setEditingPoll(null);
      fetchPolls();
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Error updating poll.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleResults = async (pollId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls/${pollId}/toggle-results`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPolls((prev) => prev.map((p) => p.id === pollId ? { ...p, isResultPublic: data.isResultPublic } : p));
        setFeedbackMsg({ type: 'success', text: `Live results visibility set to ${data.isResultPublic ? 'PUBLIC' : 'PRIVATE'}.` });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to update visibility switch.' });
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Permanently delete this poll and all its votes?')) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls/${pollId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPolls(polls.filter((p) => p.id !== pollId));
        setFeedbackMsg({ type: 'success', text: 'Poll deleted successfully.' });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to delete poll.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('voting_admin_token');
    localStorage.removeItem('voting_admin_user');
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.removeItem('voting_admin_token');
        localStorage.removeItem('voting_admin_user');
        router.push('/login?message=Account deleted');
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to delete account.' });
        setShowDeleteAccountModal(false);
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Server error during account deletion.' });
      setShowDeleteAccountModal(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const openShareModal = (pollId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    setShareLink(`${origin}/vote/${pollId}`);
    setCopied(false);
  };

  const openQrModal = (poll: PollItem) => {
    setQrModalPoll(poll);
    setQrCopied(false);
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activePolls = polls.filter((p) => !p.isExpired && new Date(p.expiresAt) > new Date());
  const closedPolls = polls.filter((p) => p.isExpired || new Date(p.expiresAt) <= new Date());

  const trackingLabel = (m: TrackingMethod) =>
    TRACKING_OPTIONS.find((o) => o.value === m)?.label ?? m;

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Top Nav Header with Profile Dropdown ────────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="Ballotly Logo"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Ballotly Platform</p>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                  {adminUser?.name ? `Welcome, ${adminUser.name}` : 'Organizer Dashboard'}
                </h1>
              </div>
            </div>

            {/* Profile menu button */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-medium text-xs transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                  {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : <UserIcon className="w-3 h-3" />}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{adminUser?.name || 'Account'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{adminUser?.name || 'Admin User'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{adminUser?.email || ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                    Sign Out
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowProfileMenu(false); setShowDeleteAccountModal(true); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                  >
                    <UserX className="w-4 h-4 text-red-500" />
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => { setShowCreateModal(true); setFeedbackMsg(null); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create New Election
            </button>
          </div>
        </header>

        {/* ── Feedback Banner ──────────────────────────────────────────────── */}
        {feedbackMsg && (
          <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-xs font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              {feedbackMsg.text}
            </div>
            <button type="button" onClick={() => setFeedbackMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Summary Metrics ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Total Elections', value: polls.length, icon: Layers },
            { label: 'Active Elections', value: activePolls.length, icon: Sparkles },
            { label: 'Total Ballots Cast', value: polls.reduce((s, p) => s + p.voteCount, 0).toLocaleString(), icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="app-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-blue-600">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{label}</p>
                <p className="text-2xl font-bold text-slate-900 font-mono">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Active Polls ─────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Active Elections</h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {activePolls.length} running
            </span>
          </div>

          {isLoadingPolls ? (
            <div className="space-y-4">
              <PollCardSkeleton />
              <PollCardSkeleton />
            </div>
          ) : activePolls.length === 0 ? (
            <div className="app-card p-10 text-center text-slate-400 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-500">No active elections. Create a new election to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activePolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  trackingLabel={trackingLabel}
                  onToggleResults={handleToggleResults}
                  onDelete={handleDeletePoll}
                  onShare={openShareModal}
                  onOpenQr={openQrModal}
                  onEdit={openEditModal}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Closed Polls ─────────────────────────────────────────────────── */}
        {closedPolls.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Closed Polls</h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                {closedPolls.length} closed
              </span>
            </div>
            <div className="space-y-4">
              {closedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  trackingLabel={trackingLabel}
                  onToggleResults={handleToggleResults}
                  onDelete={handleDeletePoll}
                  onShare={openShareModal}
                  onOpenQr={openQrModal}
                  onEdit={openEditModal}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Create Poll Modal ──────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="max-h-[90vh] w-full max-w-xl flex flex-col rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Create New Election</h2>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Election Title *
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Student Union Government Executive Election 2026"
                  className="w-full app-input px-3.5 py-2 text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description / Context (optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief context and instructions for voters..."
                  className="w-full app-input px-3.5 py-2 text-sm resize-none"
                />
              </div>

              {/* Multi-Position Categories Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Multi-Position Ballot (Optional)</p>
                  <p className="text-[11px] text-slate-500">Vote for multiple offices (e.g. President, Vice President) on a single ballot.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCategories(!useCategories)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${useCategories ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${useCategories ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {!useCategories ? (
                /* Standard Options */
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Candidates / Voting Options *
                  </label>
                  <div className="space-y-2">
                    {newOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newOptions];
                            updated[i] = e.target.value;
                            setNewOptions(updated);
                          }}
                          placeholder={`Candidate ${i + 1}`}
                          className="flex-1 app-input px-3 py-1.5 text-xs"
                        />
                        {newOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setNewOptions(newOptions.filter((_, j) => j !== i))}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Remove candidate"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewOptions([...newOptions, ''])}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Candidate Option
                    </button>
                  </div>
                </div>
              ) : (
                /* Multi-Position Categories */
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Offices &amp; Candidates *
                  </label>
                  {newCategories.map((cat, catIdx) => (
                    <div key={catIdx} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={cat.title}
                          onChange={(e) => {
                            const updated = [...newCategories];
                            updated[catIdx].title = e.target.value;
                            setNewCategories(updated);
                          }}
                          placeholder="Position Title (e.g. President)"
                          className="font-bold text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 flex-1"
                        />
                        {newCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewCategories(newCategories.filter((_, j) => j !== catIdx))}
                            className="p-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Remove position"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {cat.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex gap-2">
                            <input
                              value={opt}
                              onChange={(e) => {
                                const updated = [...newCategories];
                                updated[catIdx].options[optIdx] = e.target.value;
                                setNewCategories(updated);
                              }}
                              placeholder={`Candidate ${optIdx + 1}`}
                              className="flex-1 app-input px-2.5 py-1 text-xs"
                            />
                            {cat.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...newCategories];
                                  updated[catIdx].options = updated[catIdx].options.filter((_, j) => j !== optIdx);
                                  setNewCategories(updated);
                                }}
                                className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...newCategories];
                            updated[catIdx].options.push('');
                            setNewCategories(updated);
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                        >
                          <PlusCircle className="w-3 h-3" /> Add Candidate for {cat.title || 'Position'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewCategories([...newCategories, { title: '', options: ['', ''] }])}
                    className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Position / Office
                  </button>
                </div>
              )}

              {/* Tracking Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Voter Identification &amp; Deduplication Method
                </label>
                <select
                  value={newTracking}
                  onChange={(e) => setNewTracking(e.target.value as TrackingMethod)}
                  className="w-full app-input px-3 py-2 text-xs bg-white"
                >
                  {TRACKING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {TRACKING_OPTIONS.find((o) => o.value === newTracking)?.description}
                </p>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Election Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Days', val: durDays, set: setDurDays },
                    { label: 'Hours', val: durHours, set: setDurHours },
                    { label: 'Minutes', val: durMinutes, set: setDurMinutes },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <p className="text-[10px] text-slate-500 font-semibold text-center mb-1">{label}</p>
                      <input
                        type="number"
                        min={0}
                        value={val}
                        onChange={(e) => set(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full app-input px-2 py-1.5 text-xs text-center font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Results Visibility */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Public Live Standings</p>
                  <p className="text-[11px] text-slate-500">Allow voters to view live tally bars during active voting.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewIsPublic(!newIsPublic)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${newIsPublic ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${newIsPublic ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Whitelist Toggle */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" /> Restrict Access via Voter Whitelist
                    </p>
                    <p className="text-[11px] text-slate-500">Only specified IDs/emails on the whitelist will be allowed to vote.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewRequireWhitelist(!newRequireWhitelist)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${newRequireWhitelist ? 'bg-amber-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${newRequireWhitelist ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {newRequireWhitelist && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Authorized Identifiers (Emails, Student IDs, or Phones)
                    </label>
                    <textarea
                      rows={3}
                      value={newAllowedVotersText}
                      onChange={(e) => setNewAllowedVotersText(e.target.value)}
                      placeholder="student1@univ.edu, STU-2026-001, +1234567890"
                      className="w-full app-input px-3 py-2 text-xs resize-none font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Separate each identifier with a comma or new line.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 shrink-0 flex gap-2.5 bg-slate-50">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePoll}
                disabled={isCreating}
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Launch Election'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Active Poll Modal ────────────────────────────────────────── */}
      {editingPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="max-h-[90vh] w-full max-w-xl flex flex-col rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" /> Edit Election Details
              </h2>
              <button
                type="button"
                onClick={() => setEditingPoll(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Election Title *
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full app-input px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full app-input px-3.5 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Duplicate Vote Tracking Criteria
                </label>
                <select
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value as TrackingMethod)}
                  className="w-full app-input px-3 py-2 text-xs bg-white"
                >
                  {TRACKING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Expiration Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full app-input px-3 py-2 text-xs bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Public Live Standings</p>
                  <p className="text-[11px] text-slate-500">Toggle whether voters can view live tallies.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsPublic(!editIsPublic)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${editIsPublic ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${editIsPublic ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" /> Restrict Access via Voter Whitelist
                    </p>
                    <p className="text-[11px] text-slate-500">Only authorized individuals can vote.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditRequireWhitelist(!editRequireWhitelist)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${editRequireWhitelist ? 'bg-amber-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${editRequireWhitelist ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {editRequireWhitelist && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Allowed Identifiers (Emails, Student IDs, or Phones)
                    </label>
                    <textarea
                      rows={3}
                      value={editAllowedVotersText}
                      onChange={(e) => setEditAllowedVotersText(e.target.value)}
                      placeholder="student1@univ.edu, STU-2026-001, +1234567890"
                      className="w-full app-input px-3 py-2 text-xs resize-none font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 shrink-0 flex gap-2.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingPoll(null)}
                className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePoll}
                disabled={isUpdating}
                className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Confirmation Modal ────────────────────────────── */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Delete Account?</h2>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Are you sure you want to permanently delete your organizer account? All created elections, voter rosters, and audit records will be purged.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Modal ────────────────────────────────────────────────────── */}
      {shareLink && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="app-card w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-600" /> Share Election Link
              </h2>
              <button
                type="button"
                onClick={() => setShareLink(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">Provide this direct link to eligible voters:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareLink}
                className="flex-1 app-input px-3 py-2 text-xs font-mono text-slate-700"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-colors shrink-0 ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a
              href={shareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Ballot in New Tab
            </a>
          </div>
        </div>
      )}

      {/* ── QR Code Modal ──────────────────────────────────────────────────── */}
      {qrModalPoll && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="app-card w-full max-w-sm p-6 shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" /> Election QR Code
              </h2>
              <button
                type="button"
                onClick={() => setQrModalPoll(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 line-clamp-1">{qrModalPoll.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Scan to open digital ballot</p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 inline-block mx-auto">
              <QRCodeCanvas
                id="ballotly-qr-code-canvas"
                value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/vote/${qrModalPoll.id}`}
                size={180}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const canvas = document.getElementById('ballotly-qr-code-canvas') as HTMLCanvasElement;
                  if (!canvas) return;
                  const pngUrl = canvas.toDataURL('image/png');
                  const downloadLink = document.createElement('a');
                  downloadLink.href = pngUrl;
                  downloadLink.download = `ballotly-qr-${qrModalPoll.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                }}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download QR Code (PNG)
              </button>

              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/vote/${qrModalPoll.id}`;
                  await navigator.clipboard.writeText(url);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                }}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
              >
                {qrCopied ? 'Copied Direct Link!' : 'Copy Direct Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── PollCard sub-component ─────────────────────────────────────────────────────
function PollCard({
  poll,
  trackingLabel,
  onToggleResults,
  onDelete,
  onShare,
  onOpenQr,
  onEdit,
}: {
  poll: PollItem;
  trackingLabel: (m: TrackingMethod) => string;
  onToggleResults: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onOpenQr: (poll: PollItem) => void;
  onEdit: (poll: PollItem) => void;
}) {
  const expiresLabel = new Date(poll.expiresAt).toLocaleString();
  const isActive = !poll.isExpired && new Date(poll.expiresAt) > new Date();

  return (
    <div className="app-card p-6 space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-slate-900 text-base">{poll.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              !isActive ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {!isActive ? 'CLOSED' : 'ACTIVE'}
            </span>
            {poll.requireWhitelist && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> RESTRICTED
              </span>
            )}
          </div>
          {poll.description && <p className="text-xs text-slate-500 line-clamp-1">{poll.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap shrink-0 pt-1 sm:pt-0">
          {isActive && (
            <button
              type="button"
              onClick={() => onEdit(poll)}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              title="Edit election details"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenQr(poll)}
            className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="View & Download QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onShare(poll.id)}
            className="p-1.5 rounded-md bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors"
            title="Share voting link"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <Link
            href={`/dashboard/polls/${poll.id}/results`}
            className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="View detailed audit results"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(poll.id)}
            className="p-1.5 rounded-md bg-white border border-slate-200 text-red-600 hover:bg-red-50 transition-colors"
            title="Delete election"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
          <strong className="text-slate-800 font-mono">{poll.voteCount}</strong> ballots cast
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {!isActive ? 'Closed' : 'Closes'} {expiresLabel}
        </span>
        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
          {trackingLabel(poll.trackingMethod)}
        </span>
      </div>

      {/* Options chips */}
      <div className="flex flex-wrap gap-1.5">
        {poll.options.map((opt) => (
          <span key={opt} className="text-xs bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded font-medium">
            {opt}
          </span>
        ))}
      </div>

      {/* Results toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          {poll.isResultPublic ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
          Live results: <span className={`font-semibold ${poll.isResultPublic ? 'text-emerald-700' : 'text-slate-500'}`}>
            {poll.isResultPublic ? 'PUBLIC' : 'PRIVATE'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleResults(poll.id)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors ${
            poll.isResultPublic
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
        >
          {poll.isResultPublic ? 'Make Private' : 'Make Public'}
        </button>
      </div>
    </div>
  );
}
