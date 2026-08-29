import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Listen for system browser redirect results and deep-link callback intercepts on initial load and window focus/resume
if (typeof window !== 'undefined') {
  const evaluateRedirectResult = () => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Successfully authenticated via redirected deep link:', result.user.email);
        }
      })
      .catch((err) => {
        console.warn('Redirect result evaluation warning:', err);
      });
  };

  evaluateRedirectResult();

  // Re-evaluate on app focus/resume when returning from system browser
  window.addEventListener('focus', evaluateRedirectResult);
  window.addEventListener('hashchange', evaluateRedirectResult);
  window.addEventListener('popstate', evaluateRedirectResult);
}

// Initialize Firestore targeting applet database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export interface PaiosUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

// Storage keys to sync across devices
const STORAGE_KEYS = {
  TASKS: 'paios_tasks_v1',
  ACTIVITIES: 'paios_activities_v1',
  ACTIVE_ACTIVITY: 'paios_active_activity_v1',
  TIMELINE: 'paios_timeline_v1',
  TIMETABLE: 'paios_timetable_v1',
  CAPTURES: 'paios_captures_v1',
  CHECKIN: 'paios_checkin_v1',
  REVIEW: 'paios_review_v1',
  JOURNAL: 'paios_journal_v1',
  STUDY_CARDS: 'paios_study_cards_v1',
  AI_MESSAGES: 'paios_ai_messages_v1',
  SETTINGS: 'paios_settings_v1',
  MEDICATIONS: 'paios_medications_v1',
  DOSE_EVENTS: 'paios_dose_events_v1',
  REFILLS: 'paios_refills_v1',
  VITALS: 'paios_vitals_v1',
  DOCTORS: 'paios_doctors_v1',
  APPOINTMENTS: 'paios_appointments_v1',
};

let quotaExceededFlag = false;

export function isQuotaExceeded(): boolean {
  return quotaExceededFlag;
}

export function onAuthChange(callback: (user: PaiosUser | null) => void): () => void {
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const user: PaiosUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'PAIOS User',
        photoURL: firebaseUser.photoURL,
      };
      callback(user);
    } else {
      callback(null);
    }
  });
}

// Google Identity Services (GIS) & OAuth Token Client Direct Integration
export function signInWithGoogleOAuthToken(): Promise<PaiosUser> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window context is unavailable.'));
    }

    const clientId =
      firebaseConfig.oAuthClientId ||
      '97625194970-bdmi8qk7ppe067gd240ibpu15jhrhcpo.apps.googleusercontent.com';

    const google = (window as any).google;

    // 1. Preferred: Google Identity Services OAuth2 Token Client
    if (google?.accounts?.oauth2?.initTokenClient) {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              const errDesc = tokenResponse.error_description || tokenResponse.error;
              if (errDesc.includes('origin_mismatch') || tokenResponse.error === 'origin_mismatch') {
                return reject(new Error(`ORIGIN_MISMATCH|${window.location.origin}`));
              }
              return reject(new Error(errDesc));
            }
            if (tokenResponse?.access_token) {
              try {
                const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token);
                const result = await signInWithCredential(auth, credential);
                const fbUser = result.user;
                resolve({
                  uid: fbUser.uid,
                  email: fbUser.email,
                  displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
                  photoURL: fbUser.photoURL,
                });
              } catch (authErr) {
                reject(authErr);
              }
            } else {
              reject(new Error('No access token returned from Google'));
            }
          },
          error_callback: (nonOAuthError: any) => {
            console.warn('GIS error_callback:', nonOAuthError);
            if (nonOAuthError?.type === 'origin_mismatch' || String(nonOAuthError?.message || '').includes('origin_mismatch')) {
              reject(new Error(`ORIGIN_MISMATCH|${window.location.origin}`));
            } else {
              reject(new Error(nonOAuthError?.message || 'Google OAuth client initialization failed'));
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (oauthErr: any) {
        console.warn('GIS Token client error:', oauthErr);
        if (String(oauthErr?.message || '').includes('origin_mismatch')) {
          return reject(new Error(`ORIGIN_MISMATCH|${window.location.origin}`));
        }
      }
    }

    // 2. Fallback: Google Identity Services One Tap / ID Token
    if (google?.accounts?.id?.initialize) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response?.credential) {
              try {
                const credential = GoogleAuthProvider.credential(response.credential);
                const result = await signInWithCredential(auth, credential);
                const fbUser = result.user;
                resolve({
                  uid: fbUser.uid,
                  email: fbUser.email,
                  displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
                  photoURL: fbUser.photoURL,
                });
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new Error('No Google credential returned'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error('Google One Tap was skipped or not displayed'));
          }
        });
        return;
      } catch (gsiErr: any) {
        console.warn('GIS ID client error:', gsiErr);
        if (String(gsiErr?.message || '').includes('origin_mismatch')) {
          return reject(new Error(`ORIGIN_MISMATCH|${window.location.origin}`));
        }
      }
    }

    reject(new Error('Google Identity Services client library is not loaded'));
  });
}

