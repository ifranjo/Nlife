import { useState, useCallback } from 'react';
import { createSafeErrorMessage } from '../../lib/security';
import { copyToClipboard } from '../../lib/clipboard';

type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

const ALGORITHMS: { id: HashAlgorithm; webCrypto: string | null; bits: number }[] = [
  { id: 'MD5', webCrypto: null, bits: 128 },  // MD5 not in Web Crypto, we'll implement
  { id: 'SHA-1', webCrypto: 'SHA-1', bits: 160 },
  { id: 'SHA-256', webCrypto: 'SHA-256', bits: 256 },
  { id: 'SHA-384', webCrypto: 'SHA-384', bits: 384 },
  { id: 'SHA-512', webCrypto: 'SHA-512', bits: 512 },
];

// Simple MD5 implementation (for browser without external deps)
function md5(input: string): string {
  function rotateLeft(x: number, n: number): number {
    return (x << n) | (x >>> (32 - n));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function F(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | ~z); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), t));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), t));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), t));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), t));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function toHex(n: number): string {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += ((n >> (i * 8 + 4)) & 0xF).toString(16) + ((n >> (i * 8)) & 0xF).toString(16);
    }
    return s;
  }

  const bytes = new TextEncoder().encode(input);
  const len = bytes.length;

  // Padding
  const paddedLen = ((len + 8) >>> 6 << 6) + 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[len] = 0x80;

  const bitLen = len * 8;
  padded[paddedLen - 8] = bitLen & 0xFF;
  padded[paddedLen - 7] = (bitLen >>> 8) & 0xFF;
  padded[paddedLen - 6] = (bitLen >>> 16) & 0xFF;
  padded[paddedLen - 5] = (bitLen >>> 24) & 0xFF;

  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

  for (let i = 0; i < paddedLen; i += 64) {
    const x: number[] = [];
    for (let j = 0; j < 16; j++) {
      x[j] = padded[i + j * 4] | (padded[i + j * 4 + 1] << 8) |
             (padded[i + j * 4 + 2] << 16) | (padded[i + j * 4 + 3] << 24);
    }

    let aa = a, bb = b, cc = c, dd = d;

    a = FF(a, b, c, d, x[0], 7, 0xD76AA478); d = FF(d, a, b, c, x[1], 12, 0xE8C7B756);
    c = FF(c, d, a, b, x[2], 17, 0x242070DB); b = FF(b, c, d, a, x[3], 22, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[4], 7, 0xF57C0FAF); d = FF(d, a, b, c, x[5], 12, 0x4787C62A);
    c = FF(c, d, a, b, x[6], 17, 0xA8304613); b = FF(b, c, d, a, x[7], 22, 0xFD469501);
    a = FF(a, b, c, d, x[8], 7, 0x698098D8); d = FF(d, a, b, c, x[9], 12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[10], 17, 0xFFFF5BB1); b = FF(b, c, d, a, x[11], 22, 0x895CD7BE);
    a = FF(a, b, c, d, x[12], 7, 0x6B901122); d = FF(d, a, b, c, x[13], 12, 0xFD987193);
    c = FF(c, d, a, b, x[14], 17, 0xA679438E); b = FF(b, c, d, a, x[15], 22, 0x49B40821);

    a = GG(a, b, c, d, x[1], 5, 0xF61E2562); d = GG(d, a, b, c, x[6], 9, 0xC040B340);
    c = GG(c, d, a, b, x[11], 14, 0x265E5A51); b = GG(b, c, d, a, x[0], 20, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[5], 5, 0xD62F105D); d = GG(d, a, b, c, x[10], 9, 0x02441453);
    c = GG(c, d, a, b, x[15], 14, 0xD8A1E681); b = GG(b, c, d, a, x[4], 20, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[9], 5, 0x21E1CDE6); d = GG(d, a, b, c, x[14], 9, 0xC33707D6);
    c = GG(c, d, a, b, x[3], 14, 0xF4D50D87); b = GG(b, c, d, a, x[8], 20, 0x455A14ED);
    a = GG(a, b, c, d, x[13], 5, 0xA9E3E905); d = GG(d, a, b, c, x[2], 9, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[7], 14, 0x676F02D9); b = GG(b, c, d, a, x[12], 20, 0x8D2A4C8A);

    a = HH(a, b, c, d, x[5], 4, 0xFFFA3942); d = HH(d, a, b, c, x[8], 11, 0x8771F681);
    c = HH(c, d, a, b, x[11], 16, 0x6D9D6122); b = HH(b, c, d, a, x[14], 23, 0xFDE5380C);
    a = HH(a, b, c, d, x[1], 4, 0xA4BEEA44); d = HH(d, a, b, c, x[4], 11, 0x4BDECFA9);
    c = HH(c, d, a, b, x[7], 16, 0xF6BB4B60); b = HH(b, c, d, a, x[10], 23, 0xBEBFBC70);
    a = HH(a, b, c, d, x[13], 4, 0x289B7EC6); d = HH(d, a, b, c, x[0], 11, 0xEAA127FA);
    c = HH(c, d, a, b, x[3], 16, 0xD4EF3085); b = HH(b, c, d, a, x[6], 23, 0x04881D05);
    a = HH(a, b, c, d, x[9], 4, 0xD9D4D039); d = HH(d, a, b, c, x[12], 11, 0xE6DB99E5);
    c = HH(c, d, a, b, x[15], 16, 0x1FA27CF8); b = HH(b, c, d, a, x[2], 23, 0xC4AC5665);

    a = II(a, b, c, d, x[0], 6, 0xF4292244); d = II(d, a, b, c, x[7], 10, 0x432AFF97);
    c = II(c, d, a, b, x[14], 15, 0xAB9423A7); b = II(b, c, d, a, x[5], 21, 0xFC93A039);
    a = II(a, b, c, d, x[12], 6, 0x655B59C3); d = II(d, a, b, c, x[3], 10, 0x8F0CCC92);
    c = II(c, d, a, b, x[10], 15, 0xFFEFF47D); b = II(b, c, d, a, x[1], 21, 0x85845DD1);
    a = II(a, b, c, d, x[8], 6, 0x6FA87E4F); d = II(d, a, b, c, x[15], 10, 0xFE2CE6E0);
    c = II(c, d, a, b, x[6], 15, 0xA3014314); b = II(b, c, d, a, x[13], 21, 0x4E0811A1);
    a = II(a, b, c, d, x[4], 6, 0xF7537E82); d = II(d, a, b, c, x[11], 10, 0xBD3AF235);
    c = II(c, d, a, b, x[2], 15, 0x2AD7D2BB); b = II(b, c, d, a, x[9], 21, 0xEB86D391);

    a = addUnsigned(a, aa); b = addUnsigned(b, bb); c = addUnsigned(c, cc); d = addUnsigned(d, dd);
  }

  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

