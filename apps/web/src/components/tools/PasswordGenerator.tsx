import { useState, useCallback, useEffect } from 'react';

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

function generateSecurePassword(options: PasswordOptions): string {
  let charset = '';
  if (options.uppercase) charset += CHAR_SETS.uppercase;
  if (options.lowercase) charset += CHAR_SETS.lowercase;
  if (options.numbers) charset += CHAR_SETS.numbers;
  if (options.symbols) charset += CHAR_SETS.symbols;

  if (!charset) return '';

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

function calculateStrength(password: string, options: PasswordOptions): { level: StrengthLevel; score: number; label: string } {
  if (!password) return { level: 'weak', score: 0, label: 'No password' };

  let score = 0;
  const length = password.length;

  // Length scoring
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 24) score += 1;

  // Character variety scoring
  const varietyCount = [options.uppercase, options.lowercase, options.numbers, options.symbols].filter(Boolean).length;
  score += varietyCount;

  // Determine level
  let level: StrengthLevel;
  let label: string;

  if (score <= 2) {
    level = 'weak';
    label = 'Weak';
  } else if (score <= 4) {
    level = 'medium';
    label = 'Medium';
  } else if (score <= 6) {
    level = 'strong';
    label = 'Strong';
  } else {
    level = 'very-strong';
    label = 'Very Strong';
  }

  return { level, score: Math.min(score, 8), label };
}

const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  'weak': 'bg-red-500',
  'medium': 'bg-yellow-500',
  'strong': 'bg-green-500',
  'very-strong': 'bg-cyan-400'
};

const STRENGTH_TEXT_COLORS: Record<StrengthLevel, string> = {
  'weak': 'text-red-400',
  'medium': 'text-yellow-400',
  'strong': 'text-green-400',
  'very-strong': 'text-cyan-400'
};

export default function PasswordGenerator() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });

  const strength = calculateStrength(password, options);

  const handleGenerate = useCallback(() => {
    const hasAnyOption = options.uppercase || options.lowercase || options.numbers || options.symbols;
    if (!hasAnyOption) return;

    const newPassword = generateSecurePassword(options);
    setPassword(newPassword);
    setCopied(false);
  }, [options]);

  // Generate initial password on mount
  useEffect(() => {
    handleGenerate();
  }, []);

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const hasAnyOption = options.uppercase || options.lowercase || options.numbers || options.symbols;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Password Display */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              readOnly
              placeholder="Click generate to create password"
              className="w-full bg-transparent text-lg font-mono text-cyan-400
                         focus:outline-none pr-10"
            />
          </div>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="text-[var(--text-muted)] hover:text-white transition-colors p-2"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
          <button
            onClick={handleCopy}
            disabled={!password}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                       ${copied
                         ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                         : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                       } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Strength Indicator */}
        {password && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Password Strength</span>
              <span className={STRENGTH_TEXT_COLORS[strength.level]}>{strength.label}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${STRENGTH_COLORS[strength.level]}`}
                style={{ width: `${(strength.score / 8) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
        {/* Length Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-white">Password Length</label>
            <span className="text-sm font-mono text-cyan-400 bg-white/10 px-3 py-1 rounded">
              {options.length}
            </span>
          </div>
          <input
            type="range"
            min="8"
            max="128"
            value={options.length}
            onChange={(e) => updateOption('length', parseInt(e.target.value))}
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
            <span>8</span>
            <span>128</span>
          </div>
        </div>

        {/* Character Type Toggles */}
        <div className="space-y-3">
          <label className="text-sm text-white">Character Types</label>

          <div className="grid grid-cols-2 gap-3">
            <ToggleOption
              label="Uppercase (A-Z)"
              checked={options.uppercase}
              onChange={(checked) => updateOption('uppercase', checked)}
              disabled={options.uppercase && !options.lowercase && !options.numbers && !options.symbols}
            />
            <ToggleOption
              label="Lowercase (a-z)"
              checked={options.lowercase}
              onChange={(checked) => updateOption('lowercase', checked)}
              disabled={options.lowercase && !options.uppercase && !options.numbers && !options.symbols}
            />
            <ToggleOption
              label="Numbers (0-9)"
              checked={options.numbers}
              onChange={(checked) => updateOption('numbers', checked)}
              disabled={options.numbers && !options.uppercase && !options.lowercase && !options.symbols}
            />
            <ToggleOption
              label="Symbols (!@#$%)"
              checked={options.symbols}
              onChange={(checked) => updateOption('symbols', checked)}
              disabled={options.symbols && !options.uppercase && !options.lowercase && !options.numbers}
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!hasAnyOption}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate New Password
      </button>

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>Passwords are generated locally using Web Crypto API (crypto.getRandomValues).</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Your passwords never leave your browser. We never store or transmit them.
        </p>
      </div>
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleOption({ label, checked, onChange, disabled }: ToggleOptionProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all text-left
        ${checked
          ? 'bg-white/10 border-white/30 text-white'
          : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
      `}
    >
      <div className={`
        w-5 h-5 rounded border-2 flex items-center justify-center transition-all
        ${checked ? 'bg-cyan-400 border-cyan-400' : 'border-white/30'}
      `}>
        {checked && (
          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  );
}
