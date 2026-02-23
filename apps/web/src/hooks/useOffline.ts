import { useState, useEffect, useCallback } from 'react';
import {
  isOnline,
  subscribeToNetworkChanges,
  getNetworkInfo,
  canInstallPWA,
  isRunningAsPWA,
  type BeforeInstallPromptEvent,
} from '../lib/pwa-utils';

interface UseOfflineReturn {
  isOnline: boolean;
  isPWA: boolean;
  canInstall: boolean;
  networkInfo: ReturnType<typeof getNetworkInfo>;
  deferredPrompt: BeforeInstallPromptEvent | null;
  installPWA: () => Promise<boolean>;
}

/**
 * Hook for managing offline/online state and PWA features
 */
export function useOffline(): UseOfflineReturn {
  const [online, setOnline] = useState<boolean>(true);
  const [isPWA, setIsPWA] = useState<boolean>(false);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [networkInfo, setNetworkInfo] = useState(getNetworkInfo());

  useEffect(() => {
    // Check initial state
    setOnline(isOnline());
    setIsPWA(isRunningAsPWA());
    setCanInstall(canInstallPWA());

    // Subscribe to network changes
    const unsubscribe = subscribeToNetworkChanges(
      () => {
        setOnline(true);
        setNetworkInfo(getNetworkInfo());
      },
      () => {
        setOnline(false);
      }
    );

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsPWA(true);
      setCanInstall(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Update network info periodically
    const intervalId = setInterval(() => {
      setNetworkInfo(getNetworkInfo());
    }, 5000);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(intervalId);
    };
  }, []);

  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setCanInstall(false);
      return true;
    }

    return false;
  }, [deferredPrompt]);

  return {
    isOnline: online,
    isPWA,
    canInstall,
    networkInfo,
    deferredPrompt,
    installPWA,
  };
}

/**
 * Hook for caching data for offline use
 */
export function useOfflineCache() {
  const cacheData = useCallback(async (key: string, data: unknown): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(`offline_cache_${key}`, serialized);
      return true;
    } catch {
      return false;
    }
  }, []);

  const getCachedData = useCallback(<T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;

    try {
      const serialized = localStorage.getItem(`offline_cache_${key}`);
      if (serialized) {
        return JSON.parse(serialized) as T;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const clearCache = useCallback((key?: string): void => {
    if (typeof window === 'undefined') return;

    if (key) {
      localStorage.removeItem(`offline_cache_${key}`);
    } else {
      // Clear all offline cache keys
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith('offline_cache_')) {
          localStorage.removeItem(k);
        }
      });
    }
  }, []);

  return {
    cacheData,
    getCachedData,
    clearCache,
  };
}

/**
 * Hook for background sync
 */
export function useBackgroundSync() {
  const requestSync = useCallback(async (tag: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;
    if (!('SyncManager' in window)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    requestSync,
    isSupported: typeof window !== 'undefined' && 'SyncManager' in window,
  };
}
