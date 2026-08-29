import React, { useState, useEffect } from 'react';
import { Cloud, LogOut, RefreshCw, Sparkles, ShieldCheck, Mail, UserCheck, ArrowRight, Lock, CheckCircle2, AlertTriangle, User, ExternalLink, Smartphone, WifiOff, HardDrive } from 'lucide-react';
import { PAIOSStorage } from '../storage';
import {
  auth,
  signInWithGoogle,
  signInWithSystemBrowserRedirect,
  signInWithGuestSync,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  logOut,
  onAuthChange,
  listenToCloudData,
  syncLocalToCloud,
  isQuotaExceeded,
  PaiosUser,
} from '../firebase';

interface CloudSyncBannerProps {
  onSyncComplete?: () => void;
  compact?: boolean;
}

export const CloudSyncBanner: React.FC<CloudSyncBannerProps> = ({ onSyncComplete, compact }) => {
  const [currentUser, setCurrentUser] = useState<PaiosUser | null>(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(isQuotaExceeded());
  const [isOnline, setIsOnline] = useState(PAIOSStorage.isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState(PAIOSStorage.getPendingSyncCount());

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    const handleStorageChange = () => setPendingSyncCount(PAIOSStorage.getPendingSyncCount());
    const handleNetworkChange = (e: any) => {
      setIsOnline(e.detail?.online ?? navigator.onLine);
      if (e.detail?.online && currentUser) {
        syncLocalToCloud(currentUser.uid).then(() => PAIOSStorage.clearPendingSyncQueue());
      }
    };

    window.addEventListener('paios_quota_exceeded', handleQuota);
    window.addEventListener('paios_storage_change', handleStorageChange);
    window.addEventListener('paios_network_status_change', handleNetworkChange as EventListener);

    return () => {
      window.removeEventListener('paios_quota_exceeded', handleQuota);
      window.removeEventListener('paios_storage_change', handleStorageChange);
      window.removeEventListener('paios_network_status_change', handleNetworkChange as EventListener);
    };
  }, [currentUser]);

  // Auth Tabs State
  const [authMethod, setAuthMethod] = useState<'google' | 'email' | 'guest'>('google');
  const [emailMode, setEmailMode] = useState<'signup' | 'signin' | 'reset'>('signup');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    const unsubAuth = onAuthChange((user) => {
      setCurrentUser(user);
      if (user) {
        setIsSyncing(true);
        // Start listening to Firestore cloud updates for this user
        const unsubCloud = listenToCloudData(user.uid, () => {
          setIsSyncing(false);
          if (onSyncComplete) onSyncComplete();
        });
        return () => unsubCloud();
      }
    });

    return () => unsubAuth();
  }, []);

  const handleSignInGoogle = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      setSuccessMsg(`Welcome ${user.displayName || user.email}! Google Auth & Firestore Cloud Sync active.`);
    } catch (err: any) {
      console.error('Google SSO Sign In error:', err);
      setErrorMsg(err.message || 'Google SSO sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await signInWithGuestSync();
      setCurrentUser(user);
      setSuccessMsg('Connected to Guest Cloud Sync with Firestore!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Guest Cloud Sync failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (emailMode === 'signup') {
        if (!passwordInput || passwordInput.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const user = await signUpWithEmail(emailInput.trim(), passwordInput, nameInput.trim());
        setCurrentUser(user);
        setSuccessMsg(`Account created for ${user.email}! Firestore cloud sync initialized.`);
      } else if (emailMode === 'signin') {
        if (!passwordInput) {
          throw new Error('Please enter your password.');
        }
        const user = await signInWithEmail(emailInput.trim(), passwordInput);
        setCurrentUser(user);
        setSuccessMsg(`Welcome back ${user.displayName || user.email}! Cloud data synced.`);
      } else if (emailMode === 'reset') {
        await resetPassword(emailInput.trim());
        setSuccessMsg('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logOut();
      setCurrentUser(null);
      setSuccessMsg('Signed out of Firebase Cloud Sync.');
    } catch (err: any) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualForceSync = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    await syncLocalToCloud(currentUser.uid);
    setTimeout(() => {
      setIsSyncing(false);
      setSuccessMsg('All tasks, activities, cards, and journals pushed to Firestore.');
    }, 800);
  };

  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedOriginKey, setCopiedOriginKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedOriginKey(key);
      setTimeout(() => setCopiedOriginKey(null), 2000);
    } else {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const isOriginMismatchError = Boolean(errorMsg && (errorMsg.startsWith('ORIGIN_MISMATCH|') || errorMsg.includes('origin_mismatch')));
  const mismatchOrigin = (isOriginMismatchError && errorMsg?.startsWith('ORIGIN_MISMATCH|')) ? errorMsg.split('|')[1] : (typeof window !== 'undefined' ? window.location.origin : '');

  const isUnauthorizedDomainError = Boolean(errorMsg && errorMsg.startsWith('UNAUTHORIZED_DOMAIN|'));
  const unauthorizedDomain = (isUnauthorizedDomainError && errorMsg) ? errorMsg.split('|')[1] : '';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {currentUser ? (
          <div className="flex items-center gap-2 bg-slate-800/90 border border-emerald-800/60 rounded-xl px-2.5 py-1 text-xs">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="User" className="w-5 h-5 rounded-full border border-emerald-500/50" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
                {currentUser.displayName ? currentUser.displayName[0] : 'U'}
              </div>
            )}
            <div className="hidden md:flex flex-col">
              <span className="text-[11px] font-semibold text-slate-200 leading-tight truncate max-w-[100px]">
                {currentUser.displayName || currentUser.email}
              </span>
              <span className={`text-[9px] font-mono flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                {isOnline ? 'Local-First Cache Active' : 'Offline Mode (Local Cache)'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-rose-300 rounded transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignInGoogle}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loading ? 'Connecting...' : 'Google SSO'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
              <span>Google Sign-In & Firestore Realtime Cloud Sync</span>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
                100% Free & Secure
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Robust multi-device sync replacing old passcodes with official Google Auth and Firestore cloud persistence.
            </p>
          </div>
        </div>
      </div>

      {quotaExceeded && (
        <div className="p-3.5 bg-amber-950/70 border border-amber-700/80 rounded-xl text-amber-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 block">Firestore Limit Notice</span>
            <p className="text-[11px] text-slate-300">
              Your app is currently running in local storage mode. All changes are saved safely on device and will re-sync automatically.
            </p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isOriginMismatchError && (
        <div className="p-4 bg-amber-950/50 border border-amber-600/70 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between text-amber-300 font-bold text-sm border-b border-amber-800/60 pb-2">
            <span className="flex items-center gap-1.5">
              <span>⚠️ Google OAuth Error 400: origin_mismatch</span>
            </span>
            <span className="text-[10px] bg-amber-900/80 border border-amber-600 px-2 py-0.5 rounded font-mono">
              Google Cloud Console
            </span>
          </div>

          <p className="text-slate-300 text-[11px] leading-relaxed">
            Google Identity Services requires the deployment domain to be registered under <strong className="text-amber-200">"Authorized JavaScript origins"</strong> in Google Cloud Console Credentials.
          </p>

          <div className="space-y-2 pt-1">
            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-mono block">Current App Origin:</span>
                <span className="text-xs font-mono text-emerald-400 truncate block">{mismatchOrigin || window.location.origin}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(mismatchOrigin || window.location.origin, 'current')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono rounded flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>{copiedOriginKey === 'current' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-mono block">Dev Preview URL:</span>
                <span className="text-xs font-mono text-slate-300 truncate block">https://ais-dev-4nf3lnfptlp5sqme2hgruy-268479705234.asia-southeast1.run.app</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('https://ais-dev-4nf3lnfptlp5sqme2hgruy-268479705234.asia-southeast1.run.app', 'dev')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono rounded flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>{copiedOriginKey === 'dev' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-mono block">Shared App URL:</span>
                <span className="text-xs font-mono text-slate-300 truncate block">https://ais-pre-4nf3lnfptlp5sqme2hgruy-268479705234.asia-southeast1.run.app</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('https://ais-pre-4nf3lnfptlp5sqme2hgruy-268479705234.asia-southeast1.run.app', 'shared')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono rounded flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>{copiedOriginKey === 'shared' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-700 text-white font-medium text-xs rounded transition-colors flex items-center gap-1"
            >
              <span>Open Google Cloud Credentials</span>
            </a>
            <button
              onClick={handleGuestSignIn}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-colors"
            >
              Use Instant Cloud Sync
            </button>
          </div>
        </div>
      )}

      {isUnauthorizedDomainError && (
        <div className="p-4 bg-amber-950/50 border border-amber-700/60 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between text-amber-300 font-bold text-sm">
            <span>⚠️ Domain Authorization Needed in Firebase</span>
            <span className="text-[10px] bg-amber-900/80 border border-amber-600 px-2 py-0.5 rounded font-mono">
              auth/unauthorized-domain
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Google SSO requires adding domain authorization in Firebase. Copy your domain <code className="text-amber-300 font-mono bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">{unauthorizedDomain || window.location.hostname}</code> and paste it in Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-mono text-emerald-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-xs">
              {unauthorizedDomain || window.location.hostname}
            </span>
            <button
              onClick={() => copyToClipboard(unauthorizedDomain || window.location.hostname)}
              className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded text-xs font-mono transition-colors"
            >
              {copiedDomain ? 'Copied Domain!' : 'Copy Domain'}
            </button>
            <button
              onClick={handleGuestSignIn}
              disabled={loading}
              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-colors"
            >
              Use Instant Cloud Sync
            </button>
          </div>
        </div>
      )}

      {errorMsg && !isUnauthorizedDomainError && !isOriginMismatchError && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {currentUser ? (
        <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-emerald-500/80 shadow" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-base">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{currentUser.displayName || 'Google User'}</span>
                  <span className="text-[10px] font-mono bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Firestore Live Sync Active
                  </span>
                </div>
                <span className="text-xs text-slate-400">{currentUser.email || 'Cloud Account'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleManualForceSync}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                onClick={handleSignOut}
                disabled={loading}
                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/80 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-2 border-t border-emerald-900/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Your PAIOS tasks, timeline, cards, and journals are automatically saved in Firestore under your user account ID.
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
          {/* Auth Method Navigation */}
          <div className="flex border-b border-slate-800 pb-2 gap-2 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setAuthMethod('google')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                authMethod === 'google'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google Sign-In (Recommended)</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                authMethod === 'email'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email & Password</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMethod('guest')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                authMethod === 'guest'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Instant Cloud Sync</span>
            </button>
          </div>

          {authMethod === 'google' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your Google Account for free, secure, automatic Firestore data synchronization across all your web browser sessions & Android app.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={handleSignInGoogle}
                  disabled={loading}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>

                <button
                  onClick={() => signInWithSystemBrowserRedirect()}
                  type="button"
                  className="px-4 py-2.5 bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-700/80 transition-all flex items-center gap-1.5 shadow"
                  title="Opens login in your default system web browser to prevent WebView restrictions"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch System Browser Auth</span>
                </button>

                <button
                  onClick={handleGuestSignIn}
                  disabled={loading}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guest Sync</span>
                </button>
              </div>

              <div className="mt-3 p-3 bg-slate-900/90 border border-indigo-900/50 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-slate-300 text-[11px]">
                    <span className="font-bold text-white block">Dedicated Android App Ready</span>
                    <span>Syncs with the exact same Firestore database schema (`user_data`) seamlessly across phone & web.</span>
                  </div>
                </div>
                <a
                  href="/manifest.json"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-mono hover:bg-emerald-900 transition-colors shrink-0"
                >
                  Android Manifest
                </a>
              </div>
            </div>
          ) : authMethod === 'email' ? (
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-200">
                  {emailMode === 'signup'
                    ? 'Create Firebase Cloud Sync Account'
                    : emailMode === 'signin'
                    ? 'Sign In to Your Firebase Account'
                    : 'Reset Account Password'}
                </span>

                <div className="flex items-center gap-2 text-[11px]">
                  {emailMode !== 'signup' && (
                    <button
                      type="button"
                      onClick={() => { setEmailMode('signup'); setErrorMsg(null); }}
                      className="text-indigo-400 hover:underline font-semibold"
                    >
                      Need an account? Sign Up
                    </button>
                  )}
                  {emailMode !== 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setEmailMode('signin'); setErrorMsg(null); }}
                      className="text-indigo-400 hover:underline font-semibold"
                    >
                      Already registered? Sign In
                    </button>
                  )}
                </div>
              </div>

              {emailMode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Display Name</label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. Alex"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {emailMode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-400">Password</label>
                    {emailMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setEmailMode('reset'); setErrorMsg(null); }}
                        className="text-[10px] text-slate-500 hover:text-indigo-400"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span>
                    {loading
                      ? 'Processing...'
                      : emailMode === 'signup'
                      ? 'Create Account & Sync'
                      : emailMode === 'signin'
                      ? 'Sign In & Sync'
                      : 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect anonymously with Firebase Cloud Sync. No account registration needed.
              </p>

              <button
                type="button"
                onClick={handleGuestSignIn}
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Activate Guest Cloud Sync</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
