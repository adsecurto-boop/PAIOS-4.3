import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
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

// Listen for system browser redirect results on initial load
if (typeof window !== 'undefined') {
  getRedirectResult(auth)
    .then((result) => {
      if (result?.user) {
        console.log('Successfully authenticated via system browser redirect:', result.user.email);
      }
    })
    .catch((err) => {
      console.warn('System browser redirect result error:', err);
    });
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

// Sign-In Handlers
export async function signInWithGoogle(): Promise<PaiosUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName || 'Google User',
      photoURL: fbUser.photoURL,
    };
  } catch (err: any) {
    console.error('Google Popup Sign In Error:', err);
    if (err.code === 'auth/disallowed-webview' || err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      // Fallback automatically to system browser redirect
      await signInWithSystemBrowserRedirect();
      throw new Error('Redirecting to system browser for authentication...');
    }
    if (err.code === 'auth/unauthorized-domain') {
      throw new Error(`UNAUTHORIZED_DOMAIN|${window.location.hostname}`);
    }
    if (err.code === 'auth/operation-not-allowed') {
      throw new Error('EMAIL_AUTH_DISABLED');
    }
    throw new Error(err.message || 'Google Sign In failed');
  }
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
