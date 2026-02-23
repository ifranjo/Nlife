import { useState } from 'react';

interface Props {
  error: Error | null;
  componentName?: string;
  onReset?: () => void;
}

/**
 * Error Fallback UI
 * Displayed when an error is caught by ErrorBoundary
 */
export default function ErrorFallback({ error, componentName, onReset }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSendFeedback = () => {
    // Send feedback to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'error_feedback', {
        event_category: 'Error',
        event_label: componentName || 'unknown',
        error_message: error?.message,
      });
    }
    setFeedbackSent(true);
  };

  const getToolName = () => {
    if (typeof window === 'undefined') return 'this tool';
    const match = window.location.pathname.match(/\/tools\/([^/]+)/);
    if (match) {
      return match[1].replace(/-/g, ' ');
    }
    return 'this tool';
  };

  return (
    <div className="error-fallback">
      <div className="error-fallback__container">
        <div className="error-fallback__icon">⚠️</div>

        <h2 className="error-fallback__title">Something went wrong</h2>

        <p className="error-fallback__message">
          We apologize, but {getToolName()} encountered an error. Your files are safe -
          they were processed locally in your browser and never left your device.
        </p>

        <div className="error-fallback__actions">
          {onReset && (
            <button
              onClick={onReset}
              className="error-fallback__btn error-fallback__btn--primary"
            >
              Try Again
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="error-fallback__btn error-fallback__btn--secondary"
          >
            Reload Page
          </button>

          <a
            href="/hub"
            className="error-fallback__btn error-fallback__btn--secondary"
          >
            Go to Tool Hub
          </a>
        </div>

        {!feedbackSent ? (
          <button
            onClick={handleSendFeedback}
            className="error-fallback__feedback"
          >
            📤 Send error report to help us improve
          </button>
        ) : (
          <p className="error-fallback__thanks">Thank you for your feedback! 🙏</p>
        )}

        {process.env.NODE_ENV === 'development' && (
          <div className="error-fallback__dev-section">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="error-fallback__toggle"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </button>

            {showDetails && (
              <div className="error-fallback__details">
                {componentName && (
                  <p><strong>Component:</strong> {componentName}</p>
                )}
                {error && (
                  <>
                    <p><strong>Error:</strong> {error.message}</p>
                    <pre className="error-fallback__stack">{error.stack}</pre>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .error-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 2rem;
        }

        .error-fallback__container {
          max-width: 600px;
          text-align: center;
          background: var(--glass-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border, #333);
          border-radius: 12px;
          padding: 2rem;
        }

        .error-fallback__icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-fallback__title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text, #e0e0e0);
        }

        .error-fallback__message {
          color: var(--text-muted, #888);
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .error-fallback__actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }

        .error-fallback__btn {
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-block;
        }

        .error-fallback__btn--primary {
          background: var(--primary, #00d4ff);
          color: #000;
          border: none;
        }

        .error-fallback__btn--primary:hover {
          background: var(--primary-hover, #33ddff);
        }

        .error-fallback__btn--secondary {
          background: transparent;
          color: var(--text, #e0e0e0);
          border: 1px solid var(--border, #333);
        }

        .error-fallback__btn--secondary:hover {
          background: var(--hover-bg, rgba(255, 255, 255, 0.05));
        }

        .error-fallback__feedback {
          background: none;
          border: none;
          color: var(--primary, #00d4ff);
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: underline;
        }

        .error-fallback__thanks {
          color: var(--success, #22c55e);
          font-size: 0.875rem;
        }

        .error-fallback__dev-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border, #333);
        }

        .error-fallback__toggle {
          background: none;
          border: none;
          color: var(--text-muted, #888);
          cursor: pointer;
          font-size: 0.875rem;
        }

        .error-fallback__details {
          margin-top: 1rem;
          text-align: left;
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          overflow-x: auto;
        }

        .error-fallback__stack {
          margin-top: 0.5rem;
          white-space: pre-wrap;
          word-break: break-all;
          color: var(--text-muted, #888);
        }
      `}</style>
    </div>
  );
}
