import { useState } from 'react';
import { copyToClipboard } from '../../lib/clipboard';

interface SentimentResult {
  label: string;
  score: number;
}

const SAMPLE_TEXTS = [
  "I absolutely love this product! It exceeded all my expectations and made my life so much easier.",
  "This is the worst experience I've ever had. Completely disappointed and frustrated.",
  "The weather today is cloudy with a chance of rain in the afternoon.",
  "I'm really excited about the new features coming soon! Can't wait to try them out.",
  "The customer service was terrible. They didn't help at all and were very rude."
];

const SENTIMENT_CONFIG = {
  POSITIVE: {
    emoji: '😊',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    barColor: 'bg-green-500'
  },
  NEGATIVE: {
    emoji: '😞',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    barColor: 'bg-red-500'
  },
  NEUTRAL: {
    emoji: '😐',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
    barColor: 'bg-gray-500'
  }
};

export default function SentimentAnalysis() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [classifier, setClassifier] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModel = async () => {
    if (classifier) return classifier;

    setIsModelLoading(true);
    setModelProgress(0);
    setError(null);

    try {
      const { pipeline } = await import('@huggingface/transformers');

      // Show progress during model download
      const loadedClassifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setModelProgress(percent);
          }
        }
      });

      setClassifier(loadedClassifier);
      setIsModelLoading(false);
      return loadedClassifier;
    } catch (err) {
      console.error('Failed to load model:', err);
      setError('Failed to load AI model. Please refresh and try again.');
      setIsModelLoading(false);
      return null;
    }
  };

  const analyzeSentiment = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedClassifier = await loadModel();
      if (!loadedClassifier) {
        setIsLoading(false);
        return;
      }

      const output = await loadedClassifier(text.trim());
      setResult(output[0]);
    } catch (err) {
      console.error('Sentiment analysis failed:', err);
      setError('Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrySample = (sample: string) => {
    setText(sample);
    setResult(null);
  };

  const getSentimentConfig = (label: string) => {
    const upperLabel = label.toUpperCase();
    if (upperLabel === 'POSITIVE') return SENTIMENT_CONFIG.POSITIVE;
    if (upperLabel === 'NEGATIVE') return SENTIMENT_CONFIG.NEGATIVE;
    return SENTIMENT_CONFIG.NEUTRAL;
  };

  const formatLabel = (label: string) => {
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Text Input */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <label className="block text-sm text-white">
          Enter Text to Analyze
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste text here to analyze its sentiment..."
          className="w-full h-40 bg-white/5 border border-white/10 rounded-lg px-4 py-3
                     text-white placeholder-[var(--text-muted)] resize-none
                     focus:outline-none focus:border-white/30 transition-colors"
        />
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{text.length} characters</span>
          {text.length > 0 && (
            <button
              onClick={() => setText('')}
              className="text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={analyzeSentiment}
        disabled={!text.trim() || isLoading || isModelLoading}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isModelLoading
          ? `Loading AI Model... ${modelProgress}%`
          : isLoading
          ? 'Analyzing...'
          : 'Analyze Sentiment'}
      </button>

      {/* Model Loading Progress */}
      {isModelLoading && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white">Downloading AI Model</span>
            <span className="text-cyan-400">{modelProgress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${modelProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            First-time model download (~70MB). This will be cached for future use.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Analysis Results</h3>

          {/* Overall Sentiment */}
          <div className={`p-6 rounded-xl border ${getSentimentConfig(result.label).bgColor} ${getSentimentConfig(result.label).borderColor}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getSentimentConfig(result.label).emoji}</span>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Overall Sentiment</p>
                  <p className={`text-2xl font-bold ${getSentimentConfig(result.label).color}`}>
                    {formatLabel(result.label)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--text-muted)]">Confidence</p>
                <p className={`text-2xl font-bold ${getSentimentConfig(result.label).color}`}>
                  {(result.score * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">Confidence Score</span>
              <span className={getSentimentConfig(result.label).color}>
                {(result.score * 100).toFixed(2)}%
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getSentimentConfig(result.label).barColor}`}
                style={{ width: `${result.score * 100}%` }}
              />
            </div>
          </div>

          {/* Interpretation */}
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {result.label.toUpperCase() === 'POSITIVE' &&
                "The text expresses positive emotions, optimism, or satisfaction. The AI detected language patterns associated with happiness, excitement, or approval."}
              {result.label.toUpperCase() === 'NEGATIVE' &&
                "The text expresses negative emotions, criticism, or dissatisfaction. The AI detected language patterns associated with sadness, anger, or disapproval."}
              {result.label.toUpperCase() === 'NEUTRAL' &&
                "The text appears neutral or factual without strong emotional bias. The AI didn't detect significant positive or negative sentiment."}
            </p>
          </div>
        </div>
      )}

      {/* Sample Texts */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Try Sample Texts</h3>
        <div className="space-y-2">
          {SAMPLE_TEXTS.map((sample, index) => (
            <button
              key={index}
              onClick={() => handleTrySample(sample)}
              className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10
                         rounded-lg text-sm text-[var(--text-muted)] hover:text-white
                         transition-all"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)] space-y-2">
        <p>
          Powered by DistilBERT sentiment analysis model from Hugging Face.
        </p>
        <p className="text-[var(--text-dim)]">
          The AI model runs entirely in your browser. Your text is never uploaded to any server.
        </p>
      </div>
    </div>
  );
}
