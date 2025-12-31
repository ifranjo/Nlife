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
  stats?: Array<{
    label: string;
    value: string;
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
      keywords: ['merge pdf', 'combine pdf', 'pdf merge online free', 'join pdf files', 'secure document compilation', 'confidential PDF merge']
    },
    faq: [
      { question: 'Is this PDF merger really free?', answer: 'Yes, 100% free with no hidden fees, watermarks, or signup required.' },
      { question: 'Are my PDF files secure?', answer: 'Absolutely. Your files are processed entirely in your browser and never uploaded to any server.' },
      { question: 'How many PDFs can I merge at once?', answer: 'You can merge unlimited PDFs. We recommend keeping total size under 100MB for best performance.' },
      { question: 'What happens to my files after merging?', answer: 'Nothing - your files stay on your device. We have no access to them.' }
    ],
    stats: [
      {
            label: 'Maximum file size',
            value: 'Up to 100MB total'
      },
      {
            label: 'Processing speed',
            value: '<2 seconds per 10MB'
      },
      {
            label: 'Privacy guarantee',
            value: '100% client-side - zero server uploads'
      }
]
  },
  {
    id: 'pdf-compress',
    name: 'PDF Compress',
    description: 'Compress PDF files up to 90% smaller. Remove metadata, flatten forms, batch processing with ZIP download.',
    icon: '📦',
    thumbnail: '/thumbnails/pdf-compress.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-compress',
    color: 'from-amber-500 to-orange-500',
    tags: ['pdf', 'compress', 'reduce', 'optimize', 'size'],
    popular: true,
    releaseDate: '2024-12-24',
    seo: {
      title: 'Compress PDF Online Free - Reduce Size 90% | New Life',
      metaDescription: 'Compress PDF files up to 90% smaller instantly. Remove metadata, flatten forms. 100% free, no upload to servers. Works offline.',
      h1: 'Compress PDF Files Online - Free & Private',
      keywords: ['compress pdf', 'reduce pdf size', 'pdf compressor online', 'shrink pdf free', 'remove PDF metadata', 'strip PDF properties', 'eDiscovery PDF preparation']
    },
    faq: [
      { question: 'How much can PDF files be compressed?', answer: 'Compression varies by content. Image-heavy PDFs see 50-90% reduction. Text-only PDFs see 10-30% reduction.' },
      { question: 'Will compression reduce PDF quality?', answer: 'We use lossless techniques. Text and vectors stay sharp. Choose "High Quality" preset for minimal impact.' },
      { question: 'What does removing metadata do?', answer: 'Strips author, creation date, and document properties. Reduces size and enhances privacy.' }
    ],
    stats: [
      {
            label: 'Compression rate',
            value: '50-90% size reduction'
      },
      {
            label: 'Maximum file size',
            value: 'Handles PDFs up to 100MB'
      },
      {
            label: 'Privacy mode',
            value: 'Zero server uploads - 100% local'
      }
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
    ],
    stats: [
      {
            label: 'Page support',
            value: 'Splits documents with 50+ pages'
      },
      {
            label: 'Extraction precision',
            value: 'Exact page ranges or all pages'
      },
      {
            label: 'Output format',
            value: 'Individual PDFs bundled as ZIP'
      }
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
      keywords: ['redact pdf', 'remove sensitive info pdf', 'pdf redaction tool', 'black out pdf text', 'HIPAA PDF redaction', 'remove PII from PDF', 'HR document redaction', 'legal document sanitization']
    },
    faq: [
      { question: 'Is PDF redaction permanent?', answer: 'Yes, redacted content is permanently removed and cannot be recovered.' },
      { question: 'What information can be auto-detected?', answer: 'SSN, email addresses, phone numbers, credit card numbers, and dates.' },
      { question: 'Is this GDPR compliant?', answer: 'Yes, files are processed locally in your browser and never uploaded to servers.' }
    ],
    stats: [
      {
            label: 'Auto-detection',
            value: '5+ PII pattern types (SSN, email, phone)'
      },
      {
            label: 'Redaction permanence',
            value: '100% irreversible removal'
      },
      {
            label: 'Compliance',
            value: 'GDPR/HIPAA-safe - zero server uploads'
      }
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
    ],
    stats: [
      {
            label: 'Form types',
            value: 'Fillable & non-fillable PDFs supported'
      },
      {
            label: 'Signature options',
            value: 'Draw, type, or upload signature image'
      },
      {
            label: 'HIPAA compliance',
            value: '100% client-side - zero uploads'
      }
]
  },
  {
    id: 'ocr',
    name: 'OCR Text Extractor',
    description: 'Extract text from images and PDFs using AI-powered OCR. 100% private, runs in your browser.',
    icon: '📝',
    thumbnail: '/thumbnails/ocr.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/ocr',
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
    ],
    stats: [
      {
            label: 'Language support',
            value: '100+ languages (Tesseract.js)'
      },
      {
            label: 'Accuracy',
            value: '90%+ on clear text, 75%+ on scans'
      },
      {
            label: 'Offline capability',
            value: 'Works without internet after first load'
      }
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
    ],
    stats: [
      {
            label: 'Edge detection',
            value: 'AI-powered auto-crop & perspective fix'
      },
      {
            label: 'Multi-page support',
            value: 'Scan unlimited pages to single PDF'
      },
      {
            label: 'No app install',
            value: 'Works in browser with device camera'
      }
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
    ],
    stats: [
      {
            label: 'Format compatibility',
            value: 'DOCX format (Word/Google Docs/LibreOffice)'
      },
      {
            label: 'Maximum file size',
            value: 'Processes PDFs up to 50MB'
      },
      {
            label: 'Privacy',
            value: '100% client-side - zero server uploads'
      }
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
    ],
    stats: [
      {
            label: 'Template count',
            value: 'Multiple ATS-optimized templates'
      },
      {
            label: 'Export format',
            value: 'Professional PDF download'
      },
      {
            label: 'Data storage',
            value: '100% local - never saved to servers'
      }
]
  },
  {
    id: 'pdf-organize',
    name: 'PDF Organize',
    description: 'Reorder, delete, and rearrange PDF pages with drag and drop. Visual page thumbnails for easy organization.',
    icon: '📑',
    thumbnail: '/thumbnails/pdf-organize.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-organize',
    color: 'from-purple-500 to-indigo-500',
    tags: ['pdf', 'organize', 'reorder', 'pages', 'arrange'],
    popular: false,
    releaseDate: '2024-12-31',
    seo: {
      title: 'Organize PDF Pages Free Online - Reorder & Delete | New Life',
      metaDescription: 'Reorder, delete, and rearrange PDF pages with drag and drop. Visual thumbnails for easy organization. 100% free, no upload to servers.',
      h1: 'Organize PDF Pages - Reorder & Delete Free',
      keywords: ['organize pdf', 'reorder pdf pages', 'rearrange pdf', 'delete pdf pages', 'pdf page organizer']
    },
    faq: [
      { question: 'How do I reorder PDF pages?', answer: 'Simply drag and drop page thumbnails to rearrange them in any order you want.' },
      { question: 'Can I delete pages from my PDF?', answer: 'Yes, click the trash icon on any page to remove it. You can delete multiple pages before saving.' },
      { question: 'Are my files uploaded to a server?', answer: 'No, all processing happens in your browser. Your PDFs never leave your device.' }
    ],
    stats: [
      { label: 'Reordering', value: 'Drag & drop page thumbnails' },
      { label: 'Page deletion', value: 'Remove unwanted pages instantly' },
      { label: 'Privacy', value: '100% client-side processing' }
    ]
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert images to PDF. Supports JPG, PNG, WebP. Customize page size, orientation, and margins.',
    icon: '🖼️',
    thumbnail: '/thumbnails/jpg-to-pdf.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/jpg-to-pdf',
    color: 'from-green-500 to-teal-500',
    tags: ['image', 'pdf', 'convert', 'jpg', 'png', 'photo'],
    popular: true,
    releaseDate: '2024-12-31',
    seo: {
      title: 'JPG to PDF Converter Free Online - Image to PDF | New Life',
      metaDescription: 'Convert JPG, PNG, WebP images to PDF instantly. Multiple images, custom page sizes. 100% free, no upload required.',
      h1: 'Convert Images to PDF - Free Online Tool',
      keywords: ['jpg to pdf', 'image to pdf', 'png to pdf', 'photo to pdf', 'convert image to pdf free']
    },
    faq: [
      { question: 'What image formats are supported?', answer: 'JPG, JPEG, PNG, WebP, and GIF images can be converted to PDF.' },
      { question: 'Can I convert multiple images to one PDF?', answer: 'Yes, upload multiple images and they will be combined into a single PDF document.' },
      { question: 'Can I customize the page size?', answer: 'Yes, choose from A4, Letter, Legal, or fit the page to the image dimensions.' }
    ],
    stats: [
      { label: 'Formats supported', value: 'JPG, PNG, WebP, GIF' },
      { label: 'Page sizes', value: 'A4, Letter, Legal, or fit to image' },
      { label: 'Multiple images', value: 'Combine into single PDF' }
    ]
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert PDF pages to high-quality images. Export as JPG or PNG. Select individual pages or convert all.',
    icon: '📄',
    thumbnail: '/thumbnails/pdf-to-jpg.svg',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-to-jpg',
    color: 'from-orange-500 to-red-500',
    tags: ['pdf', 'image', 'convert', 'jpg', 'png', 'export'],
    popular: true,
    releaseDate: '2024-12-31',
    seo: {
      title: 'PDF to JPG Converter Free Online - Export Pages as Images | New Life',
      metaDescription: 'Convert PDF pages to JPG or PNG images. Choose quality, select pages. 100% free, no upload to servers.',
      h1: 'Convert PDF to Images - Free Online Tool',
      keywords: ['pdf to jpg', 'pdf to image', 'pdf to png', 'convert pdf to image', 'export pdf pages']
    },
    faq: [
      { question: 'What image formats can I export to?', answer: 'Export as JPG (smaller file size) or PNG (lossless quality).' },
      { question: 'Can I select specific pages to convert?', answer: 'Yes, click on page thumbnails to select which pages to export as images.' },
      { question: 'What quality options are available?', answer: 'Choose from Low (72 DPI), Medium (108 DPI), High (144 DPI), or Maximum (216 DPI).' }
    ],
    stats: [
      { label: 'Output formats', value: 'JPG or PNG' },
      { label: 'Quality options', value: '72-216 DPI' },
      { label: 'Page selection', value: 'Choose specific pages or all' }
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
      keywords: ['compress image', 'reduce image size', 'image compressor online', 'optimize images for web', 'batch product photo optimization', 'marketplace image compression']
    },
    faq: [
      { question: 'How much can images be compressed?', answer: 'Typically 60-90% size reduction while maintaining visual quality.' },
      { question: 'Can I compress multiple images at once?', answer: 'Yes, batch upload supported. Download all as ZIP.' },
      { question: 'Does compression reduce image quality?', answer: 'We use smart compression that minimizes visible quality loss while maximizing size reduction.' }
    ],
    stats: [
      {
            label: 'Compression rate',
            value: '60-90% size reduction'
      },
      {
            label: 'Batch processing',
            value: 'Process up to 20 images at once'
      },
      {
            label: 'Formats supported',
            value: 'PNG, JPEG, WebP with quality control'
      }
]
  },
  {
    id: 'file-converter',
    name: 'Image Converter',
    description: 'Convert HEIC to JPG, PNG to WebP, and more. Perfect for iPhone photos. Batch conversion with ZIP download.',
    icon: '🔄',
    thumbnail: '/thumbnails/file-converter.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/file-converter',
    color: 'from-cyan-500 to-blue-500',
    tags: ['heic', 'jpg', 'png', 'webp', 'convert', 'iphone', 'image'],
    popular: true,
    releaseDate: '2024-12-24',
    seo: {
      title: 'HEIC to JPG Converter Free Online - Convert iPhone Photos | New Life',
      metaDescription: 'Convert HEIC to JPG/PNG instantly. Free online image converter for iPhone photos. Also converts WebP, PNG, BMP to JPG/PNG/WebP. No upload, 100% private.',
      h1: 'Convert HEIC to JPG - Free Online Image Converter',
      keywords: ['heic to jpg', 'convert heic to jpg', 'heic converter', 'iphone photo converter', 'webp to jpg', 'png to jpg', 'product photo format conversion', 'WEBP to PNG ecommerce']
    },
    faq: [
      { question: 'How do I convert HEIC files from my iPhone?', answer: 'Drop or select your HEIC files, choose JPG/PNG/WebP output format, click Convert. Files are processed in your browser - never uploaded.' },
      { question: 'Why can\'t I open HEIC files on Windows?', answer: 'Windows doesn\'t natively support HEIC. Use this free converter to convert HEIC to JPG for universal compatibility.' },
      { question: 'Will converting HEIC to JPG reduce quality?', answer: 'With quality set to 90%+, the difference is imperceptible. For lossless conversion, choose PNG output.' },
      { question: 'Can I convert multiple files at once?', answer: 'Yes, batch convert up to 20 images. Download all as a single ZIP file.' },
      { question: 'Are my photos uploaded to a server?', answer: 'No. All conversion happens in your browser using Canvas API and heic2any. Your photos never leave your device.' }
    ],
    stats: [
      {
            label: 'Conversion speed',
            value: '<1 second per image'
      },
      {
            label: 'Batch support',
            value: 'Convert up to 20 files simultaneously'
      },
      {
            label: 'Formats',
            value: 'HEIC, PNG, JPG, WebP, BMP input/output'
      }
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
      keywords: ['remove background', 'background remover', 'transparent background', 'remove bg free', 'Amazon product photo background', 'Etsy listing photo', 'ecommerce product image', 'white background product photo']
    },
    faq: [
      { question: 'How does AI background removal work?', answer: 'AI automatically detects the subject and removes the background, creating a transparent PNG.' },
      { question: 'Is my photo uploaded to a server?', answer: 'No, all AI processing happens locally in your browser. Your photos stay private.' },
      { question: 'What image formats are supported?', answer: 'PNG, JPEG, WebP input. Output is always PNG with transparency.' }
    ],
    stats: [
      {
            label: 'AI model',
            value: 'State-of-the-art segmentation (180MB)'
      },
      {
            label: 'Processing time',
            value: '3-10 seconds depending on image size'
      },
      {
            label: 'Privacy',
            value: '100% local AI - zero cloud uploads'
      }
]
  },
  {
    id: 'exif-editor',
    name: 'EXIF Metadata Editor',
    description: 'View, edit, and strip photo metadata. Remove GPS location before sharing for privacy protection.',
    icon: '\u{1F4CD}',
    thumbnail: '/thumbnails/exif-editor.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/exif-editor',
    color: 'from-rose-500 to-red-500',
    tags: ['exif', 'metadata', 'gps', 'privacy', 'location', 'photo'],
    popular: true,
    releaseDate: '2024-12-24',
    seo: {
      title: 'Remove GPS from Photos Free - EXIF Metadata Editor | New Life',
      metaDescription: 'Strip GPS location and metadata from photos before sharing. View and edit EXIF data including camera info, dates, location. 100% private, browser-based.',
      h1: 'Remove GPS Location from Photos - Privacy Protection',
      keywords: ['remove gps from photo', 'exif editor', 'strip photo metadata', 'remove location from image', 'exif remover']
    },
    faq: [
      { question: 'Why should I remove GPS data from photos?', answer: 'Photos contain your exact GPS coordinates. Sharing them online can reveal your home, workplace, or daily routines. Strip GPS for privacy.' },
      { question: 'What EXIF data can I edit?', answer: 'View all metadata. Edit date, author, copyright, description. Strip GPS location or remove all metadata completely.' },
      { question: 'Is my photo uploaded anywhere?', answer: 'No, all processing happens in your browser. Your photos never leave your device.' },
      { question: 'Does this work on iPhone/Android photos?', answer: 'Yes, works with JPEG photos from any smartphone or camera that embeds EXIF data.' }
    ],
    stats: [
      {
            label: 'Metadata types',
            value: 'GPS, camera, date, copyright, description'
      },
      {
            label: 'Privacy protection',
            value: 'Strip all metadata with one click'
      },
      {
            label: 'Format support',
            value: 'JPEG photos from any camera/smartphone'
      }
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
    ],
    stats: [
      {
            label: 'Supported formats',
            value: 'MP4, WebM, MOV, AVI input'
      },
      {
            label: 'Audio quality',
            value: '192kbps MP3 - high quality output'
      },
      {
            label: 'Maximum file size',
            value: 'Handles videos up to 500MB'
      }
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
    ],
    stats: [
      {
            label: 'Compression rate',
            value: '50-90% size reduction'
      },
      {
            label: 'Codec',
            value: 'H.264 encoding via FFmpeg.wasm'
      },
      {
            label: 'Maximum file size',
            value: 'Processes videos up to 500MB'
      }
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
    ],
    stats: [
      {
            label: 'Precision',
            value: 'Frame-accurate trimming'
      },
      {
            label: 'Quality',
            value: 'Lossless cutting - no re-encoding'
      },
      {
            label: 'Supported formats',
            value: 'MP4, WebM, MOV, AVI'
      }
]
  },
  {
    id: 'gif-maker',
    name: 'GIF Maker',
    description: 'Convert video clips to high-quality GIFs. Set timing, frame rate, and size. Perfect for memes and reactions.',
    icon: 'GIF',
    thumbnail: '/thumbnails/gif-maker.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/gif-maker',
    color: 'from-purple-500 to-pink-500',
    tags: ['video', 'gif', 'convert', 'animation', 'meme'],
    seo: {
      title: 'Video to GIF Converter Free Online - No Upload | New Life',
      metaDescription: 'Convert video clips to high-quality GIFs in your browser. Set start/end times, frame rate, and width. 100% free, no upload required.',
      h1: 'Convert Video to GIF Online - Free Tool',
      keywords: ['video to gif', 'gif maker', 'convert video to gif', 'gif converter online free']
    },
    faq: [
      { question: 'How do I get a smaller GIF file size?', answer: 'Use shorter clips, lower frame rate (10-15 FPS), and smaller width (320-480px).' },
      { question: 'What video formats can I convert?', answer: 'MP4, WebM, MOV, AVI, and most common video formats work.' },
      { question: 'Can I use these GIFs on social media?', answer: 'Yes! Works on Twitter, Slack, Discord, Reddit, and most platforms.' }
    ],
    stats: [
      {
            label: 'Frame rate options',
            value: '5-30 FPS for size/quality balance'
      },
      {
            label: 'Width options',
            value: '320px-1280px for any platform'
      },
      {
            label: 'Processing',
            value: 'FFmpeg-powered high-quality encoding'
      }
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
    ],
    stats: [
      {
            label: 'Processing method',
            value: 'Phase cancellation technique'
      },
      {
            label: 'Audio requirements',
            value: 'Stereo tracks (mono not supported)'
      },
      {
            label: 'Use cases',
            value: 'Karaoke, instrumentals, remixing'
      }
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
      keywords: ['transcribe audio', 'speech to text', 'audio transcription free', 'whisper ai transcription', 'podcast transcription free', 'episode transcript generator', 'show notes from audio']
    },
    faq: [
      { question: 'What languages are supported?', answer: 'English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, and more.' },
      { question: 'Is my audio sent to a server?', answer: 'No, Whisper AI runs entirely in your browser. Your audio stays private.' },
      { question: 'How accurate is the transcription?', answer: 'Very accurate for clear speech. Background noise may reduce accuracy.' }
    ],
    stats: [
      {
            label: 'AI model',
            value: 'Whisper (OpenAI) - 95%+ accuracy'
      },
      {
            label: 'Language support',
            value: '10+ languages with auto-detection'
      },
      {
            label: 'Model size',
            value: '~50MB cached after first use'
      }
]
  },
  {
    id: 'subtitle-generator',
    name: 'Subtitle Generator',
    description: 'Generate subtitles from video or audio with Whisper AI. Export as SRT or VTT format. 100% browser-based.',
    icon: 'CC',
    thumbnail: '/thumbnails/subtitle-generator.svg',
    category: 'ai',
    tier: 'free',
    href: '/tools/subtitle-generator',
    color: 'from-indigo-500 to-purple-500',
    tags: ['subtitles', 'captions', 'srt', 'vtt', 'whisper', 'ai', 'video'],
    seo: {
      title: 'Generate Subtitles Free - AI SRT/VTT Export | New Life',
      metaDescription: 'Create subtitles from video or audio using Whisper AI. Export as SRT or VTT. 100% free, no upload, runs in browser.',
      h1: 'Generate Subtitles with AI - Free SRT & VTT Export',
      keywords: ['subtitle generator', 'generate subtitles', 'srt generator', 'vtt generator', 'auto subtitles free', 'YouTube subtitle generator', 'TikTok caption maker', 'course video subtitles', 'SRT file creator', 'accessibility captions']
    },
    faq: [
      { question: 'What subtitle formats are supported?', answer: 'Export as SRT (universal, works everywhere) or VTT (web standard for HTML5 video players).' },
      { question: 'Are my videos uploaded to a server?', answer: 'No, all AI processing happens locally in your browser. Your media files never leave your device.' },
      { question: 'Can I use these subtitles on YouTube?', answer: 'Yes, download the SRT file and upload it directly to YouTube Studio for your videos.' }
    ],
    stats: [
      {
            label: 'AI accuracy',
            value: 'Whisper model - 95%+ transcription rate'
      },
      {
            label: 'Export formats',
            value: 'SRT & VTT with timestamps'
      },
      {
            label: 'Platform support',
            value: 'YouTube, TikTok, HTML5 video compatible'
      }
]
  },
  {
    id: 'audio-editor',
    name: 'Audio Waveform Editor',
    description: 'Edit audio with visual waveform display. Trim, add fade effects, and export as MP3 or WAV. 100% browser-based.',
    icon: '🎚️',
    thumbnail: '/thumbnails/audio-editor.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/audio-editor',
    color: 'from-violet-500 to-fuchsia-500',
    tags: ['audio', 'waveform', 'trim', 'edit', 'fade', 'mp3', 'wav'],
    popular: false,
    releaseDate: '2024-12-24',
    seo: {
      title: 'Audio Editor Online Free - Trim & Edit with Waveform | New Life',
      metaDescription: 'Edit audio with visual waveform. Trim, add fade in/out, export as MP3 or WAV. 100% free, no upload to servers. Works offline.',
      h1: 'Audio Waveform Editor - Trim & Edit Audio Free',
      keywords: ['audio editor online', 'trim audio', 'audio waveform editor', 'cut audio free', 'audio trimmer']
    },
    faq: [
      { question: 'What audio formats are supported?', answer: 'Input: MP3, WAV, M4A, OGG, FLAC. Export as MP3 (compressed) or WAV (lossless).' },
      { question: 'How do I select a region to trim?', answer: 'Click and drag on the waveform to select. Drag the white handles to fine-tune the selection.' },
      { question: 'What do fade in and fade out do?', answer: 'Fade in gradually increases volume from silence at the start. Fade out decreases to silence at the end. Creates smooth transitions.' },
      { question: 'Is my audio uploaded anywhere?', answer: 'No, all processing happens locally in your browser using FFmpeg. Your files never leave your device.' }
    ],
    stats: [
      {
            label: 'Waveform display',
            value: 'Visual editing with zoom & selection'
      },
      {
            label: 'Effects',
            value: 'Fade in/out, trim, volume adjust'
      },
      {
            label: 'Export formats',
            value: 'MP3 (compressed) or WAV (lossless)'
      }
]
  },
  {
    id: 'screen-recorder',
    name: 'Screen Recorder',
    description: 'Record your screen, window, or browser tab. Select quality, include audio, preview and download as WebM. No install needed.',
    icon: '🔴',
    thumbnail: '/thumbnails/screen-recorder.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/screen-recorder',
    color: 'from-red-500 to-pink-500',
    tags: ['screen', 'record', 'capture', 'video', 'webm', 'tutorial'],
    popular: false,
    seo: {
      title: 'Screen Recorder Online Free - No Install | New Life',
      metaDescription: 'Record your screen directly in your browser. Capture screen, window, or tab with audio. No software install, no upload. Download as WebM.',
      h1: 'Record Screen Online - Free Browser Tool',
      keywords: ['screen recorder', 'record screen online', 'screen capture', 'screen recording free', 'browser screen recorder']
    },
    faq: [
      { question: 'Do I need to install software?', answer: 'No, it works directly in your browser using the native MediaRecorder API. No downloads or plugins required.' },
      { question: 'Can I record with audio?', answer: 'Yes, you can capture system audio when recording browser tabs in Chrome or Edge. Select "Share tab audio" when prompted.' },
      { question: 'What video format is the recording?', answer: 'Recordings are saved as WebM with VP9 or VP8 codec. This format plays in all modern browsers.' },
      { question: 'Is there a recording time limit?', answer: 'No time limit. Recording duration is only limited by your device memory.' }
    ],
    stats: [
      {
            label: 'Recording modes',
            value: 'Full screen, window, or browser tab'
      },
      {
            label: 'Audio capture',
            value: 'System audio on Chrome/Edge tabs'
      },
      {
            label: 'No time limit',
            value: 'Record as long as device memory allows'
      }
]
  },
  {
    id: 'audiogram-maker',
    name: 'Audiogram Maker',
    description: 'Create animated waveform videos from audio clips for social media promotion. Customize colors, styles, and aspect ratios.',
    icon: '🎵',
    thumbnail: '/thumbnails/audiogram-maker.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/audiogram-maker',
    color: 'from-purple-500 to-pink-500',
    tags: ['audio', 'video', 'waveform', 'audiogram', 'podcast', 'social media', 'instagram', 'tiktok'],
    popular: false,
    releaseDate: '2024-12-25',
    seo: {
      title: 'Free Audiogram Maker Online - Create Waveform Videos | New Life',
      metaDescription: 'Create animated waveform videos from audio clips for social media. Free audiogram maker with customizable colors, styles, and aspect ratios. Perfect for podcast promotion.',
      h1: 'Create Audiogram Videos - Free Online Tool',
      keywords: ['audiogram maker', 'podcast clip maker', 'waveform video generator', 'audio to video', 'social media audiogram']
    },
    faq: [
      { question: 'What is an audiogram?', answer: 'An audiogram is a video that visualizes audio waveforms, typically used to promote podcast episodes or audio content on social media platforms like Instagram, TikTok, and Twitter.' },
      { question: 'What aspect ratios are supported?', answer: '1:1 (square for Instagram feed), 9:16 (vertical for Stories/Reels/TikTok), and 16:9 (landscape for YouTube).' },
      { question: 'How long can my audiogram be?', answer: 'You can create audiograms from any length audio, but we recommend 30-60 seconds for optimal social media engagement. Keep under 120 seconds for faster rendering.' },
      { question: 'Can I add my podcast artwork?', answer: 'Yes, upload your podcast artwork or logo image and it will be displayed as a circular thumbnail in your audiogram video.' },
      { question: 'What waveform styles are available?', answer: 'Choose from bars (classic vertical bars), line (smooth waveform line), or circular (radial waveform pattern).' },
      { question: 'Are my files uploaded to a server?', answer: 'No, all processing happens locally in your browser using FFmpeg and Web Audio API. Your audio and images never leave your device.' },
      { question: 'Why is rendering slow?', answer: 'Video encoding is CPU-intensive. Rendering time depends on your device performance and video duration. A 60-second audiogram typically takes 2-5 minutes to render.' }
    ],
    stats: [
      {
            label: 'Aspect ratios',
            value: '1:1 (Instagram), 9:16 (Stories), 16:9 (YouTube)'
      },
      {
            label: 'Waveform styles',
            value: 'Bars, line, or circular patterns'
      },
      {
            label: 'Rendering',
            value: 'FFmpeg-powered video encoding'
      }
]
  },
  {
    id: 'subtitle-editor',
    name: 'Subtitle Editor',
    description: 'Edit SRT and VTT subtitle files. Adjust timing, edit text, add or remove captions. Convert between formats.',
    icon: '📝',
    thumbnail: '/thumbnails/subtitle-editor.svg',
    category: 'media',
    tier: 'free',
    href: '/tools/subtitle-editor',
    color: 'from-indigo-500 to-purple-500',
    tags: ['subtitle', 'srt', 'vtt', 'captions', 'video', 'edit', 'timing'],
    popular: true,
    releaseDate: '2024-12-25',
    seo: {
      title: 'SRT VTT Subtitle Editor Online Free - Edit Captions | New Life',
      metaDescription: 'Edit SRT and VTT subtitle files online. Fix timing, edit text, add or remove captions. Convert between SRT and VTT formats. 100% free, browser-based.',
      h1: 'Edit SRT & VTT Subtitles Online - Free Tool',
      keywords: ['srt editor', 'vtt editor', 'subtitle editor online', 'edit captions', 'fix subtitle timing', 'srt to vtt converter']
    },
    faq: [
      { question: 'What subtitle formats are supported?', answer: 'Both SRT (SubRip) and VTT (WebVTT) formats. Upload either format, edit, and download as SRT or VTT.' },
      { question: 'How do I fix out-of-sync subtitles?', answer: 'Edit the start and end times for each entry. Upload your video to preview and verify timing synchronization.' },
      { question: 'Can I edit YouTube auto-generated captions?', answer: 'Yes! Download captions from YouTube Studio as SRT, edit them here, then re-upload the fixed file.' },
      { question: 'Is my subtitle file uploaded to a server?', answer: 'No, all editing happens locally in your browser. Your files never leave your device.' },
      { question: 'Can I convert between SRT and VTT?', answer: 'Yes, upload either format and download as SRT or VTT. Conversion is instant and preserves all timing and text.' }
    ],
    stats: [
      {
            label: 'Format support',
            value: 'SRT & VTT read/write/convert'
      },
      {
            label: 'Editing features',
            value: 'Timing, text, add/remove captions'
      },
      {
            label: 'Video preview',
            value: 'Sync check with uploaded video'
      }
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
    ],
    stats: [
      {
            label: 'QR types',
            value: 'URL, text, WiFi, vCard, email, phone'
      },
      {
            label: 'Customization',
            value: 'Custom colors & size options'
      },
      {
            label: 'Output',
            value: 'High-res PNG for print/digital'
      }
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
    ],
    stats: [
      {
            label: 'Encoding/decoding',
            value: 'Bidirectional text & file conversion'
      },
      {
            label: 'File support',
            value: 'Any file type to Base64 string'
      },
      {
            label: 'Use cases',
            value: 'HTML/CSS/JSON data embedding'
      }
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
    ],
    stats: [
      {
            label: 'Validation',
            value: 'Real-time syntax error detection'
      },
      {
            label: 'Formatting',
            value: 'Prettify or minify with one click'
      },
      {
            label: 'Syntax highlighting',
            value: 'Color-coded JSON structure'
      }
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
    ],
    stats: [
      {
            label: 'Case types',
            value: 'UPPER, lower, Title, Sentence, camelCase, snake_case'
      },
      {
            label: 'Instant conversion',
            value: 'Real-time text transformation'
      },
      {
            label: 'No character limit',
            value: 'Process any text length'
      }
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
    ],
    stats: [
      {
            label: 'Metrics tracked',
            value: 'Words, characters, sentences, paragraphs'
      },
      {
            label: 'Reading time',
            value: 'Estimated minutes based on 200 WPM'
      },
      {
            label: 'Keyword density',
            value: 'Most frequent words & percentages'
      }
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
    ],
    stats: [
      {
            label: 'Generation modes',
            value: 'Paragraphs, sentences, or words'
      },
      {
            label: 'Customizable amount',
            value: 'Specify exact quantity needed'
      },
      {
            label: 'One-click copy',
            value: 'Instant clipboard copy button'
      }
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
    ],
    stats: [
      {
            label: 'Algorithms',
            value: 'MD5, SHA-1, SHA-256, SHA-384, SHA-512'
      },
      {
            label: 'Input types',
            value: 'Text strings or file upload'
      },
      {
            label: 'Security',
            value: 'Web Crypto API - never leaves device'
      }
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
    ],
    stats: [
      {
            label: 'Formats',
            value: 'HEX, RGB, RGBA, HSL, HSLA'
      },
      {
            label: 'Live preview',
            value: 'Visual color swatch with all formats'
      },
      {
            label: 'CSS output',
            value: 'Copy-ready CSS color values'
      }
]
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate strong, secure random passwords. Customize length, character types. Uses Web Crypto API.',
    icon: '🔑',
    thumbnail: '/thumbnails/password-generator.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/password-generator',
    color: 'from-emerald-500 to-cyan-500',
    tags: ['password', 'security', 'generator', 'random', 'crypto'],
    popular: true,
    seo: {
      title: 'Password Generator Free Online - Secure Random | New Life',
      metaDescription: 'Generate strong, secure random passwords instantly. Customize length (8-128), character types. Uses Web Crypto API. 100% private.',
      h1: 'Generate Secure Passwords - Free Online Tool',
      keywords: ['password generator', 'random password', 'secure password', 'strong password generator']
    },
    faq: [
      { question: 'How secure are the generated passwords?', answer: 'Extremely secure. We use Web Crypto API (crypto.getRandomValues) for cryptographically secure random generation.' },
      { question: 'Are my passwords saved anywhere?', answer: 'No. Passwords are generated entirely in your browser. We have no server, no database, and no way to see your passwords.' },
      { question: 'What makes a password strong?', answer: 'Length (16+ characters) and variety (uppercase, lowercase, numbers, symbols). Our strength indicator helps you create uncrackable passwords.' }
    ],
    stats: [
      {
            label: 'Password length',
            value: '8-128 characters customizable'
      },
      {
            label: 'Character types',
            value: 'Upper, lower, numbers, symbols'
      },
      {
            label: 'Security',
            value: 'Web Crypto API - cryptographically secure'
      }
]
  },

  // ═══════════════════════════════════════════════════════════════
  // AI TOOLS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'image-upscaler',
    name: 'AI Image Upscaler',
    description: 'Upscale images 2x or 4x with AI. ESRGAN neural network runs in your browser. No upload needed.',
    icon: 'AI',
    thumbnail: '/thumbnails/image-upscaler.svg',
    category: 'ai',
    tier: 'free',
    href: '/tools/image-upscaler',
    color: 'from-violet-500 to-purple-500',
    tags: ['ai', 'upscale', 'enlarge', 'enhance', 'resolution', 'esrgan'],
    popular: true,
    releaseDate: '2024-12-24',
    seo: {
      title: 'AI Image Upscaler Free Online - Enlarge 2x/4x | New Life',
      metaDescription: 'Upscale images 2x or 4x with AI. ESRGAN neural network runs in browser. No upload, no watermark. Free photo enhancement tool.',
      h1: 'AI Image Upscaler - Enlarge Photos 2x or 4x Free',
      keywords: ['ai image upscaler', 'upscale image', 'enlarge photo', 'esrgan online', 'image enhancer free']
    },
    faq: [
      { question: 'What is AI image upscaling?', answer: 'AI upscaling uses ESRGAN neural networks to intelligently add detail when enlarging images, producing sharper results than traditional resizing.' },
      { question: 'What is the difference between 2x and 4x?', answer: '2x doubles image dimensions (500px becomes 1000px). 4x quadruples them (500px becomes 2000px). Choose based on your target size needs.' },
      { question: 'Does it work on mobile?', answer: 'Yes, but slower due to limited GPU power. Use smaller images and Fast mode for best mobile experience.' },
      { question: 'Are my images uploaded?', answer: 'No. The AI model runs entirely in your browser. Your images never leave your device.' }
    ],
    stats: [
      {
            label: 'Upscale levels',
            value: '2x or 4x with AI enhancement'
      },
      {
            label: 'AI model',
            value: 'ESRGAN neural network (browser-based)'
      },
      {
            label: 'Processing time',
            value: '5-30 seconds depending on image size'
      }
]
  },
  {
    id: 'object-remover',
    name: 'AI Object Remover',
    description: 'Remove unwanted objects from photos with AI. Click to select, then erase. 100% private.',
    icon: '\u{1F3AF}',
    thumbnail: '/thumbnails/object-remover.svg',
    category: 'ai',
    tier: 'free',
    href: '/tools/object-remover',
    color: 'from-cyan-500 to-blue-500',
    tags: ['ai', 'object removal', 'photo edit', 'erase', 'remove'],
    popular: false,
    seo: {
      title: 'Remove Objects from Photos Free - AI Object Remover | New Life',
      metaDescription: 'Remove unwanted objects from photos using AI. Click on any object to erase it. 100% private, runs in browser. No signup, no watermarks.',
      h1: 'AI Object Remover - Erase Unwanted Objects from Photos',
      keywords: ['remove object from photo', 'erase object', 'object remover', 'ai photo editor', 'remove people from photo']
    },
    faq: [
      { question: 'How does AI object removal work?', answer: 'Click on any object and AI (Segment Anything Model) automatically selects it. Then content-aware fill seamlessly removes it.' },
      { question: 'Is my photo uploaded to a server?', answer: 'No, all AI processing happens locally in your browser. Your photos never leave your device.' },
      { question: 'What objects can I remove?', answer: 'People, animals, text, logos, background elements - any distinct object with clear boundaries.' }
    ],
    stats: [
      {
            label: 'AI model',
            value: 'Segment Anything Model (SAM)'
      },
      {
            label: 'Selection method',
            value: 'Click to auto-select objects'
      },
      {
            label: 'Removal technique',
            value: 'Content-aware fill algorithm'
      }
]
  },
  {
    id: 'diff-checker',
    name: 'Diff Checker',
    description: 'Compare two texts and highlight differences. Line-by-line or word-by-word diff mode with statistics.',
    icon: '🔍',
    thumbnail: '/thumbnails/diff-checker.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/diff-checker',
    color: 'from-cyan-500 to-teal-500',
    tags: ['diff', 'compare', 'text', 'code', 'difference'],
    seo: {
      title: 'Diff Checker Online Free - Compare Text | New Life',
      metaDescription: 'Compare two texts and find differences instantly. Line-by-line or word-by-word mode. Color-coded additions and deletions. Free, private, browser-based.',
      h1: 'Compare Text & Find Differences Online',
      keywords: ['diff checker', 'compare text', 'text diff', 'find differences', 'code compare']
    },
    faq: [
      { question: 'What is the difference between line and word mode?', answer: 'Line mode compares entire lines (best for code). Word mode highlights individual word changes (best for prose).' },
      { question: 'Can I compare code files?', answer: 'Yes, paste code in both panels. Line mode with line numbers works great for code review.' },
      { question: 'Is there a size limit?', answer: 'No hard limit. Processing happens in your browser, so large texts may be slower but will work.' }
    ],
    stats: [
      {
            label: 'Comparison modes',
            value: 'Line-by-line or word-by-word diff'
      },
      {
            label: 'Highlighting',
            value: 'Color-coded additions & deletions'
      },
      {
            label: 'Statistics',
            value: 'Added, removed, unchanged line counts'
      }
]
  },
  {
    id: 'code-beautifier',
    name: 'Code Beautifier',
    description: 'Format and beautify JavaScript, TypeScript, CSS, HTML, JSON, and SQL code. Minify option available.',
    icon: '</>',
    thumbnail: '/thumbnails/code-beautifier.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/code-beautifier',
    color: 'from-violet-500 to-indigo-500',
    tags: ['code', 'format', 'beautify', 'prettier', 'minify', 'javascript', 'css', 'html', 'sql'],
    popular: true,
    seo: {
      title: 'Code Beautifier & Formatter Online Free - JS CSS HTML SQL | New Life',
      metaDescription: 'Format and beautify JavaScript, TypeScript, CSS, HTML, JSON, SQL code online. Minify option, syntax validation. Uses Prettier. Free, no signup.',
      h1: 'Code Beautifier & Formatter - Free Online Tool',
      keywords: ['code beautifier', 'code formatter', 'prettier online', 'beautify javascript', 'format css', 'sql formatter']
    },
    faq: [
      { question: 'What languages are supported?', answer: 'JavaScript, TypeScript, CSS, HTML, JSON, and SQL. JSX and TSX are also supported.' },
      { question: 'Which formatter does this use?', answer: 'Prettier for JS/TS/CSS/HTML/JSON (same as VS Code) and sql-formatter for SQL queries.' },
      { question: 'Can I minify code?', answer: 'Yes, minify is available for JavaScript, CSS, and JSON to reduce file size for production.' },
      { question: 'Is my code uploaded to a server?', answer: 'No, all formatting happens in your browser. Your code never leaves your device.' }
    ],
    stats: [
      {
            label: 'Languages',
            value: 'JS, TS, CSS, HTML, JSON, SQL'
      },
      {
            label: 'Formatter',
            value: 'Prettier for web langs, sql-formatter for SQL'
      },
      {
            label: 'Minify option',
            value: 'JS, CSS, JSON production compression'
      }
]
  },
  {
    id: 'svg-editor',
    name: 'SVG Editor',
    description: 'Optimize and edit SVG files. Reduce file size, change colors, scale dimensions. 100% browser-based.',
    icon: '<svg>',
    thumbnail: '/thumbnails/svg-editor.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/svg-editor',
    color: 'from-orange-500 to-amber-500',
    tags: ['svg', 'optimize', 'compress', 'edit', 'vector', 'icon'],
    popular: false,
    seo: {
      title: 'SVG Editor & Optimizer Online Free - Compress, Edit Colors | New Life',
      metaDescription: 'Optimize and edit SVG files online. Reduce file size, change colors, scale dimensions. 100% free, browser-based, no upload required.',
      h1: 'SVG Editor & Optimizer - Free Online Tool',
      keywords: ['svg editor', 'svg optimizer', 'compress svg', 'optimize svg online', 'edit svg colors', 'svg compressor']
    },
    faq: [
      { question: 'How much can SVG files be optimized?', answer: 'SVGs from design tools often contain 30-50% unnecessary data. Simple icons may see 10-20% reduction.' },
      { question: 'Will optimization change how my SVG looks?', answer: 'No, optimization only removes invisible data like comments, metadata, and whitespace.' },
      { question: 'Can I edit SVG colors?', answer: 'Yes, replace all fill or stroke colors with a single click. Great for recoloring icons.' },
      { question: 'Can I scale SVG dimensions?', answer: 'Yes, scale from 10% to 500%. The SVG stays crisp at any size because it is vector-based.' }
    ],
    stats: [
      {
            label: 'Optimization',
            value: '10-50% file size reduction'
      },
      {
            label: 'Color editing',
            value: 'Replace fill/stroke colors globally'
      },
      {
            label: 'Scaling',
            value: '10%-500% with crisp vector quality'
      }
]
  },
  {
    id: 'markdown-editor',
    name: 'Markdown Editor',
    description: 'Write and preview markdown in real-time. Syntax highlighting for code blocks. Export to HTML or PDF.',
    icon: 'M',
    thumbnail: '/thumbnails/markdown-editor.svg',
    category: 'utility',
    tier: 'free',
    href: '/tools/markdown-editor',
    color: 'from-indigo-500 to-purple-500',
    tags: ['markdown', 'editor', 'preview', 'html', 'pdf', 'documentation'],
    popular: true,
    seo: {
      title: 'Markdown Editor with Live Preview Free Online | New Life',
      metaDescription: 'Write and preview markdown in real-time with syntax highlighting. Export to HTML or PDF. Free, browser-based, no signup required.',
      h1: 'Markdown Editor with Live Preview - Free Online Tool',
      keywords: ['markdown editor', 'markdown preview', 'markdown to html', 'markdown to pdf', 'online markdown editor']
    },
    faq: [
      { question: 'What markdown features are supported?', answer: 'Full GitHub Flavored Markdown: headings, bold, italic, links, images, code blocks, tables, blockquotes, lists, and more.' },
      { question: 'Can I use this for GitHub README files?', answer: 'Yes! The preview matches GitHub rendering. Write your README, preview it, then copy to your repository.' },
      { question: 'How does code syntax highlighting work?', answer: 'Code blocks are highlighted using highlight.js. Specify the language after opening backticks for optimal highlighting.' },
      { question: 'What is the difference between HTML and PDF export?', answer: 'HTML creates a standalone webpage with styling. PDF creates a printable document best for sharing as a fixed format.' }
    ],
    stats: [
      {
            label: 'Markdown flavor',
            value: 'GitHub Flavored Markdown (GFM)'
      },
      {
            label: 'Live preview',
            value: 'Real-time rendering as you type'
      },
      {
            label: 'Export options',
            value: 'HTML or PDF with syntax highlighting'
      }
]
  },
  {
    id: 'ai-summary',
    name: 'AI Summary',
    description: 'Summarize documents and text with AI. Supports PDF, TXT, DOCX, and URL input. Multiple summary formats and lengths.',
    icon: 'AI',
    thumbnail: '/thumbnails/ai-summary.svg',
    category: 'ai',
    tier: 'free',
    href: '/tools/ai-summary',
    color: 'from-emerald-500 to-teal-500',
    tags: ['ai', 'summary', 'summarize', 'pdf', 'text', 'document', 'tldr'],
    popular: true,
    releaseDate: '2024-12-27',
    seo: {
      title: 'AI Text Summarizer Free Online - Summarize Documents | New Life',
      metaDescription: 'Summarize documents, PDFs, and text with AI. Choose summary length and format. Privacy-first with local processing options. Free, no signup required.',
      h1: 'AI Text Summarizer - Summarize Documents Free',
      keywords: ['ai summarizer', 'text summarizer', 'summarize pdf', 'document summary', 'tldr generator', 'ai summary tool']
    },
    faq: [
      { question: 'What input formats are supported?', answer: 'Paste text directly, upload PDF/TXT/DOCX files, or enter a URL to fetch and summarize web content.' },
      { question: 'Is my data private?', answer: 'Yes. The extractive summarization mode works 100% locally. For AI summaries, you can use your own API key stored only in your browser.' },
      { question: 'What summary lengths are available?', answer: 'Brief (1-2 sentences), Standard (1 paragraph), and Detailed (multiple paragraphs) options.' },
      { question: 'Can I summarize without AI?', answer: 'Yes! The extractive mode uses TF-IDF algorithm locally to extract key sentences without any AI API.' }
    ],
    stats: [
      {
            label: 'Input formats',
            value: 'Text, PDF, TXT, DOCX, URL'
      },
      {
            label: 'Summary modes',
            value: 'AI-powered or extractive (local)'
      },
      {
            label: 'Privacy options',
            value: 'Local processing or bring-your-own API key'
      }
]
  },
];

