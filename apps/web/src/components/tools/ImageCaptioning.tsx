import { useState, useRef } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { escapeHtml } from '../../lib/security';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'captioning' | 'error';

export default function ImageCaptioning() {
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('image-captioning');

  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionerRef = useRef<any>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setCaption('');
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setCaption('');
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const loadModel = async () => {
    if (captionerRef.current) return;

    setModelStatus('loading');
    setError(null);
    setLoadingProgress(0);

    try {
      const { pipeline } = await import('@huggingface/transformers');

      const progressCallback = (progress: any) => {
        if (progress.status === 'progress' && progress.progress) {
          setLoadingProgress(Math.round(progress.progress));
        }
      };

      captionerRef.current = await pipeline(
        'image-to-text',
        'Xenova/vit-gpt2-image-captioning',
        { progress_callback: progressCallback }
      );

      setModelStatus('ready');
      setLoadingProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
      setModelStatus('error');
    }
  };

  const generateCaption = async () => {
    if (!image || !captionerRef.current) return;

    if (!checkUsage()) {
      return;
    }

    setModelStatus('captioning');
    setError(null);

    try {
      const results = await captionerRef.current(image);
      if (results && results.length > 0) {
        setCaption(results[0].generated_text);
        recordUsage();
      }
      setModelStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caption generation failed');
      setModelStatus('error');
    }
  };

  const handleGenerate = async () => {
    if (modelStatus === 'idle') {
      await loadModel();
    }
    if (captionerRef.current) {
      await generateCaption();
    }
  };

  const handleCopy = async () => {
    if (!caption) return;
    const success = await copyToClipboard(caption);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-4 flex justify-end">
        <UsageIndicator toolId="image-captioning" />
      </div>
      {showPrompt && (
        <UpgradePrompt
          toolId="image-captioning"
          toolName="Image Captioning"
          onDismiss={dismissPrompt}
        />
      )}
      {/* Upload Area */}
      {!image && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center
                     hover:border-white/40 transition-colors cursor-pointer bg-white/5"
        >
          <div className="text-6xl mb-4">🖼️</div>
          <p className="text-white text-lg mb-2">Drop an image or click to upload</p>
          <p className="text-[var(--text-muted)] text-sm">
            AI will generate a description of your image
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            aria-label="Upload image for captioning"
          />
        </div>
      )}

      {/* Model Loading Progress */}
      {modelStatus === 'loading' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white">Loading AI Model...</span>
            <span className="text-cyan-400 font-mono">{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            First load downloads ~350MB model. Cached for future use.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Image Display */}
      {image && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <img
              src={image}
              alt={caption || "Uploaded image"}
              className="max-w-full h-auto rounded-lg mx-auto max-h-[500px] object-contain"
            />
          </div>

          {/* Caption Display */}
          {caption && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  Generated Caption
                </h3>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                             ${copied
                               ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                               : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                             }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-lg text-cyan-400 leading-relaxed">
                {escapeHtml(caption)}
              </p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-[var(--text-muted)]">
                  Use this as alt text for accessibility, social media descriptions, or content creation.
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={modelStatus === 'loading' || modelStatus === 'captioning'}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {modelStatus === 'captioning' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Caption...
                </span>
              ) : modelStatus === 'loading' ? 'Loading Model...' :
                 modelStatus === 'idle' ? 'Load Model & Generate Caption' :
                 caption ? 'Regenerate Caption' : 'Generate Caption'}
            </button>
            <button
              onClick={() => {
                setImage(null);
                setCaption('');
                setError(null);
              }}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium
                         text-white border border-white/10 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Use Cases */}
          {caption && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white font-medium mb-1">Accessibility</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Use as alt text for screen readers
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white font-medium mb-1">Social Media</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Auto-generate post descriptions
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white font-medium mb-1">SEO</h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Describe images for search engines
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>Image captioning runs locally using ViT-GPT2 model.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Your images are processed in your browser and never uploaded to any server.
        </p>
      </div>
    </div>
  );
}
