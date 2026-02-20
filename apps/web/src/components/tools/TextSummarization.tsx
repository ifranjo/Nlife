import { useState, useRef } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { escapeHtml } from '../../lib/security';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'summarizing' | 'error';

export default function TextSummarization() {
  // Usage tracking
  
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Preload transformers on component mount
  useEffect(() => {
    preloadTransformers();
  }, []);

  const summarizerRef = useRef<any>(null);

  const sampleTexts = [
    {
      label: 'Technology Article',
      text: `Artificial intelligence has transformed how we interact with technology in our daily lives. From voice assistants that help us set reminders and play music, to recommendation systems that suggest what to watch or buy, AI is everywhere. Machine learning algorithms analyze vast amounts of data to identify patterns and make predictions. Natural language processing enables computers to understand and generate human language. Computer vision allows machines to interpret images and videos. These technologies are being applied in healthcare for disease diagnosis, in finance for fraud detection, in transportation for autonomous vehicles, and in countless other industries. As AI continues to advance, it raises important questions about privacy, job displacement, and the need for ethical guidelines. Researchers and policymakers are working to ensure that AI development benefits humanity while minimizing potential harms.`
    },
    {
      label: 'Science News',
      text: `Scientists have made a groundbreaking discovery in the field of quantum computing. A team of researchers at a leading university has successfully demonstrated a new type of quantum processor that can perform calculations exponentially faster than classical computers for certain types of problems. The processor uses superconducting circuits cooled to near absolute zero temperatures to create qubits, the fundamental units of quantum information. Unlike classical bits that can only be 0 or 1, qubits can exist in multiple states simultaneously through a phenomenon called superposition. This allows quantum computers to explore many possible solutions at once. The researchers also achieved a new level of error correction, one of the biggest challenges in quantum computing. This breakthrough could accelerate progress toward practical quantum computers capable of solving complex optimization problems, simulating molecular structures for drug discovery, and breaking current encryption methods.`
    },
    {
      label: 'Business Report',
      text: `The global e-commerce market experienced unprecedented growth over the past year, with online sales reaching record highs across all major regions. Consumer behavior shifted dramatically as more people turned to digital shopping platforms for everything from groceries to electronics. Mobile commerce accounted for a significant portion of this growth, with smartphone purchases increasing by over 40% compared to the previous year. Social commerce emerged as a powerful new channel, with platforms integrating shopping features directly into their apps. Supply chain challenges and shipping delays prompted many retailers to invest in local fulfillment centers and same-day delivery options. Sustainability concerns also influenced purchasing decisions, with eco-friendly products and packaging becoming more important to consumers. Looking ahead, experts predict continued growth in e-commerce, though at a more moderate pace as physical retail recovers. Companies that successfully blend online and offline experiences are expected to thrive in this evolving landscape.`
    }
  ];

  const loadModel = async () => {
    if (summarizerRef.current) return;

    setModelStatus('loading');
    setError(null);
    setLoadingProgress(0);

    try {
      const transcriber = await initPipeline;

      const progressCallback = (progress: any) => {
        if (progress.status === 'progress' && progress.progress) {
          setLoadingProgress(Math.round(progress.progress));
        }
      };

      summarizerRef.current = await initPipeline(
        'summarization',
        'Xenova/distilbart-cnn-6-6',
        { progress_callback: progressCallback }
      );

      setModelStatus('ready');
      setLoadingProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
      setModelStatus('error');
    }
  };

  const summarizeText = async () => {
    if (!inputText.trim() || !summarizerRef.current) return;

    
    setModelStatus('summarizing');
    setError(null);

    try {
      const results = await summarizerRef.current(inputText, {
        max_length: 150,
        min_length: 30,
        do_sample: false
      });

      if (results && results.length > 0) {
        setSummary(results[0].summary_text);
              }
      setModelStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarization failed');
      setModelStatus('error');
    }
  };

  const handleSummarize = async () => {
    if (modelStatus === 'idle') {
      await loadModel();
    }
    if (summarizerRef.current) {
      await summarizeText();
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    const success = await copyToClipboard(summary);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const inputWords = wordCount(inputText);
  const summaryWords = wordCount(summary);
  const compressionRatio = inputWords > 0 && summaryWords > 0
    ? Math.round((1 - summaryWords / inputWords) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upgrade Prompt */}
      
      {/* Usage Indicator */}
      
      {/* Input Area */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="input-text" className="text-white font-medium">
            Text to Summarize
          </label>
          <span className="text-xs text-[var(--text-muted)]">
            {inputWords} words
          </span>
        </div>
        <textarea
          id="input-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or type your text here... (minimum 50 words recommended)"
          rows={8}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white
                     placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50
                     resize-none"
        />

        {/* Sample Texts */}
        <div className="mt-4">
          <p className="text-xs text-[var(--text-muted)] mb-2">Try a sample:</p>
          <div className="flex flex-wrap gap-2">
            {sampleTexts.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(sample.text);
                  setSummary('');
                }}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10
                           rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Loading Progress */}
      {modelStatus === 'loading' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white">Loading AI Model...</span>
            <span className="text-cyan-400 font-mono">{loadingProgress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            First load downloads ~300MB model. Cached for future use.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Summarize Button */}
      <button
        onClick={handleSummarize}
        disabled={!inputText.trim() || modelStatus === 'loading' || modelStatus === 'summarizing'}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {modelStatus === 'summarizing' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Summarizing...
          </span>
        ) : modelStatus === 'loading' ? 'Loading Model...' :
           modelStatus === 'idle' ? 'Load Model & Summarize' :
           summary ? 'Summarize Again' : 'Summarize Text'}
      </button>

      {/* Summary Output */}
      {summary && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-2xl">📝</span>
                Summary
              </h3>
              <div className="flex gap-4 mt-1 text-xs text-[var(--text-muted)]">
                <span>{summaryWords} words</span>
                <span className="text-cyan-400">{compressionRatio}% shorter</span>
              </div>
            </div>
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
          <p className="text-cyan-400 leading-relaxed text-lg">
            {escapeHtml(summary)}
          </p>
        </div>
      )}

      {/* Comparison Stats */}
      {summary && (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{inputWords}</p>
            <p className="text-xs text-[var(--text-muted)]">Original words</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">{summaryWords}</p>
            <p className="text-xs text-[var(--text-muted)]">Summary words</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{compressionRatio}%</p>
            <p className="text-xs text-[var(--text-muted)]">Compression</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>Text summarization runs locally using DistilBART model.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Your text is processed in your browser and never uploaded to any server.
        </p>
      </div>
    </div>
  );
}