export const getToolsByCategory = (category: Tool['category']) =>
  tools.filter(t => t.category === category);

export const getToolsByTier = (tier: Tool['tier']) =>
  tools.filter(t => t.tier === tier);

export const getToolById = (id: string) =>
  tools.find(t => t.id === id);

/**
 * Get related tools based on category, tags, and tier similarity.
 * Uses a weighted scoring system to find the most relevant tools.
 *
 * @param toolId - The current tool ID to find relations for
 * @param maxItems - Maximum number of related tools to return (default: 6)
 * @returns Array of related tools sorted by relevance score
 */
export const getRelatedTools = (toolId: string, maxItems = 6): Tool[] => {
  const currentTool = getToolById(toolId);
  if (!currentTool) return [];

  const scoredTools = tools
    .filter(t => t.id !== toolId && t.tier === 'free') // Exclude current tool and non-free tools
    .map(tool => {
      let score = 0;

      // Same category (weight: 3)
      if (tool.category === currentTool.category) {
        score += 3;
      }

      // Shared tags (weight: 2 per shared tag)
      if (currentTool.tags && tool.tags) {
        const sharedTags = currentTool.tags.filter(tag => tool.tags?.includes(tag));
        score += sharedTags.length * 2;
      }

      // Same tier (weight: 1)
      if (tool.tier === currentTool.tier) {
        score += 1;
      }

      // Boost popular tools slightly
      if (tool.popular) {
        score += 0.5;
      }

      return { tool, score };
    })
    .filter(({ score }) => score > 0) // Only include tools with some relation
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, maxItems)
    .map(({ tool }) => tool);

  return scoredTools;
};
