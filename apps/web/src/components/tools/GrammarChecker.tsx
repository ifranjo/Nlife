import { useState, useRef } from 'react';
import { copyToClipboard } from '../../lib/clipboard';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'checking' | 'error';

interface Correction {
  original: string;
  corrected: string;
  type: 'grammar' | 'spelling' | 'punctuation' | 'style';
  explanation: string;
  offset: number;
  length: number;
}

export default function GrammarChecker() {
  const [inputText, setInputText] = useState('');
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [correctedText, setCorrectedText] = useState('');
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const correctorRef = useRef<any>(null);

  const sampleTexts = [
    {
      label: 'Common Errors',
      text: `Their going to the store tommorrow. I seen that movie last week and it was really good. Me and him went to the park. The dog wagged it's tail happily. Your the best friend I could of asked for. Between you and I, this is a great opportunity.`
    },
    {
      label: 'Business Email',
      text: `Dear Mr Smith I am writting to follow up on our conversation from last weak. I beleive we can definately work togather on this project. Please let me know you're availibility for a metting next Tusday. Looking foreward to hear from you.`
    },
    {
      label: 'Academic Text',
      text: `The reserch shows that students who studys regularly performes better on exams. This phenomemon has been observered across multiple studys. The results cleary indicate that consistant practice leads too improved outcomes in academc settings.`
    }
  ];

  const loadModel = async () => {
    if (correctorRef.current) return;

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

      correctorRef.current = await pipeline(
        'text2text-generation',
        'Xenova/flan-t5-small',
        { progress_callback: progressCallback }
      );

      setModelStatus('ready');
      setLoadingProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
      setModelStatus('error');
    }
  };

  const checkGrammar = async () => {
    if (!inputText.trim() || !correctorRef.current) return;

    setModelStatus('checking');
    setError(null);
    setCorrections([]);

    try {
      // Use the model to correct grammar
      const prompt = `Correct the grammar and spelling in this text: "${inputText}"`;

      const results = await correctorRef.current(prompt, {
        max_length: 512,
        do_sample: false
      });

      if (results && results.length > 0) {
        const corrected = results[0].generated_text;
        setCorrectedText(corrected);

        // Find differences between original and corrected
        const foundCorrections = findCorrections(inputText, corrected);
        setCorrections(foundCorrections);
      }

      setModelStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grammar check failed');
      setModelStatus('error');
    }
  };

  const findCorrections = (original: string, corrected: string): Correction[] => {
    const corrections: Correction[] = [];
    const originalWords = original.split(/\s+/);
    const correctedWords = corrected.split(/\s+/);

    let offset = 0;

    for (let i = 0; i < Math.min(originalWords.length, correctedWords.length); i++) {
      if (originalWords[i].toLowerCase() !== correctedWords[i].toLowerCase()) {
        corrections.push({
          original: originalWords[i],
          corrected: correctedWords[i],
          type: detectCorrectionType(originalWords[i], correctedWords[i]),
          explanation: generateExplanation(originalWords[i], correctedWords[i]),
          offset: offset,
          length: originalWords[i].length
        });
      }
      offset += originalWords[i].length + 1;
    }

    return corrections;
  };

  const detectCorrectionType = (original: string, corrected: string): Correction['type'] => {
    const origLower = original.toLowerCase().replace(/[^a-z]/g, '');
    const corrLower = corrected.toLowerCase().replace(/[^a-z]/g, '');

    // Check if it's just punctuation difference
    if (origLower === corrLower) return 'punctuation';

    // Check for common grammar patterns
    const grammarPatterns = ['their', 'there', 'they\'re', 'your', 'you\'re', 'its', 'it\'s', 'could of', 'would of'];
    if (grammarPatterns.some(p => original.toLowerCase().includes(p))) return 'grammar';

    // Likely spelling if letters are similar
    if (levenshteinDistance(origLower, corrLower) <= 2) return 'spelling';

    return 'grammar';
  };

  const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const generateExplanation = (original: string, corrected: string): string => {
    const origLower = original.toLowerCase();

    // Common explanations
    if (origLower === 'their' && corrected.toLowerCase() === 'they\'re') {
      return '"They\'re" is a contraction of "they are"';
    }
    if (origLower === 'your' && corrected.toLowerCase() === 'you\'re') {
      return '"You\'re" is a contraction of "you are"';
    }
    if (origLower === 'its' && corrected.toLowerCase() === 'it\'s') {
      return '"It\'s" is a contraction of "it is"';
    }
    if (origLower.includes('could of')) {
      return 'Should be "could have" or "could\'ve"';
    }

    return `"${original}" should be "${corrected}"`;
  };

  const handleCheck = async () => {
    if (modelStatus === 'idle') {
      await loadModel();
    }
    if (correctorRef.current) {
      await checkGrammar();
    }
  };

  const handleCopy = async () => {
    if (!correctedText) return;
    const success = await copyToClipboard(correctedText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const applySingleCorrection = (correction: Correction) => {
    const newText = inputText.substring(0, correction.offset) +
                   correction.corrected +
                   inputText.substring(correction.offset + correction.length);
    setInputText(newText);
    setCorrections(corrections.filter(c => c !== correction));
  };

  const applyAllCorrections = () => {
    setInputText(correctedText);
    setCorrections([]);
  };

  const getCorrectionColor = (type: Correction['type']) => {
    switch (type) {
      case 'grammar': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'spelling': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'punctuation': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'style': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Input Area */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="input-text" className="text-white font-medium">
            Text to Check
          </label>
          <span className="text-xs text-[var(--text-muted)]">
            {wordCount} words
          </span>
        </div>
        <textarea
          id="input-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste your text here to check for grammar, spelling, and punctuation errors..."
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
                  setCorrections([]);
                  setCorrectedText('');
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
              className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            First load downloads ~150MB model. Cached for future use.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Check Button */}
      <button
        onClick={handleCheck}
        disabled={!inputText.trim() || modelStatus === 'loading' || modelStatus === 'checking'}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {modelStatus === 'checking' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Checking Grammar...
          </span>
        ) : modelStatus === 'loading' ? 'Loading Model...' :
           modelStatus === 'idle' ? 'Load Model & Check Grammar' :
           corrections.length > 0 ? 'Check Again' : 'Check Grammar'}
      </button>

      {/* Corrections List */}
      {corrections.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-2xl">✏️</span>
              {corrections.length} Issue{corrections.length !== 1 ? 's' : ''} Found
            </h3>
            <button
              onClick={applyAllCorrections}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400
                        border border-green-500/30 rounded-lg text-sm font-medium transition-all"
            >
              Apply All Fixes
            </button>
          </div>

          <div className="space-y-3">
            {corrections.map((correction, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${getCorrectionColor(correction.type)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs uppercase tracking-wider opacity-70">
                        {correction.type}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="line-through opacity-60">{correction.original}</span>
                      <span className="mx-2">→</span>
                      <span className="font-medium">{correction.corrected}</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {correction.explanation}
                    </p>
                  </div>
                  <button
                    onClick={() => applySingleCorrection(correction)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white
                              rounded text-xs transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corrected Text Output */}
      {correctedText && corrections.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-2xl">✅</span>
                No Issues Found
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Your text looks good!
              </p>
            </div>
          </div>
          <p className="text-green-400 leading-relaxed">
            {correctedText}
          </p>
        </div>
      )}

      {/* Corrected Text with Copy */}
      {correctedText && corrections.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-white font-semibold">Corrected Version</h3>
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
          <p className="text-cyan-400 leading-relaxed">
            {correctedText}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50"></span>
          Grammar
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50"></span>
          Spelling
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/50"></span>
          Punctuation
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50"></span>
          Style
        </span>
      </div>

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>Grammar checking runs locally using Flan-T5 AI model.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Your text is processed in your browser and never uploaded to any server.
        </p>
      </div>
    </div>
  );
}