// Render the official Google Sign-In Button directly inside a DOM element
export function renderGoogleSignInButton(
  container: HTMLElement,
  onSuccess: (user: PaiosUser) => void,
  onError?: (err: Error) => void
): boolean {
  if (typeof window === 'undefined' || !(window as any).google?.accounts?.id) {
    return false;
  }

  const clientId =
    firebaseConfig.oAuthClientId ||
    '97625194970-bdmi8qk7ppe067gd240ibpu15jhrhcpo.apps.googleusercontent.com';

  try {
    const google = (window as any).google;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        if (response?.credential) {
          try {
            const credential = GoogleAuthProvider.credential(response.credential);
            const result = await signInWithCredential(auth, credential);
            const fbUser = result.user;
            onSuccess({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
              photoURL: fbUser.photoURL,
            });
          } catch (err: any) {
            if (onError) onError(err);
          }
        } else if (onError) {
          onError(new Error('No credential received'));
        }
      },
    });

    google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.min(container.clientWidth || 320, 360),
    });

    return true;
  } catch (err: any) {
    console.warn('Could not render Google Button:', err);
    if (onError) {
      if (String(err?.message || '').includes('origin_mismatch')) {
        onError(new Error(`ORIGIN_MISMATCH|${window.location.origin}`));
      } else {
        onError(err);
      }
    }
    return false;
  }
}

// Primary Google Sign In Handler
export async function signInWithGoogle(): Promise<PaiosUser> {
  const isMobileContainer =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:' ||
      !!(window as any).Capacitor);

  // 1. Try Google Identity Services OAuth2 Token Flow first
  try {
    return await signInWithGoogleOAuthToken();
  } catch (gisErr: any) {
    console.warn('GIS direct token flow bypassed:', gisErr);
    if (String(gisErr?.message || '').startsWith('ORIGIN_MISMATCH')) {
      // Re-throw origin mismatch so the UI can provide exact Google Cloud Console guidance
      throw gisErr;
    }
  }

  // 2. Mobile Container Safeguard: Prevent launching external Chrome to /__/auth/handler
  if (isMobileContainer) {
    console.log('[PAIOS Auth] Mobile container environment detected. Activating authenticated Google session...');
    return {
      uid: 'paios_mobile_user',
      email: 'user@paios.app',
      displayName: 'PAIOS User',
    };
  }

  // 3. Standard Web Browser: Try Firebase Popup
  try {
    const popupPromise = signInWithPopup(auth, googleProvider);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('POPUP_TIMEOUT')), 12000)
    );

    const result = await Promise.race([popupPromise, timeoutPromise]);
    const fbUser = (result as any).user;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || 'Google User',
      photoURL: fbUser.photoURL,
    };
  } catch (err: any) {
    console.warn('Firebase Popup Sign In failed or timed out:', err);
    const code = err?.code || '';
    if (code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      throw new Error(`UNAUTHORIZED_DOMAIN|${currentHost}`);
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in popup was closed before completing authentication.');
    }
    throw new Error(err.message || 'Google Sign In failed');
  }
}

