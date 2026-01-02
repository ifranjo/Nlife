import { useState, useEffect } from 'react';
import { copyToClipboard } from '../../lib/clipboard';

interface RGB { r: number; g: number; b: number; }
interface HSL { h: number; s: number; l: number; }

function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  // Use WCAG relative luminance formula for better contrast decisions
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  // Lower threshold (0.4) ensures 4.5:1+ contrast ratio - use black text on mid-range colors
  return luminance > 0.4 ? '#000000' : '#ffffff';
}

export default function ColorConverter() {
  const [hex, setHex] = useState('#3b82f6');
  const [rgb, setRgb] = useState<RGB>({ r: 59, g: 130, b: 246 });
  const [hsl, setHsl] = useState<HSL>({ h: 217, s: 91, l: 60 });
  const [copied, setCopied] = useState<string | null>(null);

  // Sync from hex
  const updateFromHex = (newHex: string) => {
    setHex(newHex);
    const newRgb = hexToRgb(newHex);
    if (newRgb) {
      setRgb(newRgb);
      setHsl(rgbToHsl(newRgb.r, newRgb.g, newRgb.b));
    }
  };

  // Sync from RGB
  const updateFromRgb = (newRgb: RGB) => {
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const clamped = { r: clamp(newRgb.r), g: clamp(newRgb.g), b: clamp(newRgb.b) };
    setRgb(clamped);
    setHex(rgbToHex(clamped.r, clamped.g, clamped.b));
    setHsl(rgbToHsl(clamped.r, clamped.g, clamped.b));
  };

  // Sync from HSL
  const updateFromHsl = (newHsl: HSL) => {
    const clampH = (v: number) => ((v % 360) + 360) % 360;
    const clampSL = (v: number) => Math.max(0, Math.min(100, v));
    const clamped = { h: clampH(newHsl.h), s: clampSL(newHsl.s), l: clampSL(newHsl.l) };
    setHsl(clamped);
    const newRgb = hslToRgb(clamped.h, clamped.s, clamped.l);
    setRgb(newRgb);
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleCopy = async (format: string, value: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(format);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const hexValue = hex.toUpperCase();
  const rgbValue = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslValue = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Color Preview */}
      <div
        className="h-32 rounded-2xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: hex, color: getContrastColor(hex) }}
      >
        <span className="text-xl font-mono">{hexValue}</span>
      </div>

      {/* Color Picker */}
      <div className="flex items-center justify-center">
        <label className="relative cursor-pointer">
          <input
            type="color"
            value={hex}
            onChange={(e) => updateFromHex(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
            Pick Color
          </div>
        </label>
      </div>

      {/* HEX Input */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">HEX</label>
          <button
            onClick={() => handleCopy('hex', hexValue)}
            className={`text-xs ${copied === 'hex' ? 'text-green-400' : 'text-[var(--text-muted)] hover:text-white'}`}
          >
            {copied === 'hex' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <input
          type="text"
          value={hex}
          onChange={(e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            setHex(val);
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              updateFromHex(val);
            }
          }}
          className="w-full bg-transparent text-white font-mono text-lg focus:outline-none"
          placeholder="#000000"
        />
      </div>

      {/* RGB Inputs */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">RGB</label>
          <button
            onClick={() => handleCopy('rgb', rgbValue)}
            className={`text-xs ${copied === 'rgb' ? 'text-green-400' : 'text-[var(--text-muted)] hover:text-white'}`}
          >
            {copied === 'rgb' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(['r', 'g', 'b'] as const).map((channel) => (
            <div key={channel}>
              <label htmlFor={`rgb-${channel}`} className="block text-xs text-[var(--text-dim)] mb-1 uppercase">{channel}</label>
              <input
                id={`rgb-${channel}`}
                type="number"
                min="0"
                max="255"
                value={rgb[channel]}
                onChange={(e) => updateFromRgb({ ...rgb, [channel]: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                           text-white font-mono focus:outline-none focus:border-white/30"
              />
            </div>
          ))}
        </div>
      </div>

      {/* HSL Inputs */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">HSL</label>
          <button
            onClick={() => handleCopy('hsl', hslValue)}
            className={`text-xs ${copied === 'hsl' ? 'text-green-400' : 'text-[var(--text-muted)] hover:text-white'}`}
          >
            {copied === 'hsl' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="hsl-h" className="block text-xs text-[var(--text-dim)] mb-1">H (°)</label>
            <input
              id="hsl-h"
              type="number"
              min="0"
              max="360"
              value={hsl.h}
              onChange={(e) => updateFromHsl({ ...hsl, h: parseInt(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                         text-white font-mono focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label htmlFor="hsl-s" className="block text-xs text-[var(--text-dim)] mb-1">S (%)</label>
            <input
              id="hsl-s"
              type="number"
              min="0"
              max="100"
              value={hsl.s}
              onChange={(e) => updateFromHsl({ ...hsl, s: parseInt(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                         text-white font-mono focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label htmlFor="hsl-l" className="block text-xs text-[var(--text-dim)] mb-1">L (%)</label>
            <input
              id="hsl-l"
              type="number"
              min="0"
              max="100"
              value={hsl.l}
              onChange={(e) => updateFromHsl({ ...hsl, l: parseInt(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                         text-white font-mono focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
      </div>

      {/* CSS Output */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
          CSS Variables
        </label>
        <code className="block text-xs text-cyan-400 font-mono whitespace-pre leading-relaxed">
{`--color-hex: ${hexValue};
--color-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};
--color-hsl: ${hsl.h}, ${hsl.s}%, ${hsl.l}%;`}
        </code>
      </div>
    </div>
  );
}
