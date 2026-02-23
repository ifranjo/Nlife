import { useState, useEffect } from 'react';
import { useOffline } from '../../hooks/useOffline';
import { X, Download, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt Component
 * Shows a banner prompting users to install the PWA
 */
export default function InstallPrompt() {
  const { canInstall, installPWA, isPWA } = useOffline();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // Show prompt if:
    // 1. Can install PWA
    // 2. Not already running as PWA
    // 3. Not dismissed in the last week
    if (canInstall && !isPWA && (!dismissed || Date.now() - dismissedTime > oneWeek)) {
      // Small delay to not interrupt immediate user interaction
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [canInstall, isPWA]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      setIsVisible(false);
    }
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt__content">
        <div className="install-prompt__icon">
          <Smartphone size={24} />
        </div>

        <div className="install-prompt__text">
          <h3 className="install-prompt__title">Install New Life Solutions</h3>
          <p className="install-prompt__description">
            Add to your home screen for quick access. Works offline!
          </p>
        </div>

        <div className="install-prompt__actions">
          <button
            onClick={handleInstall}
            className="install-prompt__btn install-prompt__btn--primary"
          >
            <Download size={16} />
            Install
          </button>

          <button
            onClick={handleDismiss}
            className="install-prompt__btn install-prompt__btn--secondary"
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .install-prompt {
          position: fixed;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
          z-index: 9999;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .install-prompt__content {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--glass-bg, rgba(10, 10, 10, 0.95));
          border: 1px solid var(--border, #333);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          max-width: 500px;
          margin: 0 auto;
        }

        .install-prompt__icon {
          color: var(--primary, #00d4ff);
          flex-shrink: 0;
        }

        .install-prompt__text {
          flex: 1;
          min-width: 0;
        }

        .install-prompt__title {
          font-size: 0.9375rem;
          font-weight: 600;
          margin: 0 0 0.25rem;
          color: var(--text, #e0e0e0);
        }

        .install-prompt__description {
          font-size: 0.8125rem;
          margin: 0;
          color: var(--text-muted, #888);
          line-height: 1.4;
        }

        .install-prompt__actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .install-prompt__btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .install-prompt__btn--primary {
          background: var(--primary, #00d4ff);
          color: #000;
        }

        .install-prompt__btn--primary:hover {
          background: var(--primary-hover, #33ddff);
        }

        .install-prompt__btn--secondary {
          background: transparent;
          color: var(--text-muted, #888);
          padding: 0.5rem;
        }

        .install-prompt__btn--secondary:hover {
          color: var(--text, #e0e0e0);
          background: rgba(255, 255, 255, 0.05);
        }

        @media (min-width: 640px) {
          .install-prompt {
            left: auto;
            right: 1rem;
            max-width: 400px;
          }
        }
      `}</style>
    </div>
  );
}