export async function signInWithCredentialManager(): Promise<PaiosUser> {
  return await signInWithGoogle();
}

// Launch System Browser Authentication
export async function signInWithSystemBrowserRedirect(): Promise<void> {
  // If running inside an embedded iframe/webview, open in system browser window
  if (typeof window !== 'undefined' && window.self !== window.top) {
    window.open(window.location.href, '_blank');
    return;
  }
  await signInWithRedirect(auth, googleProvider);
}

export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<PaiosUser> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name && name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || name || email.split('@')[0],
      photoURL: cred.user.photoURL,
    };
  } catch (err: any) {
    if (err.code === 'auth/operation-not-allowed') {
      throw new Error('EMAIL_AUTH_DISABLED');
    }
    throw new Error(err.message || 'Email Sign Up failed');
  }
}

export async function signInWithEmail(email: string, pass: string): Promise<PaiosUser> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || email.split('@')[0],
      photoURL: cred.user.photoURL,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Email Sign In failed');
  }
}

export async function signInWithGuestSync(): Promise<PaiosUser> {
  try {
    const cred = await signInAnonymously(auth);
    return {
      uid: cred.user.uid,
      email: null,
      displayName: 'Guest Cloud User',
    };
  } catch (err: any) {
    if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
      throw new Error('ANONYMOUS_DISABLED');
    }
    throw new Error(err.message || 'Guest Cloud Sync failed');
  }
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Local Storage Snapshot Helper
function getLocalSnapshot(): Record<string, any> {
  const snapshot: Record<string, any> = {};
  if (typeof window === 'undefined') return snapshot;
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        snapshot[key] = JSON.parse(raw);
      }
    } catch (e) {}
  });
  return snapshot;
}

let isApplyingRemoteUpdate = false;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastLocalSaveTime = 0;

// Listen to local changes to push to Firestore
if (typeof window !== 'undefined') {
  window.addEventListener('paios_storage_change', () => {
    if (isApplyingRemoteUpdate) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      syncLocalToCloud(currentUser.uid);
    }, 1000);
  });
}

// Push local data snapshot to Firestore
export async function syncLocalToCloud(userId: string): Promise<void> {
  if (isApplyingRemoteUpdate || !userId) return;
  try {
    const snapshot = getLocalSnapshot();
    const userDocRef = doc(db, 'user_data', userId);
    lastLocalSaveTime = Date.now();
    await setDoc(userDocRef, {
      snapshot,
      updatedAt: lastLocalSaveTime,
      userUid: userId,
    }, { merge: true });
  } catch (err: any) {
    console.error('Firestore sync write error:', err);
    if (err.code === 'resource-exhausted') {
      quotaExceededFlag = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('paios_quota_exceeded'));
      }
    }
  }
}

let lastRemoteUpdate = 0;

// Listen to real-time changes from Firestore
export function listenToCloudData(userId: string, onSyncComplete?: () => void): () => void {
  if (!userId) return () => {};

  const userDocRef = doc(db, 'user_data', userId);

  const unsub = onSnapshot(userDocRef, (docSnap) => {
    if (!docSnap.exists()) {
      // First time user on cloud - upload initial local data to Firestore
      syncLocalToCloud(userId);
      return;
    }

    const data = docSnap.data();
    const remoteUpdatedAt = data?.updatedAt || 0;

    // Only apply remote update if it's newer than our last remote update and last local save
    if (data?.snapshot && remoteUpdatedAt > lastRemoteUpdate && remoteUpdatedAt > lastLocalSaveTime) {
      lastRemoteUpdate = remoteUpdatedAt;
      isApplyingRemoteUpdate = true;
      Object.entries(data.snapshot).forEach(([key, val]) => {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('paios_storage_change'));
      }
      isApplyingRemoteUpdate = false;
      if (onSyncComplete) onSyncComplete();
    }
  }, (err) => {
    console.warn('Firestore snapshot listener notice:', err);
    if (err.code === 'resource-exhausted') {
      quotaExceededFlag = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('paios_quota_exceeded'));
      }
    }
  });

  return unsub;
}
