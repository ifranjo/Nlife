import { useState, useMemo } from 'react';
import { copyToClipboard } from '../../lib/clipboard';
import { sanitizeTextContent, escapeHtml } from '../../lib/security';

type Category = 'length' | 'weight' | 'temperature' | 'volume' | 'area' | 'speed' | 'time' | 'digital';

interface Unit {
  name: string;
  symbol: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

const UNITS: Record<Category, Record<string, Unit>> = {
  length: {
    millimeter: {
      name: 'Millimeter',
      symbol: 'mm',
      toBase: (v) => v / 1000,
      fromBase: (v) => v * 1000,
    },
    centimeter: {
      name: 'Centimeter',
      symbol: 'cm',
      toBase: (v) => v / 100,
      fromBase: (v) => v * 100,
    },
    meter: {
      name: 'Meter',
      symbol: 'm',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    kilometer: {
      name: 'Kilometer',
      symbol: 'km',
      toBase: (v) => v * 1000,
      fromBase: (v) => v / 1000,
    },
    inch: {
      name: 'Inch',
      symbol: 'in',
      toBase: (v) => v * 0.0254,
      fromBase: (v) => v / 0.0254,
    },
    foot: {
      name: 'Foot',
      symbol: 'ft',
      toBase: (v) => v * 0.3048,
      fromBase: (v) => v / 0.3048,
    },
    yard: {
      name: 'Yard',
      symbol: 'yd',
      toBase: (v) => v * 0.9144,
      fromBase: (v) => v / 0.9144,
    },
    mile: {
      name: 'Mile',
      symbol: 'mi',
      toBase: (v) => v * 1609.344,
      fromBase: (v) => v / 1609.344,
    },
  },
  weight: {
    milligram: {
      name: 'Milligram',
      symbol: 'mg',
      toBase: (v) => v / 1000000,
      fromBase: (v) => v * 1000000,
    },
    gram: {
      name: 'Gram',
      symbol: 'g',
      toBase: (v) => v / 1000,
      fromBase: (v) => v * 1000,
    },
    kilogram: {
      name: 'Kilogram',
      symbol: 'kg',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    ounce: {
      name: 'Ounce',
      symbol: 'oz',
      toBase: (v) => v * 0.0283495,
      fromBase: (v) => v / 0.0283495,
    },
    pound: {
      name: 'Pound',
      symbol: 'lb',
      toBase: (v) => v * 0.453592,
      fromBase: (v) => v / 0.453592,
    },
    ton: {
      name: 'Ton (metric)',
      symbol: 't',
      toBase: (v) => v * 1000,
      fromBase: (v) => v / 1000,
    },
  },
  temperature: {
    celsius: {
      name: 'Celsius',
      symbol: '°C',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    fahrenheit: {
      name: 'Fahrenheit',
      symbol: '°F',
      toBase: (v) => (v - 32) * 5 / 9,
      fromBase: (v) => (v * 9 / 5) + 32,
    },
    kelvin: {
      name: 'Kelvin',
      symbol: 'K',
      toBase: (v) => v - 273.15,
      fromBase: (v) => v + 273.15,
    },
  },
  volume: {
    milliliter: {
      name: 'Milliliter',
      symbol: 'mL',
      toBase: (v) => v / 1000,
      fromBase: (v) => v * 1000,
    },
    liter: {
      name: 'Liter',
      symbol: 'L',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    gallon: {
      name: 'Gallon (US)',
      symbol: 'gal',
      toBase: (v) => v * 3.78541,
      fromBase: (v) => v / 3.78541,
    },
    cup: {
      name: 'Cup (US)',
      symbol: 'cup',
      toBase: (v) => v * 0.236588,
      fromBase: (v) => v / 0.236588,
    },
    tablespoon: {
      name: 'Tablespoon',
      symbol: 'tbsp',
      toBase: (v) => v * 0.0147868,
      fromBase: (v) => v / 0.0147868,
    },
    teaspoon: {
      name: 'Teaspoon',
      symbol: 'tsp',
      toBase: (v) => v * 0.00492892,
      fromBase: (v) => v / 0.00492892,
    },
  },
  area: {
    'square-millimeter': {
      name: 'Square Millimeter',
      symbol: 'mm²',
      toBase: (v) => v / 1000000,
      fromBase: (v) => v * 1000000,
    },
    'square-centimeter': {
      name: 'Square Centimeter',
      symbol: 'cm²',
      toBase: (v) => v / 10000,
      fromBase: (v) => v * 10000,
    },
    'square-meter': {
      name: 'Square Meter',
      symbol: 'm²',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    'square-kilometer': {
      name: 'Square Kilometer',
      symbol: 'km²',
      toBase: (v) => v * 1000000,
      fromBase: (v) => v / 1000000,
    },
    'square-inch': {
      name: 'Square Inch',
      symbol: 'in²',
      toBase: (v) => v * 0.00064516,
      fromBase: (v) => v / 0.00064516,
    },
    'square-foot': {
      name: 'Square Foot',
      symbol: 'ft²',
      toBase: (v) => v * 0.092903,
      fromBase: (v) => v / 0.092903,
    },
    acre: {
      name: 'Acre',
      symbol: 'ac',
      toBase: (v) => v * 4046.86,
      fromBase: (v) => v / 4046.86,
    },
  },
  speed: {
    'meters-per-second': {
      name: 'Meters/Second',
      symbol: 'm/s',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    'kilometers-per-hour': {
      name: 'Kilometers/Hour',
      symbol: 'km/h',
      toBase: (v) => v / 3.6,
      fromBase: (v) => v * 3.6,
    },
    'miles-per-hour': {
      name: 'Miles/Hour',
      symbol: 'mph',
      toBase: (v) => v * 0.44704,
      fromBase: (v) => v / 0.44704,
    },
    knot: {
      name: 'Knot',
      symbol: 'kn',
      toBase: (v) => v * 0.514444,
      fromBase: (v) => v / 0.514444,
    },
  },
  time: {
    millisecond: {
      name: 'Millisecond',
      symbol: 'ms',
      toBase: (v) => v / 1000,
      fromBase: (v) => v * 1000,
    },
    second: {
      name: 'Second',
      symbol: 's',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    minute: {
      name: 'Minute',
      symbol: 'min',
      toBase: (v) => v * 60,
      fromBase: (v) => v / 60,
    },
    hour: {
      name: 'Hour',
      symbol: 'h',
      toBase: (v) => v * 3600,
      fromBase: (v) => v / 3600,
    },
    day: {
      name: 'Day',
      symbol: 'd',
      toBase: (v) => v * 86400,
      fromBase: (v) => v / 86400,
    },
    week: {
      name: 'Week',
      symbol: 'wk',
      toBase: (v) => v * 604800,
      fromBase: (v) => v / 604800,
    },
    month: {
      name: 'Month (30 days)',
      symbol: 'mo',
      toBase: (v) => v * 2592000,
      fromBase: (v) => v / 2592000,
    },
    year: {
      name: 'Year (365 days)',
      symbol: 'yr',
      toBase: (v) => v * 31536000,
      fromBase: (v) => v / 31536000,
    },
  },
  digital: {
    bit: {
      name: 'Bit',
      symbol: 'b',
      toBase: (v) => v / 8,
      fromBase: (v) => v * 8,
    },
    byte: {
      name: 'Byte',
      symbol: 'B',
      toBase: (v) => v,
      fromBase: (v) => v,
    },
    kilobyte: {
      name: 'Kilobyte',
      symbol: 'KB',
      toBase: (v) => v * 1024,
      fromBase: (v) => v / 1024,
    },
    megabyte: {
      name: 'Megabyte',
      symbol: 'MB',
      toBase: (v) => v * 1048576,
      fromBase: (v) => v / 1048576,
    },
    gigabyte: {
      name: 'Gigabyte',
      symbol: 'GB',
      toBase: (v) => v * 1073741824,
      fromBase: (v) => v / 1073741824,
    },
    terabyte: {
      name: 'Terabyte',
      symbol: 'TB',
      toBase: (v) => v * 1099511627776,
      fromBase: (v) => v / 1099511627776,
    },
    petabyte: {
      name: 'Petabyte',
      symbol: 'PB',
      toBase: (v) => v * 1125899906842624,
      fromBase: (v) => v / 1125899906842624,
    },
  },
};

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'length', label: 'Length', icon: '📏' },
  { id: 'weight', label: 'Weight', icon: '⚖️' },
  { id: 'temperature', label: 'Temperature', icon: '🌡️' },
  { id: 'volume', label: 'Volume', icon: '🧪' },
  { id: 'area', label: 'Area', icon: '⬜' },
  { id: 'speed', label: 'Speed', icon: '🏃' },
  { id: 'time', label: 'Time', icon: '⏱️' },
  { id: 'digital', label: 'Digital', icon: '💾' },
];

// Numeric input validation constants
const MAX_INPUT_LENGTH = 50;
const MAX_ABS_VALUE = 1e308; // JavaScript Number.MAX_VALUE
const MAX_PRECISION_DIGITS = 15;

/**
 * Validates numeric input for security
 * Prevents: buffer overflow, ReDoS, NaN injection, infinite loops
 */
function validateNumericInput(input: string): { valid: boolean; sanitized: string; error?: string } {
  // Sanitize first to remove control characters
  const sanitized = sanitizeTextContent(input.trim(), MAX_INPUT_LENGTH);

  if (!sanitized) {
    return { valid: false, sanitized: '', error: 'Empty input' };
  }

  if (sanitized.length > MAX_INPUT_LENGTH) {
    return { valid: false, sanitized: '', error: 'Input too long' };
  }

  // Allow: digits, single decimal point, leading sign, scientific notation
  const numericPattern = /^[+-]?(\d+\.?\d*|\d*\.?\d+)([eE][+-]?\d+)?$/;
  if (!numericPattern.test(sanitized)) {
    return { valid: false, sanitized: '', error: 'Invalid numeric format' };
  }

  // Parse and validate range
  const value = parseFloat(sanitized);
  if (isNaN(value) || !isFinite(value)) {
    return { valid: false, sanitized: '', error: 'Invalid number' };
  }

  if (Math.abs(value) > MAX_ABS_VALUE) {
    return { valid: false, sanitized: '', error: 'Value too large' };
  }

  // Check for too many significant digits (precision attack)
  if (sanitized.replace(/[.+eE-]/g, '').length > MAX_PRECISION_DIGITS) {
    return { valid: false, sanitized: '', error: 'Too many digits' };
  }

  return { valid: true, sanitized };
}

function formatNumber(value: number): string {
  // Handle edge cases safely
  if (value === 0) return '0';
  if (!isFinite(value)) return 'N/A';
  if (Number.isNaN(value)) return 'N/A';

  const abs = Math.abs(value);

  if (abs >= 1e9) {
    return value.toExponential(6);
  }

  if (abs < 0.000001 && abs > 0) {
    return value.toExponential(6);
  }

  if (abs < 1) {
    return value.toPrecision(8).replace(/\.?0+$/, '');
  }

  return value.toLocaleString('en-US', {
    maximumFractionDigits: 10,
    minimumFractionDigits: 0
  });
}

export default function UnitConverter() {
  
  const [category, setCategory] = useState<Category>('length');
  const [inputValue, setInputValue] = useState('1');
  const [inputValidationError, setInputValidationError] = useState<string | null>(null);
  const [fromUnit, setFromUnit] = useState('meter');
  const [copiedUnit, setCopiedUnit] = useState<string | null>(null);

  const units = UNITS[category];
  const firstUnitKey = Object.keys(units)[0];

  if (fromUnit && !units[fromUnit]) {
    setFromUnit(firstUnitKey);
  }

  // Validate input and set error state
  useMemo(() => {
    const validation = validateNumericInput(inputValue);
    setInputValidationError(validation.valid ? null : validation.error || null);
  }, [inputValue]);

  const conversions = useMemo(() => {
    // Validate numeric input
    const validation = validateNumericInput(inputValue);
    if (!validation.valid || !fromUnit || !units[fromUnit]) {
      return [];
    }

    const value = parseFloat(validation.sanitized);
    if (isNaN(value) || !isFinite(value)) {
      return [];
    }

    const baseValue = units[fromUnit].toBase(value);

    // Check for overflow
    if (!isFinite(baseValue)) {
      return [];
    }

    return Object.entries(units)
      .filter(([key]) => key !== fromUnit)
      .map(([key, unit]) => {
        const convertedValue = unit.fromBase(baseValue);
        // Validate converted value
        if (!isFinite(convertedValue) || Math.abs(convertedValue) > MAX_ABS_VALUE) {
          return { key, unit, value: NaN };
        }
        return { key, unit, value: convertedValue };
      });
  }, [inputValue, fromUnit, units]);

  const handleCategoryChange = (newCategory: Category) => {
        setCategory(newCategory);
    const newUnits = UNITS[newCategory];
    setFromUnit(Object.keys(newUnits)[0]);
    setInputValue('1');
      };

  const handleCopy = async (key: string, value: number) => {
    const text = formatNumber(value);
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedUnit(key);
      setTimeout(() => setCopiedUnit(null), 2000);
    }
  };

  const handleSwap = (targetUnit: string) => {
    // Validate the target unit key
    const sanitizedUnit = sanitizeTextContent(targetUnit, 50);
    const targetValue = conversions.find(c => c.key === sanitizedUnit)?.value;
    if (targetValue !== undefined && !isNaN(targetValue)) {
      setInputValue(formatNumber(targetValue));
      setFromUnit(sanitizedUnit);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      
      {/* Category Selector */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <label className="block text-sm text-white mb-3">Category</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all border
                ${category === cat.id
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-[var(--text-muted)] hover:bg-white/10'
                }
              `}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <label htmlFor="unit-input" className="block text-sm text-white mb-3">Convert From</label>
        <div className="flex gap-3">
          <input
            id="unit-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter value"
            aria-invalid={inputValidationError !== null}
            aria-describedby="input-error"
            className={`flex-1 bg-white/10 border rounded-lg px-4 py-3
                       text-white placeholder-[var(--text-dim)] focus:outline-none
                       transition-colors ${
                         inputValidationError
                           ? 'border-red-500/50 focus:border-red-500/50'
                           : 'border-white/20 focus:border-cyan-400/50'
                       }`}
          />
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-3
                       text-white focus:outline-none focus:border-cyan-400/50
                       transition-colors cursor-pointer min-w-[140px]"
          >
            {Object.entries(units).map(([key, unit]) => (
              <option key={key} value={key} className="bg-[var(--bg-primary)]">
                {escapeHtml(unit.name)} ({escapeHtml(unit.symbol)})
              </option>
            ))}
          </select>
        </div>
        {inputValidationError && (
          <p id="input-error" className="mt-2 text-sm text-red-400" role="alert">
            {escapeHtml(inputValidationError)}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm text-white mb-4">Converted Values</h3>
        {conversions.length === 0 || inputValidationError ? (
          <p className="text-[var(--text-muted)] text-sm text-center py-8">
            {inputValidationError
              ? 'Fix the input error to see conversions'
              : 'Enter a valid number to see conversions'}
          </p>
        ) : (
          <div className="space-y-2">
            {conversions.map(({ key, unit, value }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-white/5
                           rounded-lg border border-white/10 hover:bg-white/10
                           transition-colors group"
              >
                <div className="flex-1">
                  <div className="text-sm text-[var(--text-muted)]">
                    {escapeHtml(unit.name)} ({escapeHtml(unit.symbol)})
                  </div>
                  <div className="text-lg font-mono text-cyan-400 mt-1">
                    {escapeHtml(formatNumber(value))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSwap(key)}
                    className="p-2 text-[var(--text-muted)] hover:text-white
                               transition-colors opacity-0 group-hover:opacity-100"
                    title="Use as input"
                    aria-label={`Use ${unit.name} as input`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCopy(key, value)}
                    className={`
                      px-3 py-1 rounded text-xs font-medium transition-all
                      ${copiedUnit === key
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                      }
                    `}
                  >
                    {copiedUnit === key ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center text-xs text-[var(--text-muted)]">
        <p>All conversions use precise conversion factors with up to 10 decimal places.</p>
        <p className="mt-1 text-[var(--text-dim)]">
          Calculations performed locally in your browser. No data is sent to any server.
        </p>
      </div>
    </div>
  );
}
