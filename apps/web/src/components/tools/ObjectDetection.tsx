import { useState, useRef, useEffect } from 'react';
import { validateImageFileExtended, sanitizeFilename, createSafeErrorMessage } from '../../lib/security';

interface Detection {
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
  label: string;
  score: number;
}

type ModelStatus = 'idle' | 'loading' | 'ready' | 'detecting' | 'error';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
];

export default function ObjectDetection() {
  
  const [image, setImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [threshold, setThreshold] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Preload transformers on component mount
  useEffect(() => {
    preloadTransformers();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const detectorRef = useRef<any>(null);

  useEffect(() => {
    if (image && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const img = imageRef.current;

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        drawDetections(ctx, detections, img.naturalWidth, img.naturalHeight);
      };
    }
  }, [image, detections]);

  const drawDetections = (ctx: CanvasRenderingContext2D, dets: Detection[], width: number, height: number) => {
    dets.forEach((det, idx) => {
      const color = COLORS[idx % COLORS.length];
      const { xmin, ymin, xmax, ymax } = det.box;

      const x = xmin * width;
      const y = ymin * height;
      const w = (xmax - xmin) * width;
      const h = (ymax - ymin) * height;

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      const label = `${det.label} ${(det.score * 100).toFixed(1)}%`;
      ctx.fillStyle = color;
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      const textMetrics = ctx.measureText(label);
      const textHeight = 20;

      ctx.fillRect(x, y - textHeight - 4, textMetrics.width + 12, textHeight + 4);
      ctx.fillStyle = '#000';
      ctx.fillText(label, x + 6, y - 8);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateImageFileExtended(file, 50 * 1024 * 1024);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    const safeName = sanitizeFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setDetections([]);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validation = await validateImageFileExtended(file, 50 * 1024 * 1024);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setDetections([]);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const loadModel = async () => {
    if (detectorRef.current) return;

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

      detectorRef.current = await initPipeline(
        'object-detection',
        'Xenova/detr-resnet-50',
        { progress_callback: progressCallback }
      );

      setModelStatus('ready');
      setLoadingProgress(100);
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to load model'));
      setModelStatus('error');
    }
  };

  const detectObjects = async () => {
    if (!image || !detectorRef.current) return;

    
    setModelStatus('detecting');
    setError(null);

    try {
      const results = await detectorRef.current(image, { threshold });
      setDetections(results);
            setModelStatus('ready');
    } catch (err) {
      setError(createSafeErrorMessage(err, 'Detection failed'));
      setModelStatus('error');
    }
  };

  const handleDetect = async () => {
    if (modelStatus === 'idle') {
      await loadModel();
    }
    if (detectorRef.current) {
      await detectObjects();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-4 flex justify-end">
              </div>
            {/* Upload Area */}
      {!image && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center
                     hover:border-white/40 transition-colors cursor-pointer bg-white/5"
        >
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-white text-lg mb-2">Drop an image or click to upload</p>
          <p className="text-[var(--text-muted)] text-sm">
            Supports JPG, PNG, WebP
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
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
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            First load downloads ~160MB model. Cached for future use.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Image Display with Canvas Overlay */}
      {image && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="relative inline-block max-w-full">
              <img
                ref={imageRef}
                src={image}
                alt="Upload"
                className="hidden"
              />
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-white">Confidence Threshold</label>
                <span className="text-sm font-mono text-cyan-400 bg-white/10 px-3 py-1 rounded">
                  {(threshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-white
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:hover:bg-cyan-400
                           [&::-webkit-slider-thumb]:transition-colors"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>10%</span>
                <span>95%</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDetect}
                disabled={modelStatus === 'loading' || modelStatus === 'detecting'}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modelStatus === 'detecting' ? 'Detecting...' :
                 modelStatus === 'loading' ? 'Loading Model...' :
                 modelStatus === 'idle' ? 'Load Model & Detect' : 'Detect Objects'}
              </button>
              <button
                onClick={() => {
                  setImage(null);
                  setDetections([]);
                  setError(null);
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium
                           text-white border border-white/10 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Results List */}
          {detections.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">
                Detected Objects ({detections.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detections.map((det, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg
                               border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-white capitalize">{det.label}</span>
                    </div>
                    <span className="text-cyan-400 font-mono text-sm">
                      {(det.score * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>Object detection runs locally using DETR (DEtection TRansformer) model.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Your images are processed in your browser and never uploaded to any server.
        </p>
      </div>
    </div>
  );
}
