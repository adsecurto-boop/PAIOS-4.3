import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  signInWithCredentialManager,
  signInWithGoogle,
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

  // Clear notices on mode change
  const switchMode = (mode: 'GOOGLE' | 'EMAIL' | 'GUEST') => {
    setAuthMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Google Sign In via Credential Manager API with popup/redirect fallbacks
  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await signInWithCredentialManager();
      setSuccessMessage(`Authenticated as ${user.displayName || user.email}`);
      setTimeout(() => {
        onAuthSuccess(user);
      }, 500);
    } catch (err: any) {
      console.error('Google Auth Failed:', err);
      const msg = err?.message || String(err);
      if (msg.includes('UNAUTHORIZED_DOMAIN')) {
        const domain = msg.split('|')[1] || window.location.hostname;
        setErrorMessage(
          `Domain (${domain}) is not authorized in Firebase Auth. Add it to Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else if (msg.includes('Redirecting to system browser')) {
        setSuccessMessage('Redirecting to browser for authentication...');
      } else {
        setErrorMessage(msg || 'Failed to authenticate via Google Sign-In.');
      }
    } finally {
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
      if (msg === 'EMAIL_AUTH_DISABLED') {
        setErrorMessage('Email/Password authentication is disabled in Firebase Console.');
      } else {
        setErrorMessage(msg || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Guest Cloud Mode
  const handleGuestAuth = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const user = await signInWithGuestSync();
      setSuccessMessage('Signed in as Guest User.');
      setTimeout(() => onAuthSuccess(user), 500);
    } catch (err: any) {
      if (err?.message === 'ANONYMOUS_DISABLED') {
        setErrorMessage('Guest / Anonymous sign-in is disabled in Firebase Console.');
      } else {
        setErrorMessage(err?.message || 'Failed to start guest session.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20 mb-4">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            PAIOS <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">v4.3</span>
          </h1>
          <p className="text-sm text-slate-400">
            Personal AI Operating System Authentication
          </p>
        </div>

        {/* System Capabilities Banner */}
        <div className="mb-6 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Credential Manager API Ready</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 mb-6 text-xs font-medium">
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
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 break-words leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Mode 1: Google Sign In via Credential Manager */}
        {authMode === 'GOOGLE' && (
          <div className="space-y-4">
            <div className="text-center text-xs text-slate-400 leading-relaxed px-2">
              Sign in seamlessly using your Google Account via <strong className="text-slate-200">Credential Manager API</strong> to synchronize your PAIOS tasks, timetable, and memory across Android and Web.
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
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

            <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Cross-platform cloud synchronization</span>
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
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        PAIOS 4.3 &bull; Encrypted Local Memory &bull; Firebase Auth Secured
      </div>
    </div>
  );
};
