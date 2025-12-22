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
  seo?: {
    title: string;           // Optimized page title (50-60 chars)
    metaDescription: string; // Meta description (150-160 chars)
    h1: string;              // Main heading on page
    keywords: string[];      // Target keywords
  };
  faq?: Array<{
    question: string;
    answer: string;
  }>;
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
    releaseDate: '2024-12-01',
    seo: {
      title: 'Merge PDF Online Free - No Upload Required | New Life',
      metaDescription: 'Combine multiple PDF files into one document instantly. 100% free, no sign up, no file upload to servers. Your PDFs never leave your browser.',
      h1: 'Merge PDF Files Online - Free & Private',
      keywords: ['merge pdf', 'combine pdf', 'pdf merge online free', 'join pdf files']
    },
    faq: [
      { question: 'Is this PDF merger really free?', answer: 'Yes, 100% free with no hidden fees, watermarks, or signup required.' },
      { question: 'Are my PDF files secure?', answer: 'Absolutely. Your files are processed entirely in your browser and never uploaded to any server.' },
      { question: 'How many PDFs can I merge at once?', answer: 'You can merge unlimited PDFs. We recommend keeping total size under 100MB for best performance.' },
      { question: 'What happens to my files after merging?', answer: 'Nothing - your files stay on your device. We have no access to them.' }
    ]
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
    releaseDate: '2024-12-05',
    seo: {
      title: 'Split PDF Online Free - Extract Pages Instantly | New Life',
      metaDescription: 'Split PDF into separate pages or extract specific page ranges. Free, no watermark, no signup. Download individual pages as ZIP.',
      h1: 'Split PDF Into Separate Pages - Free Online Tool',
      keywords: ['split pdf', 'extract pdf pages', 'separate pdf pages', 'pdf splitter free']
    },
    faq: [
      { question: 'Can I extract specific pages from a PDF?', answer: 'Yes, select any page range (e.g., pages 1-3, 5, 7-10) to extract exactly what you need.' },
      { question: 'Is there a watermark on split PDFs?', answer: 'No watermarks ever. Your split PDFs are clean and professional.' },
      { question: 'How do I download multiple pages?', answer: 'Split pages are automatically packaged into a ZIP file for easy download.' }
    ]
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
    color: 'from-red-500 to-rose-500',
    seo: {
      title: 'Redact PDF Online Free - Remove Sensitive Info | New Life',
      metaDescription: 'Permanently redact sensitive information from PDFs. Auto-detect SSN, emails, phone numbers. GDPR compliant - files never leave your browser.',
      h1: 'Redact Sensitive Information from PDFs',
      keywords: ['redact pdf', 'remove sensitive info pdf', 'pdf redaction tool', 'black out pdf text']
    },
    faq: [
      { question: 'Is PDF redaction permanent?', answer: 'Yes, redacted content is permanently removed and cannot be recovered.' },
      { question: 'What information can be auto-detected?', answer: 'SSN, email addresses, phone numbers, credit card numbers, and dates.' },
      { question: 'Is this GDPR compliant?', answer: 'Yes, files are processed locally in your browser and never uploaded to servers.' }
    ]
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
    color: 'from-emerald-500 to-teal-500',
    seo: {
      title: 'Fill PDF Forms Online Free - Add Signature | New Life',
      metaDescription: 'Fill out PDF forms and add electronic signatures online. HIPAA-safe, no upload required. Your documents stay private on your device.',
      h1: 'Fill PDF Forms & Add Signatures Online',
      keywords: ['fill pdf form', 'pdf form filler', 'sign pdf online', 'electronic signature pdf']
    },
    faq: [
      { question: 'Can I add my signature to PDFs?', answer: 'Yes, draw or type your signature and place it anywhere on the document.' },
      { question: 'Is this HIPAA compliant?', answer: 'Yes, all processing happens in your browser. Documents never touch our servers.' },
      { question: 'What types of PDF forms work?', answer: 'Both fillable (AcroForms) and non-fillable PDFs. Add text anywhere.' }
    ]
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
    color: 'from-cyan-500 to-blue-500',
    seo: {
      title: 'Free OCR Online - Extract Text from Images & PDFs | New Life',
      metaDescription: 'Extract text from images and scanned PDFs with AI-powered OCR. 100% free, works offline, no upload needed. Supports 100+ languages.',
      h1: 'OCR Text Extractor - Image to Text Free',
      keywords: ['ocr online', 'image to text', 'extract text from image', 'pdf ocr free']
    },
    faq: [
      { question: 'What languages does the OCR support?', answer: 'Over 100 languages including English, Spanish, Chinese, Arabic, and more.' },
      { question: 'Can I extract text from scanned PDFs?', answer: 'Yes, our AI OCR can read text from scanned documents and images in PDFs.' },
      { question: 'Does this work offline?', answer: 'Yes, after the first load the AI model is cached and works without internet.' }
    ]
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
    color: 'from-violet-500 to-purple-500',
    seo: {
      title: 'Free Document Scanner Online - Camera to PDF | New Life',
      metaDescription: 'Scan documents with your phone or webcam. Auto edge detection, perspective correction, PDF export. Works offline, no app install needed.',
      h1: 'Scan Documents to PDF with Your Camera',
      keywords: ['document scanner online', 'scan to pdf', 'camera scanner', 'phone document scanner']
    },
    faq: [
      { question: 'Do I need to install an app?', answer: 'No, it works directly in your browser using your device camera.' },
      { question: 'Does it auto-detect document edges?', answer: 'Yes, AI automatically detects and crops document boundaries.' },
      { question: 'Can I scan multiple pages into one PDF?', answer: 'Yes, scan multiple pages and combine them into a single PDF document.' }
    ]
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDF files to editable Word documents (.docx). Extracts text and preserves formatting.',
    icon: '📝',
    thumbnail: '/thumbnails/pdf-to-word.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-to-word',
    color: 'from-blue-500 to-indigo-500',
    popular: true,
    seo: {
      title: 'PDF to Word Converter Free Online - No Upload | New Life',
      metaDescription: 'Convert PDF to editable Word document (.docx) instantly. 100% free, no email required, no file upload. Works offline in your browser.',
      h1: 'Convert PDF to Word Online - Free & Private',
      keywords: ['pdf to word', 'pdf to docx', 'convert pdf to word free', 'pdf converter online']
    },
    faq: [
      { question: 'Do I need Microsoft Word installed?', answer: 'No, the converter creates a standard .docx file that opens in Word, Google Docs, or any word processor.' },
      { question: 'Does it preserve formatting?', answer: 'Text and basic formatting are preserved. Complex layouts may need minor adjustments.' },
      { question: 'Can I convert scanned PDFs?', answer: 'For scanned PDFs, use our OCR tool first to extract text, then convert.' }
    ]
  },
  {
    id: 'resume-builder',
    name: 'Resume Builder',
    description: 'Create professional resumes in minutes. Multiple templates, instant PDF download.',
    icon: '📋',
    thumbnail: '/thumbnails/resume-builder.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/resume-builder',
    color: 'from-emerald-500 to-green-500',
    popular: true,
    seo: {
      title: 'Free Resume Builder Online - PDF Download | New Life',
      metaDescription: 'Create a professional resume in minutes. Multiple ATS-friendly templates, instant PDF download. 100% free, no signup or watermark.',
      h1: 'Build Your Resume Free - Professional Templates',
      keywords: ['resume builder free', 'cv maker online', 'free resume template', 'create resume pdf']
    },
    faq: [
      { question: 'Are the resume templates ATS-friendly?', answer: 'Yes, all templates are designed to pass Applicant Tracking Systems used by employers.' },
      { question: 'Can I download my resume as PDF?', answer: 'Yes, download instantly as a professional PDF ready to send to employers.' },
      { question: 'Is my resume data saved?', answer: 'Data stays in your browser only. We never store or access your personal information.' }
    ]
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
    releaseDate: '2024-12-10',
    seo: {
      title: 'Compress Images Online Free - Reduce Size 90% | New Life',
      metaDescription: 'Compress PNG, JPEG, WebP images up to 90% smaller without losing quality. Batch processing, ZIP download. No upload to servers.',
      h1: 'Compress Images Online - Free & Fast',
      keywords: ['compress image', 'reduce image size', 'image compressor online', 'optimize images for web']
    },
    faq: [
      { question: 'How much can images be compressed?', answer: 'Typically 60-90% size reduction while maintaining visual quality.' },
      { question: 'Can I compress multiple images at once?', answer: 'Yes, batch upload supported. Download all as ZIP.' },
      { question: 'Does compression reduce image quality?', answer: 'We use smart compression that minimizes visible quality loss while maximizing size reduction.' }
    ]
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
    color: 'from-fuchsia-500 to-pink-500',
    seo: {
      title: 'Remove Background from Image Free - AI Powered | New Life',
      metaDescription: 'Remove image backgrounds instantly with AI. 100% free, no signup. Works offline - your photos never leave your device. PNG download.',
      h1: 'Remove Image Background - Free AI Tool',
      keywords: ['remove background', 'background remover', 'transparent background', 'remove bg free']
    },
    faq: [
      { question: 'How does AI background removal work?', answer: 'AI automatically detects the subject and removes the background, creating a transparent PNG.' },
      { question: 'Is my photo uploaded to a server?', answer: 'No, all AI processing happens locally in your browser. Your photos stay private.' },
      { question: 'What image formats are supported?', answer: 'PNG, JPEG, WebP input. Output is always PNG with transparency.' }
    ]
  },
  {
    id: 'video-to-mp3',
    name: 'Video to MP3',
    description: 'Extract audio from any video file. Convert MP4, WebM, MOV to high-quality MP3. No upload needed.',
    icon: '🎵',
    thumbnail: '/thumbnails/video-to-mp3.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/video-to-mp3',
    color: 'from-purple-500 to-indigo-500',
    tags: ['video', 'audio', 'mp3', 'convert', 'extract'],
    seo: {
      title: 'Extract Audio from Video Free - Video to MP3 | New Life',
      metaDescription: 'Convert video to MP3 audio instantly. Extract audio from MP4, WebM, MOV files. 100% free, no upload needed, works offline.',
      h1: 'Extract Audio from Video - Free MP3 Converter',
      keywords: ['video to mp3', 'extract audio from video', 'convert video to audio', 'mp4 to mp3']
    },
    faq: [
      { question: 'What video formats can I convert?', answer: 'MP4, WebM, MOV, AVI, and most common video formats.' },
      { question: 'What audio quality is the output?', answer: 'High-quality MP3 at 192kbps by default. Original audio quality preserved.' },
      { question: 'Is there a file size limit?', answer: 'No hard limit, but large files (500MB+) may be slower to process in-browser.' }
    ]
  },
  {
    id: 'video-compressor',
    name: 'Video Compressor',
    description: 'Compress video files up to 90% smaller. Perfect for sharing. H.264 encoding in your browser.',
    icon: '📹',
    thumbnail: '/thumbnails/video-compressor.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/video-compressor',
    color: 'from-green-500 to-teal-500',
    tags: ['video', 'compress', 'reduce', 'size', 'h264'],
    seo: {
      title: 'Compress Video Online Free - Reduce Size 90% | New Life',
      metaDescription: 'Compress video files up to 90% smaller for Discord, email, WhatsApp. H.264 encoding in browser. No upload, no watermark.',
      h1: 'Compress Video Online - Free & Fast',
      keywords: ['compress video', 'reduce video size', 'video compressor online', 'compress video for discord']
    },
    faq: [
      { question: 'How much smaller will my video be?', answer: 'Typically 50-90% smaller depending on compression settings and original quality.' },
      { question: 'Will compression reduce video quality?', answer: 'Some quality loss is normal. Choose "High Quality" setting to minimize it.' },
      { question: 'Can I compress for Discord/WhatsApp?', answer: 'Yes, perfect for sharing on platforms with file size limits.' }
    ]
  },
  {
    id: 'video-trimmer',
    name: 'Video Trimmer',
    description: 'Cut and trim video clips instantly. Set start/end times, preview, and download. No quality loss.',
    icon: '✂️',
    thumbnail: '/thumbnails/video-trimmer.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/video-trimmer',
    color: 'from-orange-500 to-red-500',
    tags: ['video', 'trim', 'cut', 'clip', 'edit'],
    seo: {
      title: 'Trim Video Online Free - Cut & Clip Videos | New Life',
      metaDescription: 'Cut and trim video clips instantly. Set precise start/end times, preview before saving. No quality loss, no watermark, 100% free.',
      h1: 'Trim & Cut Videos Online - Free Tool',
      keywords: ['trim video', 'cut video online', 'video trimmer', 'clip video free']
    },
    faq: [
      { question: 'Will trimming reduce video quality?', answer: 'No, we use lossless cutting that preserves original quality.' },
      { question: 'Can I preview before downloading?', answer: 'Yes, preview your trim points before saving the final video.' },
      { question: 'Is there a video length limit?', answer: 'No limit, but very long videos may take more time to process.' }
    ]
  },
  {
    id: 'remove-vocals',
    name: 'Vocal Remover',
    description: 'Remove vocals from songs to create instrumentals. Uses audio phase cancellation. Works offline.',
    icon: '🎤',
    thumbnail: '/thumbnails/remove-vocals.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/remove-vocals',
    color: 'from-pink-500 to-rose-500',
    tags: ['audio', 'vocals', 'karaoke', 'instrumental', 'music'],
    seo: {
      title: 'Remove Vocals from Song Free - Karaoke Maker | New Life',
      metaDescription: 'Remove vocals from any song to create instrumentals or karaoke tracks. Free, works offline, no upload required. Phase cancellation technology.',
      h1: 'Remove Vocals from Songs - Free Instrumental Maker',
      keywords: ['remove vocals', 'vocal remover', 'karaoke maker', 'instrumental creator', 'remove singing from song']
    },
    faq: [
      { question: 'How does vocal removal work?', answer: 'Uses phase cancellation to remove center-panned vocals while preserving instrumentals.' },
      { question: 'Does it work on all songs?', answer: 'Works best on professionally mixed stereo tracks. Mono audio not supported.' },
      { question: 'Can I use this for karaoke?', answer: 'Yes, perfect for creating karaoke backing tracks from any song.' }
    ]
  },
  {
    id: 'audio-transcription',
    name: 'Audio Transcription',
    description: 'Transcribe speech to text with Whisper AI. Supports 10+ languages. Runs 100% in your browser.',
    icon: '🎙️',
    thumbnail: '/thumbnails/audio-transcription.svg',
    category: 'ai',
    tier: 'free',
    href: '/tools/audio-transcription',
    color: 'from-blue-500 to-cyan-500',
    tags: ['audio', 'transcription', 'speech', 'text', 'whisper', 'ai'],
    popular: true,
    seo: {
      title: 'Transcribe Audio to Text Free - AI Speech Recognition | New Life',
      metaDescription: 'Convert speech to text with Whisper AI. Transcribe audio files in 10+ languages. 100% free, runs locally, no upload required.',
      h1: 'Transcribe Audio to Text - Free AI Tool',
      keywords: ['transcribe audio', 'speech to text', 'audio transcription free', 'whisper ai transcription']
    },
    faq: [
      { question: 'What languages are supported?', answer: 'English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, and more.' },
      { question: 'Is my audio sent to a server?', answer: 'No, Whisper AI runs entirely in your browser. Your audio stays private.' },
      { question: 'How accurate is the transcription?', answer: 'Very accurate for clear speech. Background noise may reduce accuracy.' }
    ]
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
    releaseDate: '2024-12-15',
    seo: {
      title: 'Free QR Code Generator Online - Custom Colors | New Life',
      metaDescription: 'Generate QR codes for URLs, text, WiFi, contact info. Customize colors and size. Download as PNG. 100% free, no signup required.',
      h1: 'Generate QR Codes Free - Custom & Downloadable',
      keywords: ['qr code generator', 'create qr code', 'free qr code', 'qr code maker']
    },
    faq: [
      { question: 'What can I create QR codes for?', answer: 'URLs, plain text, WiFi credentials, contact cards (vCard), email, phone numbers.' },
      { question: 'Can I customize QR code colors?', answer: 'Yes, choose custom foreground and background colors.' },
      { question: 'What format is the download?', answer: 'PNG image at high resolution, perfect for printing.' }
    ]
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
    color: 'from-slate-500 to-gray-500',
    seo: {
      title: 'Base64 Encode Decode Online Free | New Life',
      metaDescription: 'Encode or decode Base64 data instantly. Convert text, images, files to/from Base64. Free developer tool, no signup.',
      h1: 'Base64 Encoder & Decoder Online',
      keywords: ['base64 encode', 'base64 decode', 'base64 converter', 'text to base64']
    },
    faq: [
      { question: 'What is Base64 encoding?', answer: 'Base64 converts binary data to ASCII text, commonly used for embedding data in HTML/CSS/JSON.' },
      { question: 'Can I encode files?', answer: 'Yes, upload any file to convert it to Base64 string.' }
    ]
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
    color: 'from-amber-500 to-yellow-500',
    seo: {
      title: 'JSON Formatter & Validator Online Free | New Life',
      metaDescription: 'Format, beautify, and validate JSON data online. Minify or prettify with syntax highlighting. Free developer tool.',
      h1: 'JSON Formatter & Validator - Free Online Tool',
      keywords: ['json formatter', 'json validator', 'beautify json', 'json prettify', 'minify json']
    },
    faq: [
      { question: 'Does it validate JSON syntax?', answer: 'Yes, invalid JSON is highlighted with error location.' },
      { question: 'Can I minify JSON?', answer: 'Yes, switch between prettified and minified output.' }
    ]
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
    color: 'from-teal-500 to-cyan-500',
    seo: {
      title: 'Text Case Converter Online - UPPER lower Title | New Life',
      metaDescription: 'Convert text to UPPERCASE, lowercase, Title Case, camelCase, snake_case, kebab-case. Free instant text transformation.',
      h1: 'Convert Text Case Online - Free Tool',
      keywords: ['text case converter', 'uppercase converter', 'lowercase converter', 'title case', 'camelcase converter']
    },
    faq: [
      { question: 'What case formats are supported?', answer: 'UPPERCASE, lowercase, Title Case, Sentence case, camelCase, PascalCase, snake_case, kebab-case.' },
      { question: 'Is there a character limit?', answer: 'No practical limit for browser-based processing.' }
    ]
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
    color: 'from-blue-500 to-indigo-500',
    seo: {
      title: 'Word Counter Online Free - Characters & Reading Time | New Life',
      metaDescription: 'Count words, characters, sentences, paragraphs instantly. See reading time and keyword density. Free tool for writers.',
      h1: 'Word & Character Counter - Free Online Tool',
      keywords: ['word counter', 'character counter', 'word count online', 'reading time calculator']
    },
    faq: [
      { question: 'What does it count?', answer: 'Words, characters (with/without spaces), sentences, paragraphs, and estimated reading time.' },
      { question: 'Does it show keyword density?', answer: 'Yes, see most frequent words and their percentage of total text.' }
    ]
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
    color: 'from-violet-500 to-purple-500',
    seo: {
      title: 'Lorem Ipsum Generator Free - Placeholder Text | New Life',
      metaDescription: 'Generate Lorem Ipsum placeholder text for designs. Create paragraphs, sentences, or words. Copy with one click. Free.',
      h1: 'Lorem Ipsum Generator - Free Placeholder Text',
      keywords: ['lorem ipsum generator', 'placeholder text', 'dummy text generator', 'lipsum']
    },
    faq: [
      { question: 'What is Lorem Ipsum?', answer: 'Placeholder text used in design and typesetting to demonstrate layout without meaningful content.' },
      { question: 'Can I specify the amount?', answer: 'Yes, generate specific number of paragraphs, sentences, or words.' }
    ]
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
    color: 'from-rose-500 to-red-500',
    seo: {
      title: 'Hash Generator Online - MD5 SHA256 SHA512 Free | New Life',
      metaDescription: 'Generate MD5, SHA-1, SHA-256, SHA-512 hashes from text or files. Secure Web Crypto API. Free developer tool.',
      h1: 'Generate Hash Online - MD5, SHA-256, SHA-512',
      keywords: ['hash generator', 'md5 generator', 'sha256 hash', 'sha512 online', 'checksum generator']
    },
    faq: [
      { question: 'What hash algorithms are supported?', answer: 'MD5, SHA-1, SHA-256, SHA-384, and SHA-512.' },
      { question: 'Can I hash files?', answer: 'Yes, upload files to generate checksums for verification.' },
      { question: 'Is this secure?', answer: 'Uses browser Web Crypto API. Data never leaves your device.' }
    ]
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
    color: 'from-pink-500 to-rose-500',
    seo: {
      title: 'Color Converter - HEX RGB HSL Free Online | New Life',
      metaDescription: 'Convert colors between HEX, RGB, HSL formats instantly. Live preview, CSS output, color picker. Free tool for designers.',
      h1: 'Color Converter - HEX, RGB, HSL Online',
      keywords: ['color converter', 'hex to rgb', 'rgb to hex', 'hsl converter', 'color picker']
    },
    faq: [
      { question: 'What color formats are supported?', answer: 'HEX, RGB, RGBA, HSL, HSLA with instant conversion between all formats.' },
      { question: 'Can I pick colors visually?', answer: 'Yes, use the color picker or enter values manually.' }
    ]
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
