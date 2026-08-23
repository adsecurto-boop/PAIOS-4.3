// PAIOS Version Manifest & Background Update Checker
export interface VersionManifest {
  version: string;
  buildTimestamp: number;
  gitCommit: string;
  releaseNotes?: string;
  mandatory?: boolean;
}

// Current client runtime version information
export const CLIENT_VERSION: VersionManifest = {
  version: '1.0.0',
  buildTimestamp: 1787463500000,
  gitCommit: 'c9f81a2',
  releaseNotes: 'PAIOS Baseline Desktop & Mobile Client Version',
};

export type UpdateCallback = (manifest: VersionManifest) => void;
const updateListeners: Set<UpdateCallback> = new Set();

let latestAvailableManifest: VersionManifest | null = null;
let checkIntervalTimer: any = null;

/**
 * Register a listener to be notified when a new app version is available
 */
export function onVersionUpdateAvailable(callback: UpdateCallback): () => void {
  updateListeners.add(callback);
  if (latestAvailableManifest) {
    callback(latestAvailableManifest);
  }
  return () => {
    updateListeners.delete(callback);
  };
}

/**
 * Register the Service Worker in supported browser environments
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test')
  ) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker installed and waiting
              checkForAppUpdates();
            }
          };
        }
      };

      return registration;
    } catch (err) {
      console.warn('[PAIOS SW] Service worker registration deferred:', err);
    }
  }
  return null;
}

/**
 * Fetches version manifest from the server (/api/version) and checks if a newer version exists
 */
export async function checkForAppUpdates(): Promise<{ updateAvailable: boolean; serverManifest: VersionManifest | null }> {
  try {
    const res = await fetch('/api/version?t=' + Date.now(), {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!res.ok) {
      return { updateAvailable: false, serverManifest: null };
    }

    const serverManifest: VersionManifest = await res.json();

    // Determine if update is newer by comparing gitCommit, buildTimestamp, or version string
    const isNewerCommit = serverManifest.gitCommit && serverManifest.gitCommit !== CLIENT_VERSION.gitCommit;
    const isNewerTimestamp = serverManifest.buildTimestamp > CLIENT_VERSION.buildTimestamp;
    const isNewerVersionStr = serverManifest.version !== CLIENT_VERSION.version;

    const isUpdateAvailable = isNewerCommit || isNewerTimestamp || isNewerVersionStr;

    if (isUpdateAvailable) {
      latestAvailableManifest = serverManifest;
      updateListeners.forEach((cb) => cb(serverManifest));
      
      // Also trigger window custom event for components listening
      window.dispatchEvent(new CustomEvent('paios_version_update_available', {
        detail: serverManifest,
      }));
    }

    return { updateAvailable: isUpdateAvailable, serverManifest };
  } catch (err) {
    console.warn('[PAIOS AutoUpdate] Unable to fetch version manifest:', err);
    return { updateAvailable: false, serverManifest: null };
  }
}

/**
 * Initializes the background update checker at app launch
 */
export function initBackgroundVersionChecker(): void {
  // 1. Register Service Worker
  registerServiceWorker();

  // 2. Perform initial version check at launch
  checkForAppUpdates();

  // 3. Re-check whenever window regains focus
  window.addEventListener('focus', () => {
    checkForAppUpdates();
  });

  // 4. Periodically check every 4 minutes in the background
  if (!checkIntervalTimer) {
    checkIntervalTimer = setInterval(() => {
      checkForAppUpdates();
    }, 4 * 60 * 1000);
  }
}

/**
 * Prompts Service Worker to skip waiting and reloads the application to apply the latest build
 */
export function applyUpdateAndReload(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
  // Hard reload with query param to bypass browser cache
  const url = new URL(window.location.href);
  url.searchParams.set('v', Date.now().toString());
  window.location.href = url.toString();
}
