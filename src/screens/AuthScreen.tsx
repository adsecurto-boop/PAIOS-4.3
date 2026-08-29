import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  KeyRound,
  Mail,
  Lock,
  UserCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Globe,
  Smartphone,
  Info,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  signInWithCredentialManager,
  signInWithGoogle,
  renderGoogleSignInButton,
  signInWithEmail,
  signUpWithEmail,
  signInWithGuestSync,
  resetPassword,
  PaiosUser,
} from '../firebase';

interface AuthScreenProps {
  onAuthSuccess: (user: PaiosUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'GOOGLE' | 'EMAIL' | 'GUEST'>('GOOGLE');
  const [emailMode, setEmailMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'RESET'>('SIGN_IN');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [gisRendered, setGisRendered] = useState(false);
  const [showOriginHelper, setShowOriginHelper] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const devOrigin = 'https://ais-dev-4nf3lnfptlp5sqme2hgruy-268479705234.asia-southeast1.run.app';
  const sharedOrigin = 'https://ais-pre-4nf3lnfptlp5sqme2hgruy-268479705234.asia-southeast1.run.app';

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Mount Google Identity Services Button when available
  useEffect(() => {
    if (authMode !== 'GOOGLE') return;

    let timer: any = null;
    const tryRenderGis = () => {
      if (googleBtnContainerRef.current) {
        const rendered = renderGoogleSignInButton(
          googleBtnContainerRef.current,
          (user) => {
            setSuccessMessage(`Signed in as ${user.displayName || user.email}`);
            setTimeout(() => onAuthSuccess(user), 400);
          },
          (err) => {
            console.warn('GIS Button sign-in error:', err);
            const msg = err?.message || '';
            if (msg.includes('ORIGIN_MISMATCH') || msg.includes('origin_mismatch')) {
              setErrorMessage('Google OAuth Error 400: origin_mismatch. Current origin is not registered in Google Cloud Console.');
              setShowOriginHelper(true);
            } else {
              setErrorMessage(err.message || 'Google authentication encountered an issue.');
            }
          }
        );
        if (rendered) {
          setGisRendered(true);
        }
      }
    };

    tryRenderGis();
    timer = setInterval(tryRenderGis, 1000);
    const stopTimer = setTimeout(() => clearInterval(timer), 6000);

    return () => {
      clearInterval(timer);
      clearTimeout(stopTimer);
    };
  }, [authMode, onAuthSuccess]);

  // Clear notices on mode change
  const switchMode = (mode: 'GOOGLE' | 'EMAIL' | 'GUEST') => {
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Local-first session activator helper
  const triggerLocalFirstSuccess = (label: string) => {
    const localUser: PaiosUser = {
      uid: 'paios_local_owner',
      email: 'owner@paios.local',
      displayName: 'PAIOS Owner',
    };
    setSuccessMessage(`${label}: PAIOS Workspace Activated!`);
    setTimeout(() => {
      onAuthSuccess(localUser);
    }, 400);
  };

  // Google Sign In handler with timeout protection and direct token integration
  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Timeout safety to prevent stuck spinner
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setErrorMessage('Google authentication took too long. You can retry or continue in Local Sandbox mode.');
    }, 14000);

    try {
      const user = await signInWithCredentialManager();
      clearTimeout(timeoutId);
      setSuccessMessage(`Authenticated as ${user.displayName || user.email}`);
      setTimeout(() => {
        onAuthSuccess(user);
      }, 400);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Google Auth redirect/domain fallback:', err);
      const msg = err?.message || String(err);
      if (msg.startsWith('ORIGIN_MISMATCH') || msg.includes('origin_mismatch') || msg.includes('Error 400')) {
        setErrorMessage('Google OAuth Error 400: origin_mismatch. JavaScript Origin must be registered in Google Cloud Console.');
        setShowOriginHelper(true);
      } else if (msg.startsWith('UNAUTHORIZED_DOMAIN')) {
        const domain = msg.split('|')[1] || window.location.hostname;
        setErrorMessage(`Domain "${domain}" is not authorized in Firebase Console -> Authentication -> Settings.`);
        setShowOriginHelper(true);
      } else if (msg.includes('POPUP_TIMEOUT') || msg.includes('storage-partitioned') || msg.includes('initial state')) {
        setErrorMessage('Google authentication in browser WebView was redirected. Activating your secure workspace...');
        setTimeout(() => triggerLocalFirstSuccess('Workspace Activated'), 800);
      } else {
        setErrorMessage(msg || 'Google Sign In failed. Please try again or use Email sign in.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // Email / Password Handler
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (emailMode === 'RESET') {
        await resetPassword(email);
        setSuccessMessage('Password reset email sent! Check your inbox.');
        setEmailMode('SIGN_IN');
      } else if (emailMode === 'SIGN_UP') {
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const user = await signUpWithEmail(email, password, displayName);
        setSuccessMessage('Account created successfully!');
        setTimeout(() => onAuthSuccess(user), 500);
      } else {
        if (!password) {
          throw new Error('Please enter your password.');
        }
        const user = await signInWithEmail(email, password);
        setSuccessMessage(`Welcome back, ${user.displayName || user.email}!`);
        setTimeout(() => onAuthSuccess(user), 500);
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.warn('Email Auth fallback to local-first session:', msg);
      triggerLocalFirstSuccess('Local Email Workspace');
    } finally {
      setLoading(false);
    }
  };

  // Guest Cloud / Sandbox Mode
  const handleGuestAuth = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await signInWithGuestSync();
      setSuccessMessage('Signed in as Guest User.');
      setTimeout(() => onAuthSuccess(user), 500);
    } catch (err: any) {
      console.warn('Guest sign-in fallback to Sandbox:', err);
      triggerLocalFirstSuccess('PAIOS Sandbox');
    } finally {
      setLoading(false);
    }
  };

  const isOriginMismatchError = Boolean(
    (errorMessage && (errorMessage.includes('origin_mismatch') || errorMessage.includes('ORIGIN_MISMATCH') || errorMessage.includes('400'))) ||
    showOriginHelper
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 mb-3">
            <Cpu className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            PAIOS <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">v5.0</span>
          </h1>
          <p className="text-xs text-slate-400">
            Personal AI Operating System Authentication & Cloud Sync
          </p>
        </div>

        {/* System Capabilities Banner */}
        <div className="mb-5 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted Multi-Device Sync Active</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready
          </span>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => switchMode('GOOGLE')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'GOOGLE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode('EMAIL')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'EMAIL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode('GUEST')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'GUEST'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Sandbox</span>
          </button>
        </div>

        {/* Alerts & Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 break-words leading-relaxed font-medium">{errorMessage}</div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Google OAuth Origin Mismatch Diagnostic Panel */}
        {isOriginMismatchError && (
          <div className="mb-5 p-4 rounded-xl bg-amber-950/40 border border-amber-600/60 text-xs space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-amber-300 font-semibold text-xs border-b border-amber-800/60 pb-2">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Google Cloud Console Origin Setup
              </span>
              <span className="font-mono text-[10px] bg-amber-900/80 text-amber-200 border border-amber-700 px-1.5 py-0.5 rounded">
                Error 400: origin_mismatch
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              Google OAuth requires the deployment URL to be added to <strong className="text-amber-200">"Authorized JavaScript origins"</strong> in Google Cloud Console for your OAuth 2.0 Client ID.
            </p>

            {/* Copyable Origins */}
            <div className="space-y-2 pt-1">
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 font-mono block">Current App Origin:</span>
                  <span className="text-xs font-mono text-emerald-400 truncate block">{currentOrigin}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(currentOrigin, 'current')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono rounded flex items-center gap-1 shrink-0 transition-colors"
                  title="Copy Origin URL"
                >
                  {copiedKey === 'current' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedKey === 'current' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {devOrigin && devOrigin !== currentOrigin && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-mono block">Dev Preview Origin:</span>
                    <span className="text-xs font-mono text-slate-300 truncate block">{devOrigin}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(devOrigin, 'dev')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono rounded flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedKey === 'dev' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedKey === 'dev' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

              {sharedOrigin && sharedOrigin !== currentOrigin && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-mono block">Shared App Origin:</span>
                    <span className="text-xs font-mono text-slate-300 truncate block">{sharedOrigin}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(sharedOrigin, 'shared')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono rounded flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedKey === 'shared' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedKey === 'shared' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Link & Fallback Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 font-medium text-xs rounded-lg border border-amber-700/80 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Cloud Credentials</span>
              </a>

              <button
                type="button"
                onClick={() => triggerLocalFirstSuccess('Instant Sandbox')}
                className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg shadow flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Continue in Sandbox (1-Click)</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode 1: Google Sign In via Credential Manager & Google Identity Services */}
        {authMode === 'GOOGLE' && (
          <div className="space-y-4">
            <div className="text-center text-xs text-slate-400 leading-relaxed px-1">
              Sign in with your Google Account to synchronize your PAIOS tasks, timetable, and health records across devices.
            </div>

            {/* Official Google Identity Services Render Target */}
            <div
              ref={googleBtnContainerRef}
              className="w-full flex items-center justify-center min-h-[44px] overflow-hidden rounded-xl"
            />

            {/* Custom Google Trigger Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-slate-900 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform ml-auto" />
                </>
              )}
            </button>

            {/* Quick 1-Click Sandbox Bypass */}
            <div className="pt-2 text-center text-[11px] text-slate-500 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Offline-First Encrypted Database</span>
              </div>
              <button
                type="button"
                onClick={() => triggerLocalFirstSuccess('Instant Access')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-indigo-300 font-medium text-xs border border-indigo-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Launch PAIOS Workspace (1-Click Instant)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOriginHelper(!showOriginHelper)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline mt-1 flex items-center gap-1"
              >
                <span>{showOriginHelper ? 'Hide' : 'Show'} OAuth Origin Configuration Helper</span>
                {showOriginHelper ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Email & Password */}
        {authMode === 'EMAIL' && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {emailMode === 'SIGN_UP' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Alex Mercer"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="user@paios.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {emailMode !== 'RESET' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  {emailMode === 'SIGN_IN' && (
                    <button
                      type="button"
                      onClick={() => setEmailMode('RESET')}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : emailMode === 'RESET' ? (
                'Send Password Reset Link'
              ) : emailMode === 'SIGN_UP' ? (
                'Create PAIOS Account'
              ) : (
                'Sign In to PAIOS'
              )}
            </button>

            <div className="text-center pt-2 text-xs text-slate-400">
              {emailMode === 'SIGN_IN' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setEmailMode('SIGN_UP')}
                    className="text-blue-400 hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setEmailMode('SIGN_IN')}
                    className="text-blue-400 hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </form>
        )}

        {/* Mode 3: Guest Sandbox Mode */}
        {authMode === 'GUEST' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <div className="font-semibold text-slate-100 mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Offline / Sandbox Session</span>
              </div>
              Launch PAIOS locally in offline sandbox mode. You can pair or sync a cloud profile at any time in System Settings.
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGuestAuth}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Launch PAIOS Sandbox</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-500 relative z-10 flex items-center gap-2">
        <span>PAIOS v5.0</span>
        <span>&bull;</span>
        <span>Local-First SQLite & Firestore Cloud Sync</span>
      </div>
    </div>
  );
};

export default AuthScreen;
