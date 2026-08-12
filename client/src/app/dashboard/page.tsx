'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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

type TrackingMethod = 'email' | 'phone' | 'email_phone' | 'student_id' | 'email_studentid' | 'voter_id';

const TRACKING_OPTIONS: { value: TrackingMethod; label: string; description: string }[] = [
  { value: 'email',           label: 'Email Address',              description: 'Voters identified by email — prevents duplicate email submissions.' },
  { value: 'phone',           label: 'Phone Number',               description: 'Voters identified by phone number.' },
  { value: 'email_phone',     label: 'Email & Phone Number',       description: 'Both email and phone required — strongest dual verification.' },
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
    setIsLoadingPolls(true);
    const currentToken = authToken || token || localStorage.getItem('voting_admin_token');
    try {
      const res = await fetch(`${getApiBaseUrl()}/polls`, {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      });
      const data = await res.json();
      if (data.success) setPolls(data.polls);
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
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-0.5 shadow-md flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Ballotly Logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Ballotly</p>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                {adminUser?.name ? `Welcome, ${adminUser.name}` : 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowCreateModal(true); setFeedbackMsg(null); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              New Poll
            </button>

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 font-semibold text-xs transition-all shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                  {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="max-w-[120px] truncate">{adminUser?.name || 'Account'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{adminUser?.name || 'Admin User'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{adminUser?.email || ''}</p>
                  </div>
                  <button
                    onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                    Sign Out
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); setShowDeleteAccountModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                  >
                    <UserX className="w-4 h-4 text-red-500" />
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Feedback Banner ──────────────────────────────────────────────── */}
        {feedbackMsg && (
          <div className={`flex items-center justify-between gap-3 px-5 py-4 rounded-2xl text-sm font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {feedbackMsg.text}
            </div>
            <button onClick={() => setFeedbackMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Summary Metrics ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Polls', value: polls.length, icon: Layers, color: 'blue' },
            { label: 'Active Polls', value: activePolls.length, icon: Sparkles, color: 'emerald' },
            { label: 'Total Votes', value: polls.reduce((s, p) => s + p.voteCount, 0).toLocaleString(), icon: BarChart3, color: 'violet' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-panel p-5 rounded-3xl flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl bg-${color}-50 border border-${color}-100 flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 text-${color}-500`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">{label}</p>
                <p className="text-2xl font-extrabold text-slate-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Active Polls ─────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Active Polls</h2>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              {activePolls.length} running
            </span>
          </div>

          {isLoadingPolls ? (
            <div className="glass-panel p-10 rounded-3xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : activePolls.length === 0 ? (
            <div className="glass-panel p-10 rounded-3xl text-center text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No active polls. Create one to get started.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-xl flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Locked Header */}
            <div className="p-6 border-b shrink-0 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">Create New Poll</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Poll Title *</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Board Election 2025" className="w-full glass-input rounded-2xl px-4 py-3 text-sm" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Description (optional)</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2}
                  placeholder="Brief context for voters..." className="w-full glass-input rounded-2xl px-4 py-3 text-sm resize-none" />
              </div>

              {/* Toggle Multi-Position Categories vs Standard Options */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div>
                  <p className="text-xs font-bold text-indigo-900">Multi-Position Election (Optional)</p>
                  <p className="text-[11px] text-indigo-600">Vote for multiple offices (e.g. President, Vice President, Secretary) on one ballot.</p>
                </div>
                <button type="button" onClick={() => setUseCategories(!useCategories)}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${useCategories ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${useCategories ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {!useCategories ? (
                /* Standard Options */
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Voting Options / Candidates *</label>
                  <div className="space-y-2">
                    {newOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={opt} onChange={(e) => {
                          const updated = [...newOptions]; updated[i] = e.target.value; setNewOptions(updated);
                        }} placeholder={`Candidate ${i + 1}`} className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-sm" />
                        {newOptions.length > 2 && (
                          <button onClick={() => setNewOptions(newOptions.filter((_, j) => j !== i))}
                            className="p-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-400 hover:text-red-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setNewOptions([...newOptions, ''])}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 transition-colors">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Candidate Option
                    </button>
                  </div>
                </div>
              ) : (
                /* Multi-Position Categories */
                <div className="space-y-4 pt-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Election Positions &amp; Candidates *
                  </label>
                  {newCategories.map((cat, catIdx) => (
                    <div key={catIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={cat.title}
                          onChange={(e) => {
                            const updated = [...newCategories];
                            updated[catIdx].title = e.target.value;
                            setNewCategories(updated);
                          }}
                          placeholder="Position Title (e.g. President)"
                          className="font-bold text-sm bg-white border border-slate-300 rounded-xl px-3 py-1.5 flex-1"
                        />
                        {newCategories.length > 1 && (
                          <button
                            onClick={() => setNewCategories(newCategories.filter((_, j) => j !== catIdx))}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 pl-2">
                        {cat.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex gap-2">
                            <input
                              value={opt}
                              onChange={(e) => {
                                const updated = [...newCategories];
                                updated[catIdx].options[optIdx] = e.target.value;
                                setNewCategories(updated);
                              }}
                              placeholder={`Candidate ${optIdx + 1} for ${cat.title || 'Position'}`}
                              className="flex-1 glass-input rounded-xl px-3 py-2 text-xs bg-white"
                            />
                            {cat.options.length > 2 && (
                              <button
                                onClick={() => {
                                  const updated = [...newCategories];
                                  updated[catIdx].options = updated[catIdx].options.filter((_, j) => j !== optIdx);
                                  setNewCategories(updated);
                                }}
                                className="p-2 rounded-xl bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updated = [...newCategories];
                            updated[catIdx].options.push('');
                            setNewCategories(updated);
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                        >
                          <PlusCircle className="w-3 h-3" /> Add Candidate for {cat.title || 'Position'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setNewCategories([...newCategories, { title: '', options: ['', ''] }])}
                    className="w-full py-2.5 rounded-2xl border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" /> Add New Position / Category
                  </button>
                </div>
              )}

              {/* Tracking Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Duplicate Vote Tracking Criteria
                </label>
                <select
                  value={newTracking}
                  onChange={(e) => setNewTracking(e.target.value as TrackingMethod)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm bg-white"
                >
                  {TRACKING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  {TRACKING_OPTIONS.find((o) => o.value === newTracking)?.description}
                </p>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Poll Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Days', val: durDays, set: setDurDays },
                    { label: 'Hours', val: durHours, set: setDurHours },
                    { label: 'Minutes', val: durMinutes, set: setDurMinutes },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <p className="text-[10px] text-slate-500 font-semibold text-center mb-1">{label}</p>
                      <input type="number" min={0} value={val}
                        onChange={(e) => set(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full glass-input rounded-2xl px-3 py-2.5 text-sm text-center" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Results Visibility */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Make Results Public Immediately</p>
                  <p className="text-xs text-slate-400">Voters can see live tallies from the moment polls open.</p>
                </div>
                <button onClick={() => setNewIsPublic(!newIsPublic)} type="button"
                  className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${newIsPublic ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${newIsPublic ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* Flexible Voter Whitelist Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-500" /> Restrict Access to Allowed Voter Whitelist
                    </p>
                    <p className="text-xs text-slate-400">Only specific emails, phone numbers, or student IDs can vote.</p>
                  </div>
                  <button onClick={() => setNewRequireWhitelist(!newRequireWhitelist)} type="button"
                    className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${newRequireWhitelist ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${newRequireWhitelist ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {newRequireWhitelist && (
                  <div className="pt-2 animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Allowed Identifiers (Emails, Student IDs, or Phones)
                    </label>
                    <textarea
                      rows={3}
                      value={newAllowedVotersText}
                      onChange={(e) => setNewAllowedVotersText(e.target.value)}
                      placeholder="Paste allowed emails or IDs separated by commas or new lines...&#10;e.g.&#10;student1@univ.edu&#10;STU-884920&#10;+1234567890"
                      className="w-full glass-input rounded-2xl px-4 py-2.5 text-xs resize-none font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Separate each authorized voter email or ID with a comma or new line.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Locked Action Footer */}
            <div className="p-6 border-t shrink-0 flex gap-3 bg-slate-50">
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm transition-all">
                Cancel
              </button>
              <button onClick={handleCreatePoll} disabled={isCreating}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> Create Poll</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Active Poll Modal ────────────────────────────────────────── */}
      {editingPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-xl flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="p-6 border-b shrink-0 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" /> Edit Active Poll
              </h2>
              <button onClick={() => setEditingPoll(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Poll Title *</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm resize-none"
                />
              </div>

              {/* Candidates & Categories Editing */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div>
                  <p className="text-xs font-bold text-indigo-900">Multi-Position Election (Optional)</p>
                  <p className="text-[11px] text-indigo-600">Vote for multiple offices (e.g. President, Vice President) on one ballot.</p>
                </div>
                <button type="button" onClick={() => setEditUseCategories(!editUseCategories)}
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${editUseCategories ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${editUseCategories ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {!editUseCategories ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Voting Options / Candidates *</label>
                  <div className="space-y-2">
                    {editOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={opt} onChange={(e) => {
                          const updated = [...editOptions]; updated[i] = e.target.value; setEditOptions(updated);
                        }} placeholder={`Candidate ${i + 1}`} className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-sm" />
                        {editOptions.length > 2 && (
                          <button onClick={() => setEditOptions(editOptions.filter((_, j) => j !== i))}
                            className="p-2.5 rounded-2xl bg-red-50 border border-red-200 text-red-400 hover:text-red-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setEditOptions([...editOptions, ''])}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 transition-colors">
                      <PlusCircle className="w-3.5 h-3.5" /> Add Candidate Option
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Election Positions &amp; Candidates *
                  </label>
                  {editCategories.map((cat, catIdx) => (
                    <div key={catIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          value={cat.title}
                          onChange={(e) => {
                            const updated = [...editCategories];
                            updated[catIdx].title = e.target.value;
                            setEditCategories(updated);
                          }}
                          placeholder="Position Title (e.g. President)"
                          className="font-bold text-sm bg-white border border-slate-300 rounded-xl px-3 py-1.5 flex-1"
                        />
                        {editCategories.length > 1 && (
                          <button
                            onClick={() => setEditCategories(editCategories.filter((_, j) => j !== catIdx))}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 pl-2">
                        {cat.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex gap-2">
                            <input
                              value={opt}
                              onChange={(e) => {
                                const updated = [...editCategories];
                                updated[catIdx].options[optIdx] = e.target.value;
                                setEditCategories(updated);
                              }}
                              placeholder={`Candidate ${optIdx + 1} for ${cat.title || 'Position'}`}
                              className="flex-1 glass-input rounded-xl px-3 py-2 text-xs bg-white"
                            />
                            {cat.options.length > 2 && (
                              <button
                                onClick={() => {
                                  const updated = [...editCategories];
                                  updated[catIdx].options = updated[catIdx].options.filter((_, j) => j !== optIdx);
                                  setEditCategories(updated);
                                }}
                                className="p-2 rounded-xl bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updated = [...editCategories];
                            updated[catIdx].options.push('');
                            setEditCategories(updated);
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
                        >
                          <PlusCircle className="w-3 h-3" /> Add Candidate for {cat.title || 'Position'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditCategories([...editCategories, { title: '', options: ['', ''] }])}
                    className="w-full py-2.5 rounded-2xl border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" /> Add New Position / Category
                  </button>
                </div>
              )}

              {/* Duplicate Vote Tracking Criteria */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Duplicate Vote Tracking Criteria
                </label>
                <select
                  value={editTracking}
                  onChange={(e) => setEditTracking(e.target.value as TrackingMethod)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm bg-white"
                >
                  {TRACKING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Expiration Date & Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Expiration Date & Time *</label>
                <input
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3 text-sm bg-white"
                />
              </div>

              {/* Live Results Switch */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Live Results Publicly Visible</p>
                  <p className="text-xs text-slate-400">Toggle whether voters can inspect live tallies.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsPublic(!editIsPublic)}
                  className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${editIsPublic ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${editIsPublic ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* Flexible Voter Whitelist Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-500" /> Restrict Access to Allowed Voter Whitelist
                    </p>
                    <p className="text-xs text-slate-400">Only specific emails, phone numbers, or student IDs can vote.</p>
                  </div>
                  <button onClick={() => setEditRequireWhitelist(!editRequireWhitelist)} type="button"
                    className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${editRequireWhitelist ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${editRequireWhitelist ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {editRequireWhitelist && (
                  <div className="pt-2 animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Allowed Identifiers (Emails, Student IDs, or Phones)
                    </label>
                    <textarea
                      rows={3}
                      value={editAllowedVotersText}
                      onChange={(e) => setEditAllowedVotersText(e.target.value)}
                      placeholder="Paste allowed emails or IDs separated by commas or new lines...&#10;e.g.&#10;student1@univ.edu&#10;STU-884920&#10;+1234567890"
                      className="w-full glass-input rounded-2xl px-4 py-2.5 text-xs resize-none font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Separate each authorized voter email or ID with a comma or new line.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t shrink-0 flex gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingPoll(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePoll}
                disabled={isUpdating}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Confirmation Modal ────────────────────────────── */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Delete Account?</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete your account? This will permanently remove all your created polls, votes, and data. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Modal ────────────────────────────────────────────────────── */}
      {shareLink && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" /> Share Voting Link
              </h2>
              <button onClick={() => setShareLink(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">Share this link with eligible voters:</p>
            <div className="flex gap-2">
              <input readOnly value={shareLink} className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-xs font-mono text-slate-600" />
              <button onClick={handleCopy}
                className={`px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all shrink-0 ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a href={shareLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold text-xs transition-all">
              <ExternalLink className="w-3.5 h-3.5" /> Open Voting Page
            </a>
          </div>
        </div>
      )}

      {/* ── QR Code Modal ──────────────────────────────────────────────────── */}
      {qrModalPoll && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" /> Voting QR Code
              </h2>
              <button onClick={() => setQrModalPoll(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-sm font-extrabold text-slate-900 line-clamp-1">{qrModalPoll.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">Scan with any smartphone camera to open ballot</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 inline-block shadow-inner mx-auto">
              <QRCodeCanvas
                id="ballotly-qr-code-canvas"
                value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/vote/${qrModalPoll.id}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2">
              <button
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
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download QR Code Image (PNG)
              </button>

              <button
                onClick={async () => {
                  const url = `${window.location.origin}/vote/${qrModalPoll.id}`;
                  await navigator.clipboard.writeText(url);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                }}
                className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                {qrCopied ? 'Copied Link!' : 'Copy Direct Voting Link'}
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
    <div className="glass-panel p-6 rounded-3xl space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-slate-900 text-base">{poll.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              !isActive ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              {!isActive ? 'CLOSED' : 'ACTIVE'}
            </span>
            {poll.requireWhitelist && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> RESTRICTED
              </span>
            )}
          </div>
          {poll.description && <p className="text-xs text-slate-400 line-clamp-1">{poll.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isActive && (
            <button
              onClick={() => onEdit(poll)}
              className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 transition-colors"
              title="Edit poll details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onOpenQr(poll)}
            className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors" title="View & Download QR Code">
            <QrCode className="w-4 h-4" />
          </button>
          <button onClick={() => onShare(poll.id)}
            className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-500 hover:bg-blue-100 transition-colors" title="Share voting link">
            <Share2 className="w-4 h-4" />
          </button>
          <Link href={`/dashboard/polls/${poll.id}/results`}
            className="p-2 rounded-xl bg-violet-50 border border-violet-100 text-violet-500 hover:bg-violet-100 transition-colors" title="View detailed results">
            <BarChart3 className="w-4 h-4" />
          </Link>
          <button onClick={() => onDelete(poll.id)}
            className="p-2 rounded-xl bg-red-50 border border-red-100 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors" title="Delete poll">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" />
          <strong className="text-slate-700">{poll.voteCount}</strong> votes
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {!isActive ? 'Closed' : 'Closes'} {expiresLabel}
        </span>
        <span className="bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
          {trackingLabel(poll.trackingMethod)}
        </span>
      </div>

      {/* Options chips */}
      <div className="flex flex-wrap gap-2">
        {poll.options.map((opt) => (
          <span key={opt} className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            {opt}
          </span>
        ))}
      </div>

      {/* Results toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {poll.isResultPublic ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
          Live results: <span className={`font-bold ${poll.isResultPublic ? 'text-emerald-600' : 'text-slate-500'}`}>
            {poll.isResultPublic ? 'PUBLIC' : 'PRIVATE'}
          </span>
        </div>
        <button
          onClick={() => onToggleResults(poll.id)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
            poll.isResultPublic
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
        >
          {poll.isResultPublic ? 'Make Private' : 'Make Public'}
        </button>
      </div>
    </div>
  );
}
