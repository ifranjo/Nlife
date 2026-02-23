/**
 * PWA Utilities
 * Helper functions for Progressive Web App features
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Check if the app is running as an installed PWA
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if the app can be installed
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;

  // If already installed, can't install again
  if (isRunningAsPWA()) return false;

  // Check if service worker is supported
  if (!('serviceWorker' in navigator)) return false;

  return true;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('[PWA] New version available');
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('[PWA] Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check online status
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Subscribe to online/offline events
 */
export function subscribeToNetworkChanges(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return unsubscribe function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Get network connection info
 */
export function getNetworkInfo(): {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      type: 'unknown',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    };
  }

  const connection = (navigator as any).connection ||
                     (navigator as any).mozConnection ||
                     (navigator as any).webkitConnection;

  if (connection) {
    return {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 50,
      saveData: connection.saveData || false,
    };
  }

  return {
    type: 'unknown',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
  };
}

/**
 * Cache a URL for offline use
 */
export async function cacheForOffline(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('caches' in window)) return false;

  try {
    const cache = await caches.open('user-cache');
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Failed to cache URL:', error);
    return false;
  }
}

/**
 * Get cached response
 */
export async function getCachedResponse(url: string): Promise<Response | null> {
  if (typeof window === 'undefined') return null;
  if (!('caches' in window)) return null;

  try {
    const cache = await caches.open('user-cache');
    return await cache.match(url);
  } catch {
    return null;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('caches' in window)) return false;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
    return false;
  }
}

/**
 * Share content using Web Share API
 */
export async function shareContent(
  title: string,
  text: string,
  url?: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!navigator.share) return false;

  try {
    await navigator.share({
      title,
      text,
      url: url || window.location.href,
    });
    return true;
  } catch (error) {
    // User cancelled or share failed
    return false;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (navigator.storage && navigator.storage.persist) {
    const isPersistent = await navigator.storage.persist();
    console.log('[PWA] Persistent storage:', isPersistent);
    return isPersistent;
  }

  return false;
}

/**
 * Get storage usage info
 */
export async function getStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (typeof window === 'undefined') {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;

    return {
      usage,
      quota,
      percentage: quota > 0 ? Math.round((usage / quota) * 100) : 0,
    };
  }

  return { usage: 0, quota: 0, percentage: 0 };
}
