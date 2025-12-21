export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'document' | 'media' | 'ai' | 'utility';
  tier: 'free' | 'pro' | 'coming';
  href: string;
  color: string;
}

export const tools: Tool[] = [
  {
    id: 'pdf-merge',
    name: 'PDF Merge',
    description: 'Combine multiple PDFs into a single document. Fast, secure, and completely free.',
    icon: '📄',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-merge',
    color: 'from-red-500 to-orange-500'
  },
  {
    id: 'pdf-split',
    name: 'PDF Split',
    description: 'Split PDFs into individual pages or extract specific page ranges. Download as ZIP.',
    icon: '✂️',
    category: 'document',
    tier: 'free',
    href: '/tools/pdf-split',
    color: 'from-orange-500 to-yellow-500'
  },
  {
    id: 'image-compress',
    name: 'Image Compress',
    description: 'Compress images up to 90% smaller. Supports PNG, JPEG, WebP. Batch processing with ZIP download.',
    icon: '🖼️',
    category: 'media',
    tier: 'free',
    href: '/tools/image-compress',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'translator',
    name: 'AI Translator',
    description: 'Translate text between 100+ languages with AI-powered accuracy.',
    icon: '🌍',
    category: 'ai',
    tier: 'pro',
    href: '/tools/translator',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'video-avatar',
    name: 'Video Avatar',
    description: 'Create AI-powered video avatars for presentations and content.',
    icon: '🎬',
    category: 'ai',
    tier: 'pro',
    href: '/tools/video-avatar',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'qr-generator',
    name: 'QR Generator',
    description: 'Generate customizable QR codes for links, text, and contact info.',
    icon: '📱',
    category: 'utility',
    tier: 'free',
    href: '/tools/qr-generator',
    color: 'from-indigo-500 to-violet-500'
  }
];

export const getToolsByCategory = (category: Tool['category']) =>
  tools.filter(t => t.category === category);

export const getToolsByTier = (tier: Tool['tier']) =>
  tools.filter(t => t.tier === tier);

export const getToolById = (id: string) =>
  tools.find(t => t.id === id);