async function hashWithWebCrypto(text: string, algorithm: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function HashGenerator() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<HashAlgorithm, string>>({
    'MD5': '',
    'SHA-1': '',
    'SHA-256': '',
    'SHA-384': '',
    'SHA-512': '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedAlgo, setCopiedAlgo] = useState<HashAlgorithm | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const generateHashes = useCallback(async () => {
    if (!input) {
      setHashes({ 'MD5': '', 'SHA-1': '', 'SHA-256': '', 'SHA-384': '', 'SHA-512': '' });
      return;
    }

    
    setIsProcessing(true);
    setError(null);
    try {
      const results: Record<HashAlgorithm, string> = {
        'MD5': md5(input),
        'SHA-1': await hashWithWebCrypto(input, 'SHA-1'),
        'SHA-256': await hashWithWebCrypto(input, 'SHA-256'),
        'SHA-384': await hashWithWebCrypto(input, 'SHA-384'),
        'SHA-512': await hashWithWebCrypto(input, 'SHA-512'),
      };
      setHashes(results);
          } catch (err) {
      setError(createSafeErrorMessage(err, 'Failed to generate hashes. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  }, [input, checkUsage, recordUsage]);

  const handleCopy = async (algo: HashAlgorithm) => {
    if (!hashes[algo]) return;
    const success = await copyToClipboard(hashes[algo]);
    if (success) {
      setCopiedAlgo(algo);
      setTimeout(() => setCopiedAlgo(null), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-4 flex justify-end">
              </div>
      {/* Input */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Input Text
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4
                     text-white placeholder-[var(--text-muted)] resize-none
                     focus:outline-none focus:border-white/30 transition-colors"
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={generateHashes}
        disabled={!input || isProcessing}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Generating...' : 'Generate Hashes'}
      </button>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {Object.values(hashes).some(Boolean) && (
        <div className="space-y-3">
          {ALGORITHMS.map(({ id, bits }) => (
            <div
              key={id}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{id}</span>
                  <span className="text-[0.625rem] text-[var(--text-muted)]">{bits} bit</span>
                </div>
                <button
                  onClick={() => handleCopy(id)}
                  className={`
                    text-xs transition-colors
                    ${copiedAlgo === id ? 'text-green-400' : 'text-[var(--text-muted)] hover:text-white'}
                  `}
                >
                  {copiedAlgo === id ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <code className="block text-xs text-cyan-400 font-mono break-all leading-relaxed">
                {hashes[id] || '—'}
              </code>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>All hashing is done locally in your browser using Web Crypto API.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Note: MD5 and SHA-1 are cryptographically broken. Use SHA-256+ for security.
        </p>
      </div>
          </div>
  );
}
