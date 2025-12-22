import { useState, useEffect } from 'react';

interface ToolFeedbackProps {
  toolId: string;
  onFeedback?: (rating: 'like' | 'dislike') => void;
}

export default function ToolFeedback({ toolId, onFeedback }: ToolFeedbackProps) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Check if user already gave feedback for this tool
  useEffect(() => {
    const stored = localStorage.getItem(`feedback_${toolId}`);
    if (stored) {
      setFeedback(stored as 'like' | 'dislike');
      setSubmitted(true);
    }
  }, [toolId]);

  const handleFeedback = (rating: 'like' | 'dislike') => {
    setFeedback(rating);
    setSubmitted(true);

    // Store in localStorage
    localStorage.setItem(`feedback_${toolId}`, rating);

    // Track with Vercel Analytics (if available)
    if (typeof window !== 'undefined' && (window as any).va) {
      (window as any).va('event', {
        name: 'tool_feedback',
        data: { tool: toolId, rating }
      });
    }

    // Optional callback
    onFeedback?.(rating);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span className="text-lg">{feedback === 'like' ? '👍' : '👎'}</span>
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[var(--text-muted)]">Was this helpful?</span>
      <div className="flex gap-2">
        <button
          onClick={() => handleFeedback('like')}
          className="p-2 rounded-lg border border-[var(--border)] hover:border-green-500 hover:bg-green-500/10 transition-all group"
          aria-label="Like this tool"
        >
          <span className="text-xl group-hover:scale-110 inline-block transition-transform">👍</span>
        </button>
        <button
          onClick={() => handleFeedback('dislike')}
          className="p-2 rounded-lg border border-[var(--border)] hover:border-red-500 hover:bg-red-500/10 transition-all group"
          aria-label="Dislike this tool"
        >
          <span className="text-xl group-hover:scale-110 inline-block transition-transform">👎</span>
        </button>
      </div>
    </div>
  );
}
