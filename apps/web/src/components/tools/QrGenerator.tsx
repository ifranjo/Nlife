import { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { escapeHtml, createSafeErrorMessage } from '../../lib/security';

type InputType = 'url' | 'text' | 'wifi' | 'vcard';
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

interface WifiConfig {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

interface VCardConfig {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  title: string;
  url: string;
}

const DEFAULT_WIFI: WifiConfig = {
  ssid: '',
  password: '',
  encryption: 'WPA',
  hidden: false,
};

const DEFAULT_VCARD: VCardConfig = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  organization: '',
  title: '',
  url: '',
};

export default function QrGenerator() {
  const [inputType, setInputType] = useState<InputType>('url');
  const [textValue, setTextValue] = useState('');
  const [wifiConfig, setWifiConfig] = useState<WifiConfig>(DEFAULT_WIFI);
  const [vcardConfig, setVcardConfig] = useState<VCardConfig>(DEFAULT_VCARD);

  const [size, setSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>('M');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');

  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR content based on input type
  const getQrContent = useCallback((): string => {
    switch (inputType) {
      case 'url':
      case 'text':
        return textValue.trim();

      case 'wifi': {
        const { ssid, password, encryption, hidden } = wifiConfig;
        if (!ssid.trim()) return '';
        // WiFi QR format: WIFI:T:WPA;S:mynetwork;P:mypass;H:true;;
        const escapedSsid = ssid.replace(/[\\;,:]/g, '\\$&');
        const escapedPass = password.replace(/[\\;,:]/g, '\\$&');
        let wifiString = `WIFI:T:${encryption};S:${escapedSsid};`;
        if (encryption !== 'nopass' && password) {
          wifiString += `P:${escapedPass};`;
        }
        if (hidden) {
          wifiString += 'H:true;';
        }
        wifiString += ';';
        return wifiString;
      }

      case 'vcard': {
        const { firstName, lastName, phone, email, organization, title, url } = vcardConfig;
        if (!firstName.trim() && !lastName.trim()) return '';

        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
        if (lastName || firstName) {
          vcard += `N:${escapeHtml(lastName)};${escapeHtml(firstName)};;;\n`;
          vcard += `FN:${escapeHtml(firstName)} ${escapeHtml(lastName)}\n`;
        }
        if (organization) vcard += `ORG:${escapeHtml(organization)}\n`;
        if (title) vcard += `TITLE:${escapeHtml(title)}\n`;
        if (phone) vcard += `TEL:${phone}\n`;
        if (email) vcard += `EMAIL:${email}\n`;
        if (url) vcard += `URL:${url}\n`;
        vcard += 'END:VCARD';
        return vcard;
      }

      default:
        return '';
    }
  }, [inputType, textValue, wifiConfig, vcardConfig]);

  // Generate QR code whenever content or options change
  useEffect(() => {
    const content = getQrContent();

    if (!content || !canvasRef.current) {
      // Clear canvas if no content
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const generateQr = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        await QRCode.toCanvas(canvasRef.current, content, {
          width: size,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
          errorCorrectionLevel: errorCorrection,
        });
      } catch (err) {
        setError(createSafeErrorMessage(err, 'Failed to generate QR code. Content may be too long.'));
      } finally {
        setIsGenerating(false);
      }
    };

    // Debounce generation
    const timeoutId = setTimeout(generateQr, 150);
    return () => clearTimeout(timeoutId);
  }, [getQrContent, size, fgColor, bgColor, errorCorrection]);

  // Download as PNG
  const downloadPng = () => {
    const content = getQrContent();
    if (!content || !canvasRef.current) return;

    
    const link = document.createElement('a');
    link.download = `qrcode_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
      };

  // Download as SVG
  const downloadSvg = async () => {
    const content = getQrContent();
    if (!content) return;

    
    try {
      const svgString = await QRCode.toString(content, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: errorCorrection,
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qrcode_${Date.now()}.svg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
          } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to generate SVG. Please try again.'));
    }
  };

  const hasContent = getQrContent().length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex justify-end">
              </div>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="glass-card p-6">
          <h2 className="text-white font-medium mb-4">Content</h2>

          {/* Input Type Selector */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {([
              { type: 'url', label: 'URL', icon: '🔗' },
              { type: 'text', label: 'Text', icon: '📝' },
              { type: 'wifi', label: 'WiFi', icon: '📶' },
              { type: 'vcard', label: 'Contact', icon: '👤' },
            ] as const).map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => setInputType(type)}
                className={`
                  py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${inputType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-[var(--text-muted)] hover:bg-slate-700 hover:text-white'
                  }
                `}
              >
                <span className="block text-lg mb-1">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* URL/Text Input */}
          {(inputType === 'url' || inputType === 'text') && (
            <div>
              <label className="block text-[var(--text-muted)] text-sm mb-2">
                {inputType === 'url' ? 'Enter URL' : 'Enter Text'}
              </label>
              {inputType === 'url' ? (
                <input
                  type="url"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              ) : (
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Enter any text..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              )}
            </div>
          )}

          {/* WiFi Input */}
          {inputType === 'wifi' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Network Name (SSID)</label>
                <input
                  type="text"
                  value={wifiConfig.ssid}
                  onChange={(e) => setWifiConfig(prev => ({ ...prev, ssid: e.target.value }))}
                  placeholder="MyNetwork"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="wifi-encryption" className="block text-[var(--text-muted)] text-sm mb-2">Encryption</label>
                <select
                  id="wifi-encryption"
                  value={wifiConfig.encryption}
                  onChange={(e) => setWifiConfig(prev => ({ ...prev, encryption: e.target.value as WifiConfig['encryption'] }))}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None (Open)</option>
                </select>
              </div>

              {wifiConfig.encryption !== 'nopass' && (
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Password</label>
                  <input
                    type="password"
                    value={wifiConfig.password}
                    onChange={(e) => setWifiConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Network password"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wifiConfig.hidden}
                  onChange={(e) => setWifiConfig(prev => ({ ...prev, hidden: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-[var(--text-muted)] text-sm">Hidden network</span>
              </label>
            </div>
          )}

          {/* vCard Input */}
          {inputType === 'vcard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">First Name</label>
                  <input
                    type="text"
                    value={vcardConfig.firstName}
                    onChange={(e) => setVcardConfig(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Last Name</label>
                  <input
                    type="text"
                    value={vcardConfig.lastName}
                    onChange={(e) => setVcardConfig(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Phone</label>
                <input
                  type="tel"
                  value={vcardConfig.phone}
                  onChange={(e) => setVcardConfig(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={vcardConfig.email}
                  onChange={(e) => setVcardConfig(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Organization</label>
                  <input
                    type="text"
                    value={vcardConfig.organization}
                    onChange={(e) => setVcardConfig(prev => ({ ...prev, organization: e.target.value }))}
                    placeholder="Company Inc."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] text-sm mb-2">Job Title</label>
                  <input
                    type="text"
                    value={vcardConfig.title}
                    onChange={(e) => setVcardConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Developer"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Website</label>
                <input
                  type="url"
                  value={vcardConfig.url}
                  onChange={(e) => setVcardConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="glass-card p-6">
          <h2 className="text-white font-medium mb-4">Preview</h2>

          {/* QR Code Canvas */}
          <div className="flex items-center justify-center p-4 bg-white rounded-lg mb-6">
            <canvas
              ref={canvasRef}
              width={size}
              height={size}
              className="max-w-full h-auto"
              style={{
                maxWidth: '100%',
                imageRendering: 'pixelated',
              }}
            />
          </div>

          {/* Customization Options */}
          <div className="space-y-4">
            {/* Size */}
            <div>
              <label className="block text-[var(--text-muted)] text-sm mb-2">
                Size: {size}px
              </label>
              <input
                type="range"
                min={128}
                max={512}
                step={32}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                aria-label="QR code size"
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Error Correction */}
            <div>
              <label htmlFor="error-correction" className="block text-[var(--text-muted)] text-sm mb-2">Error Correction</label>
              <select
                id="error-correction"
                value={errorCorrection}
                onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrectionLevel)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="L">Low (~7%)</option>
                <option value="M">Medium (~15%)</option>
                <option value="Q">Quartile (~25%)</option>
                <option value="H">High (~30%)</option>
              </select>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Foreground</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    aria-label="Foreground color picker"
                    className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    aria-label="Foreground color hex value"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-muted)] text-sm mb-2">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    aria-label="Background color picker"
                    className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    aria-label="Background color hex value"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={downloadPng}
              disabled={!hasContent || isGenerating}
              className={`
                btn-primary flex items-center justify-center gap-2
                ${(!hasContent || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PNG
            </button>
            <button
              onClick={downloadSvg}
              disabled={!hasContent || isGenerating}
              className={`
                btn-secondary flex items-center justify-center gap-2
                ${(!hasContent || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              SVG
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        QR codes are generated entirely in your browser. No data is sent to any server.
      </p>
          </div>
  );
}
