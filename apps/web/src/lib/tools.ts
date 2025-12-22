export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  thumbnail: string;
  category: 'document' | 'media' | 'ai' | 'utility';
  tier: 'free' | 'pro' | 'coming';
  href: string;
  color: string;
  tags?: string[];
  popular?: boolean;
  releaseDate?: string;
}

export const tools: Tool[] = [
  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'pdf-merge',
    name: 'PDF Merge',
    description: 'Combine multiple PDFs into a single document. Fast, secure, and completely free.',
    icon: '📄',
    thumbnail: '/thumbnails/pdf-merge.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-merge',
    color: 'from-red-500 to-orange-500',
    tags: ['pdf', 'merge', 'combine', 'document'],
    popular: true,
    releaseDate: '2024-12-01'
  },
  {
    id: 'pdf-split',
    name: 'PDF Split',
    description: 'Split PDFs into individual pages or extract specific page ranges. Download as ZIP.',
    icon: '✂️',
    thumbnail: '/thumbnails/pdf-split.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-split',
    color: 'from-orange-500 to-yellow-500',
    tags: ['pdf', 'split', 'extract', 'pages'],
    popular: true,
    releaseDate: '2024-12-05'
  },
  {
    id: 'pdf-redactor',
    name: 'PDF Redactor',
    description: 'Permanently redact sensitive information from PDFs. Auto-detect SSN, emails, phone numbers.',
    icon: '🔒',
    thumbnail: '/thumbnails/pdf-redactor.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-redactor',
    color: 'from-red-500 to-rose-500'
  },
  {
    id: 'pdf-form-filler',
    name: 'PDF Form Filler',
    description: 'Fill PDF forms and add signatures. HIPAA-safe - your documents never leave your browser.',
    icon: '✍️',
    thumbnail: '/thumbnails/pdf-form-filler.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-form-filler',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'ocr-extractor',
    name: 'OCR Text Extractor',
    description: 'Extract text from images and PDFs using AI-powered OCR. 100% private, runs in your browser.',
    icon: '📝',
    thumbnail: '/thumbnails/ocr-extractor.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/ocr-extractor',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'document-scanner',
    name: 'Document Scanner',
    description: 'Scan documents with your camera. Auto edge detection and PDF export. Works offline.',
    icon: '📷',
    thumbnail: '/thumbnails/document-scanner.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/document-scanner',
    color: 'from-violet-500 to-purple-500'
  },

  // ═══════════════════════════════════════════════════════════════
  // MEDIA TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'image-compress',
    name: 'Image Compress',
    description: 'Compress images up to 90% smaller. Supports PNG, JPEG, WebP. Batch processing with ZIP download.',
    icon: '🖼️',
    thumbnail: '/thumbnails/image-compress.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/image-compress',
    color: 'from-green-500 to-emerald-500',
    tags: ['image', 'compress', 'optimize', 'png', 'jpeg', 'webp'],
    popular: true,
    releaseDate: '2024-12-10'
  },
  {
    id: 'background-remover',
    name: 'Background Remover',
    description: 'Remove image backgrounds instantly with AI. 100% private - runs entirely in your browser.',
    icon: '✂️',
    thumbnail: '/thumbnails/background-remover.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/background-remover',
    color: 'from-fuchsia-500 to-pink-500'
  },

  // ═══════════════════════════════════════════════════════════════
  // UTILITY TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'qr-generator',
    name: 'QR Generator',
    description: 'Generate customizable QR codes for links, text, and contact info.',
    icon: '📱',
    thumbnail: '/thumbnails/qr-generator.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/qr-generator',
    color: 'from-indigo-500 to-violet-500',
    tags: ['qr', 'code', 'generator', 'barcode'],
    popular: true,
    releaseDate: '2024-12-15'
  },
  {
    id: 'base64',
    name: 'Base64 Encoder/Decoder',
    description: 'Encode and decode Base64 data. Convert text and files to/from Base64 format.',
    icon: '🔐',
    thumbnail: '/thumbnails/base64.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/base64',
    color: 'from-slate-500 to-gray-500'
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, validate, and beautify JSON data. Minify or prettify with syntax highlighting.',
    icon: '{ }',
    thumbnail: '/thumbnails/json-formatter.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/json-formatter',
    color: 'from-amber-500 to-yellow-500'
  },
  {
    id: 'text-case',
    name: 'Text Case Converter',
    description: 'Convert text between UPPERCASE, lowercase, Title Case, camelCase, snake_case, and more.',
    icon: '🔤',
    thumbnail: '/thumbnails/text-case.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/text-case',
    color: 'from-teal-500 to-cyan-500'
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters, sentences, and paragraphs. Includes reading time and keyword density.',
    icon: '📊',
    thumbnail: '/thumbnails/word-counter.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/word-counter',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum Generator',
    description: 'Generate placeholder text for your designs. Create paragraphs, sentences, or words.',
    icon: '📝',
    thumbnail: '/thumbnails/lorem-ipsum.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/lorem-ipsum',
    color: 'from-violet-500 to-purple-500'
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes using Web Crypto API.',
    icon: '#️⃣',
    thumbnail: '/thumbnails/hash-generator.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/hash-generator',
    color: 'from-rose-500 to-red-500'
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    description: 'Convert colors between HEX, RGB, and HSL formats with live preview and CSS output.',
    icon: '🎨',
    thumbnail: '/thumbnails/color-converter.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/color-converter',
    color: 'from-pink-500 to-rose-500'
  },

  // ═══════════════════════════════════════════════════════════════
  // AI/PRO TOOLS - REMOVED (legal/ethical concerns with video avatars)
  // Future browser-based AI tools will be added here after review
  // See: docs/plans/browser-ai-tools-roadmap.md
  // ═══════════════════════════════════════════════════════════════
];

export const getToolsByCategory = (category: Tool['category']) =>
  tools.filter(t => t.category === category);

export const getToolsByTier = (tier: Tool['tier']) =>
  tools.filter(t => t.tier === tier);

export const getToolById = (id: string) =>
  tools.find(t => t.id === id);
