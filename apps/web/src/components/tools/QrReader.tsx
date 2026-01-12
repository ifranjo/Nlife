// npm install jsqr
import { useState, useRef, useEffect } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import UpgradePrompt, { UsageIndicator, useToolUsage } from '../ui/UpgradePrompt';

type InputMode = 'upload' | 'camera';

interface QrData {
  data: string;
  type: 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'phone' | 'sms' | 'geo' | 'unknown';
  formatted?: {
    ssid?: string;
    password?: string;
    encryption?: string;
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: string | undefined;
  };
}

function detectQrType(data: string): QrData['type'] {
  if (data.startsWith('http://') || data.startsWith('https://')) return 'url';
  if (data.startsWith('WIFI:')) return 'wifi';
  if (data.startsWith('BEGIN:VCARD')) return 'vcard';
  if (data.startsWith('mailto:')) return 'email';
  if (data.startsWith('tel:')) return 'phone';
  if (data.startsWith('sms:') || data.startsWith('SMSTO:')) return 'sms';
  if (data.startsWith('geo:')) return 'geo';
  return 'text';
}

function parseWiFi(data: string): { ssid?: string; password?: string; encryption?: string } {
  const ssidMatch = data.match(/S:([^;]+)/);
  const passMatch = data.match(/P:([^;]+)/);
  const encMatch = data.match(/T:([^;]+)/);

  return {
    ssid: ssidMatch?.[1],
    password: passMatch?.[1],
    encryption: encMatch?.[1] || 'None'
  };
}

function parseVCard(data: string): { name?: string; email?: string; phone?: string } {
  const nameMatch = data.match(/FN:([^\n]+)/);
  const emailMatch = data.match(/EMAIL[^:]*:([^\n]+)/);
  const phoneMatch = data.match(/TEL[^:]*:([^\n]+)/);

  return {
    name: nameMatch?.[1],
    email: emailMatch?.[1],
    phone: phoneMatch?.[1]
  };
}

function formatQrData(rawData: string): QrData {
  const type = detectQrType(rawData);
  let formatted: QrData['formatted'] = {};

  if (type === 'wifi') {
    formatted = parseWiFi(rawData);
  } else if (type === 'vcard') {
    formatted = parseVCard(rawData);
  }

  return {
    data: rawData,
    type,
    formatted: Object.keys(formatted).length > 0 ? formatted : undefined
  };
}

export default function QrReader() {
  const [mode, setMode] = useState<InputMode>('upload');
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const { canUse, showPrompt, checkUsage, recordUsage, dismissPrompt } = useToolUsage('qr-reader');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Dynamic jsQR import
  const scanQrCode = async (imageData: ImageData) => {
    try {
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      return code;
    } catch (err) {
      console.error('Failed to load jsQR:', err);
      return null;
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!checkUsage()) {
      return;
    }

    setError(null);
    setQrData(null);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = await scanQrCode(imageData);

      if (code) {
        setQrData(formatQrData(code.data));
        recordUsage();
      } else {
        setError('No QR code found in the image. Make sure the QR code is clearly visible.');
      }
    };

    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setError(null);
      setQrData(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        startScanning();
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permission and try again.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  };

  const startScanning = () => {
    setScanning(true);
    const scan = async () => {
      if (!videoRef.current || !canvasRef.current || !scanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanIntervalRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = await scanQrCode(imageData);

      if (code) {
        setQrData(formatQrData(code.data));
        recordUsage();
        setScanning(false);
        stopCamera();
      } else {
        scanIntervalRef.current = requestAnimationFrame(scan);
      }
    };

    scan();
  };

  const handleCopy = async () => {
    if (!qrData) return;
    const success = await copyToClipboard(qrData.data);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenLink = () => {
    if (qrData?.type === 'url') {
      window.open(qrData.data, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (mode === 'camera' && !cameraActive) {
      startCamera();
    } else if (mode === 'upload' && cameraActive) {
      stopCamera();
    }
  }, [mode]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-4 flex justify-end">
        <UsageIndicator toolId="qr-reader" />
      </div>
      {/* Mode Selector */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
            mode === 'upload'
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-[var(--text-muted)] hover:text-white'
          }`}
        >
          📁 Upload Image
        </button>
        <button
          onClick={() => setMode('camera')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
            mode === 'camera'
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-[var(--text-muted)] hover:text-white'
          }`}
        >
          📷 Use Camera
        </button>
      </div>

      {/* Input Area */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        {mode === 'upload' ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/20 rounded-xl p-12
                         hover:border-white/40 hover:bg-white/5 transition-all
                         flex flex-col items-center gap-4 text-center"
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Click to upload an image</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  JPG, PNG, or any image containing a QR code
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-cyan-400 rounded-lg animate-pulse" />
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-[var(--text-muted)]">
                  <p>Camera starting...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Result Display */}
      {qrData && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">QR Code Decoded</h3>
            <span className="px-3 py-1 bg-cyan-400/20 text-cyan-400 text-xs font-medium rounded-full border border-cyan-400/30">
              {qrData.type.toUpperCase()}
            </span>
          </div>

          {/* Formatted Data Display */}
          {qrData.formatted ? (
            <div className="space-y-3 bg-black/30 rounded-lg p-4">
              {qrData.type === 'wifi' && (
                <>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Network Name (SSID)</p>
                    <p className="text-white font-mono">{qrData.formatted.ssid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Password</p>
                    <p className="text-white font-mono">{qrData.formatted.password}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Encryption</p>
                    <p className="text-white font-mono">{qrData.formatted.encryption}</p>
                  </div>
                </>
              )}
              {qrData.type === 'vcard' && (
                <>
                  {qrData.formatted.name && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Name</p>
                      <p className="text-white">{qrData.formatted.name}</p>
                    </div>
                  )}
                  {qrData.formatted.email && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Email</p>
                      <p className="text-white">{qrData.formatted.email}</p>
                    </div>
                  )}
                  {qrData.formatted.phone && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">Phone</p>
                      <p className="text-white">{qrData.formatted.phone}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-white font-mono text-sm break-all">{qrData.data}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            {qrData.type === 'url' && (
              <button
                onClick={handleOpenLink}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                           bg-cyan-400/20 hover:bg-cyan-400/30 text-cyan-400 border border-cyan-400/30"
              >
                Open Link
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>QR codes are decoded entirely in your browser using jsQR library.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          No data is sent to any server. All processing happens locally.
        </p>
      </div>
      {showPrompt && <UpgradePrompt toolId="qr-reader" toolName="QR Reader" onDismiss={dismissPrompt} />}
    </div>
  );
}
