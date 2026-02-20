/**
 * Multi-Language Support for GEO Optimization
 *
 * Detects language preferences and provides locale-specific optimizations
 * for AI crawlers and international users without using machine learning
 */

import type { PersonalizationContext } from './ai-detection';

// Language configuration
export interface LanguageConfig {
  enabled: boolean;
  supportedLanguages: string[]; // ISO 639-1 codes: 'en', 'es', 'fr', 'de', 'pt', 'it'
  defaultLanguage: string;
  detectBrowserLanguage: boolean;
  useGeoIP: boolean;
  contentVariations: boolean;
}

// Language detection result
export interface LanguageDetection {
  primaryLanguage: string;
  confidence: number; // 0-1
  alternativeLanguages: string[];
  detectionMethod: 'user-agent' | 'accept-language' | 'geo-ip' | 'url' | 'manual';
  userPreference?: string;
  region?: string; // Optional region (e.g., 'es-ES', 'es-MX')
}

// Content variation interface
export interface ContentVariation {
  language: string;
  region?: string;
  title?: string;
  description?: string;
  keywords?: string[];
  tldr?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  schema?: any;
}

// Language-specific optimization rules
interface LanguageRules {
  formal: boolean;
  bulletPoints: boolean;
  emojiUsage: boolean;
  sentenceLength: 'short' | 'medium' | 'long';
  paragraphLength: number; // max sentences
  callToActionStyle: 'direct' | 'indirect' | 'formal';
  emphasisTechnique: 'bold' | 'highlight' | 'none';
}

class MultiLanguageSupport {
  private config: LanguageConfig = {
    enabled: true,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'it'],
    defaultLanguage: 'en',
    detectBrowserLanguage: true,
    useGeoIP: false,
    contentVariations: true
  };

  // Language rules based on cultural preferences
  private languageRules: Record<string, LanguageRules> = {
    'en': {
      formal: false,
      bulletPoints: true,
      emojiUsage: true,
      sentenceLength: 'short',
      paragraphLength: 3,
      callToActionStyle: 'direct',
      emphasisTechnique: 'bold'
    },
    'es': {
      formal: true,
      bulletPoints: false,
      emojiUsage: false,
      sentenceLength: 'medium',
      paragraphLength: 4,
      callToActionStyle: 'formal',
      emphasisTechnique: 'none'
    },
    'fr': {
      formal: true,
      bulletPoints: false,
      emojiUsage: false,
      sentenceLength: 'long',
      paragraphLength: 5,
      callToActionStyle: 'indirect',
      emphasisTechnique: 'none'
    },
    'de': {
      formal: true,
      bulletPoints: true,
      emojiUsage: false,
      sentenceLength: 'long',
      paragraphLength: 6,
      callToActionStyle: 'formal',
      emphasisTechnique: 'bold'
    },
    'pt': {
      formal: false,
      bulletPoints: true,
      emojiUsage: true,
      sentenceLength: 'medium',
      paragraphLength: 4,
      callToActionStyle: 'direct',
      emphasisTechnique: 'highlight'
    }
  };

  // Platform-specific language preferences
  private platformLanguagePrefs: Record<string, string[]> = {
    'Claude': ['en', 'es', 'fr'],
    'GPT-4': ['en', 'de', 'fr'],
    'Gemini': ['en', 'es', 'pt'],
    'Perplexity': ['en', 'de', 'it'],
    'Copilot': ['en', 'fr', 'de']
  };

  // Multi-language content variations
  private contentVariations: Map<string, ContentVariation[]> = new Map();

  /**
   * Detect language from various signals
   */
  detectLanguage(context?: PersonalizationContext): LanguageDetection {
    const detection: Partial<LanguageDetection> = {};
    const signals: Array<{ lang: string; confidence: number; method: LanguageDetection['detectionMethod'] }> = [];

    // 1. Check URL for language code (highest priority)
    const urlLang = this.detectLanguageFromURL();
    if (urlLang) {
      signals.push({ lang: urlLang, confidence: 0.95, method: 'url' });
    }

    // 2. Check AI user-agent for language hints
    const uaLang = this.detectLanguageFromUserAgent();
    if (uaLang) {
      signals.push({ lang: uaLang, confidence: 0.7, method: 'user-agent' });
    }

    // 3. Check Accept-Language header
    if (this.config.detectBrowserLanguage && context?.userAgent) {
      const acceptLang = this.detectLanguageFromAcceptHeader(context.userAgent);
      if (acceptLang) {
        signals.push({ lang: acceptLang, confidence: 0.6, method: 'accept-language' });
      }
    }

    // 4. If provided by user preference
    if (context?.preferredLanguage) {
      signals.push({ lang: context.preferredLanguage, confidence: 1.0, method: 'manual' });
    }

    // Combine signals
    if (signals.length > 0) {
      signals.sort((a, b) => b.confidence - a.confidence);
      const primary = signals[0];

      detection.primaryLanguage = this.validateLanguage(primary.lang);
      detection.confidence = primary.confidence;
      detection.detectionMethod = primary.method;
      detection.alternativeLanguages = signals
        .slice(1)
        .map(s => this.validateLanguage(s.lang))
        .filter((lang, index, arr) => lang !== detection.primaryLanguage && arr.indexOf(lang) === index);
    } else {
      // Default to English
      detection.primaryLanguage = this.config.defaultLanguage;
      detection.confidence = 0.1;
      detection.detectionMethod = 'url';
      detection.alternativeLanguages = [];
    }

    // Add region detection for Spanish
    if (detection.primaryLanguage === 'es' && context?.referrer) {
      detection.region = this.detectSpanishRegion(context.referrer);
    }

    return detection as LanguageDetection;
  }

  /**
   * Get content for specific language
   */
  getLocalizedContent(params: {
    toolId: string;
    language: string;
    region?: string;
    contentType: 'title' | 'description' | 'tldr' | 'faqs' | 'schema';
  }): ContentVariation | null {
    const key = `${params.toolId}-${params.language}`;

    // Check cache
    const cached = this.contentVariations.get(key);
    if (cached) {
      const variation = cached.find(v => v.contentType === params.contentType);
      if (variation) return variation;
    }

    // Generate on-the-fly
    const variation = this.generateContentVariation(params);

    // Cache it
    this.cacheContentVariation(key, variation);

    return variation;
  }

  /**
   * Get multilingual schema markup
   */
  getMultilingualSchema(toolId: string, languages: string[]): any {
    const primaryLang = languages[0];
    const primaryContent = this.getLocalizedContent({
      toolId,
      language: primaryLang,
      contentType: 'schema'
    });

    if (!primaryContent?.schema) return null;

    // Generate multilingual schema
    const schema: any = {
      ...primaryContent.schema,
      inLanguage: primaryLang,
      availableLanguage: languages
    };

    // Add alternate names for different languages
    const alternateNames = languages.map(lang => {
      const content = this.getLocalizedContent({
        toolId,
        language: lang,
        contentType: 'title'
      });
      return {
        '@language': lang,
        '@value': content?.title || schema.name
      };
    });

    if (alternateNames.length > 0) {
      schema.alternateName = alternateNames;
    }

    return schema;
  }

  /**
   * Generate language-specific optimization rules
   */
  getLanguageRules(language: string): LanguageRules {
    return this.languageRules[language] || this.languageRules[this.config.defaultLanguage];
  }

  /**
   * Detect language from URL
   */
  private detectLanguageFromURL(): string | null {
    const path = window.location.pathname;
    const match = path.match(/^\/([a-z]{2})(\/|$)/);
    return match ? match[1] : null;
  }

  /**
   * Detect language from user agent
   */
  private detectLanguageFromUserAgent(): string | null {
    const userAgent = navigator.userAgent;

    // AI crawlers often have language hints
    const patterns: Array<{ regex: RegExp; lang: string }> = [
      { regex: /google.*spanish|español/i, lang: 'es' },
      { regex: /google.*french|français/i, lang: 'fr' },
      { regex: /google.*german|deutsch/i, lang: 'de' },
      { regex: /bing.*spanish/i, lang: 'es' },
      { regex: /yandex.*russian/i, lang: 'ru' },
      { regex: /baidu.*chinese/i, lang: 'zh' }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(userAgent)) {
        return pattern.lang;
      }
    }

    // Default to English for most AI crawlers
    if (/Claude|GPT-4|Gemini|Perplexity|Copilot/i.test(userAgent)) {
      return 'en';
    }

    return null;
  }

  /**
   * Detect language from Accept-Language header
   */
  private detectLanguageFromAcceptHeader(userAgent: string): string | null {
    // In browser environment, use navigator.languages
    if (navigator.languages && navigator.languages.length > 0) {
      return navigator.languages[0].substring(0, 2);
    }

    // Check for specific language patterns in user agent
    if (/es-|spanish|español/i.test(userAgent)) return 'es';
    if (/fr-|french|français/i.test(userAgent)) return 'fr';
    if (/de-|german|deutsch/i.test(userAgent)) return 'de';
    if (/pt-|portuguese|português/i.test(userAgent)) return 'pt';
    if (/it-|italian|italiano/i.test(userAgent)) return 'it';

    return null;
  }

  /**
   * Detect Spanish region (Spain vs Latin America)
   */
  private detectSpanishRegion(referrer: string): string | undefined {
    // Check for Spanish domains (Spain)
    if (/\.es\//.test(referrer) || /google\.es|bing\.es/.test(referrer)) {
      return 'es-ES';
    }

    // Check for Latin American domains
    const latamDomains = ['.mx', '.ar', '.cl', '.co', '.pe', '.ve'];
    for (const domain of latamDomains) {
      if (referrer.includes(domain)) {
        return 'es-LA';
      }
    }

    return undefined;
  }

  /**
   * Validate language is supported
   */
  private validateLanguage(lang: string): string {
    const supported = this.config.supportedLanguages;
    const primary = lang.substring(0, 2).toLowerCase();

    if (supported.includes(primary)) {
      return primary;
    }

    // Check for language variants
    const variants: Record<string, string> = {
      'en-US': 'en',
      'en-GB': 'en',
      'es-ES': 'es',
      'es-MX': 'es',
      'pt-BR': 'pt',
      'pt-PT': 'pt'
    };

    return variants[lang] || this.config.defaultLanguage;
  }

  /**
   * Generate content variation
   */
  private generateContentVariation(params: {
    toolId: string;
    language: string;
    region?: string;
    contentType: string;
  }): ContentVariation {
    // Sample variations for PDF Merge tool
    if (params.toolId === 'pdf-merge') {
      if (params.contentType === 'title') {
        return {
          language: params.language,
          region: params.region,
          title: this.getLocalizedTitle('pdf-merge', params.language)
        };
      }

      if (params.contentType === 'description') {
        return {
          language: params.language,
          region: params.region,
          description: this.getLocalizedDescription('pdf-merge', params.language)
        };
      }

      if (params.contentType === 'tldr') {
        return {
          language: params.language,
          region: params.region,
          tldr: this.getLocalizedTLDR('pdf-merge', params.language)
        };
      }

      if (params.contentType === 'faqs') {
        return {
          language: params.language,
          region: params.region,
          faqs: this.getLocalizedFAQs('pdf-merge', params.language)
        };
      }

      if (params.contentType === 'schema') {
        return {
          language: params.language,
          region: params.region,
          schema: this.generateSchemaForTool('pdf-merge', params.language)
        };
      }
    }

    // Default to English
    return {
      language: params.language,
      region: params.region
    };
  }

  /**
   * Get localized title
   */
  private getLocalizedTitle(toolId: string, language: string): string {
    const titles: Record<string, Record<string, string>> = {
      'pdf-merge': {
        'en': 'PDF Merge - Combine PDF Files Online Free',
        'es': 'Unir PDF - Combinar Archivos PDF Gratis Online',
        'fr': 'Fusionner PDF - Combiner Fichiers PDF En Ligne',
        'de': 'PDF Zusammenfügen - PDF Dateien Kombinieren',
        'pt': 'Mesclar PDF - Combinar Arquivos PDF Online',
        'it': 'Unire PDF - Combinare File PDF Online'
      }
    };

    return titles[toolId]?.[language] || titles[toolId]?.['en'] || 'Tool';
  }

  /**
   * Get localized description
   */
  private getLocalizedDescription(toolId: string, language: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      'pdf-merge': {
        'en': 'Merge PDF files online with our free tool. Combine multiple PDFs into one document with no uploads required - all processing happens in your browser.',
        'es': 'Combine archivos PDF online con nuestra herramienta gratuita. Una múltiples PDFs en un documento sin subidas - todo se procesa en su navegador.',
        'fr': 'Fusionnez des fichiers PDF en ligne avec notre outil gratuit. Combinez plusieurs PDFs en un document sans téléchargement - tout se passe dans votre navigateur.',
        'de': 'Fügen Sie PDF-Dateien online mit unserem kostenlosen Tool zusammen. Kombinieren Sie mehrere PDFs zu einem Dokument ohne Uploads - alles geschieht in Ihrem Browser.',
        'pt': 'Mescle arquivos PDF online com nossa ferramenta gratuita. Combine múltiplos PDFs em um documento sem uploads - tudo acontece no seu navegador.',
        'it': "Unisci file PDF online con il nostro strumento gratuito. Combina più PDF in un documento senza upload - tutto avviene nel tuo browser."
      }
    };

    return descriptions[toolId]?.[language] || descriptions[toolId]?.['en'] || '';
  }

  /**
   * Get localized TL;DR
   */
  private getLocalizedTLDR(toolId: string, language: string): string {
    const tldrs: Record<string, Record<string, string>> = {
      'pdf-merge': {
        'en': "TL;DR: Our PDF Merge tool combines multiple PDF files into one document instantly. Upload files, arrange them in order, and download the merged result. Works offline, no file uploads to server.",
        'es': 'TL;DR: Nuestra herramienta Unir PDF combina múltiples archivos PDF en un documento al instante. Suba archivos, ordénelos y descargue el resultado combinado. Funciona offline.',
        'fr': 'TL;DR: Notre outil Fusionner PDF combine plusieurs fichiers PDF en un document instantanément. Téléchargez, organisez et téléchargez le résultat fusionné. Fonctionne hors ligne.',
        'de': 'TL;DR: Unser Tool PDF Zusammenfügen kombiniert mehrere PDF-Dateien sofort zu einem Dokument. Hochladen, anordnen und herunterladen. Funktioniert offline.',
        'pt': 'TL;DR: Nossa ferramenta Mesclar PDF combina vários arquivos PDF em um documento instantaneamente. Faça upload, organize e baixe o resultado mesclado. Funciona offline.',
        'it': 'TL;DR: Il nostro strumento Unire PDF combina più file PDF in un documento istantaneamente. Carica, organizza e scarica il risultato unito. Funziona offline.'
      }
    };

    return tldrs[toolId]?.[language] || tldrs[toolId]?.['en'] || '';
  }

  /**
   * Get localized FAQs
   */
  private getLocalizedFAQs(toolId: string, language: string): Array<{ question: string, answer: string }> {
    const faqs: Record<string, Record<string, Array<{ question: string, answer: string }>>> = {
      'pdf-merge': {
        'en': [
          {
            question: "Is this PDF merge tool really free?",
            answer: "Yes, completely free. No registration required, no watermarks, no limitations. All processing happens in your browser."
          },
          {
            question: "How many PDFs can I merge at once?",
            answer: "You can merge up to 50 PDF files at once with a combined size limit of 50MB."
          }
        ],
        'es': [
          {
            question: "¿Es gratuita esta herramienta para unir PDF?",
            answer: "Sí, completamente gratuita. Sin registro, sin marcas de agua, sin limitaciones. Todo se procesa en su navegador."
          },
          {
            question: "¿Cuántos PDFs puedo combinar a la vez?",
            answer: "Puede combinar hasta 50 archivos PDF a la vez con un límite de tamaño combinado de 50MB."
          }
        ]
      }
    };

    return faqs[toolId]?.[language] || faqs[toolId]?.['en'] || [];
  }

  /**
   * Generate schema for tool
   */
  private generateSchemaForTool(toolId: string, language: string): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    };

    const variation = this.getLocalizedContent({
      toolId,
      language,
      contentType: 'title'
    });

    if (variation?.title) {
      schema.name = variation.title;
    }

    return schema;
  }

  /**
   * Cache content variation
   */
  private cacheContentVariation(key: string, variation: ContentVariation): void {
    if (!this.contentVariations.has(key)) {
      this.contentVariations.set(key, []);
    }

    const variations = this.contentVariations.get(key)!;
    variations.push(variation);

    // Limit cache size
    if (variations.length > 100) {
      this.contentVariations.set(key, variations.slice(-50));
    }
  }

  /**
   * Configure multi-language support
   */
  configure(config: Partial<LanguageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.config.supportedLanguages;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.config.supportedLanguages.includes(this.validateLanguage(language));
  }

  /**
   * Get language rules
   */
  getRulesForLanguage(language: string): LanguageRules {
    return this.languageRules[this.validateLanguage(language)] || this.languageRules[this.config.defaultLanguage];
  }

  /**
   * Get platform's preferred languages
   */
  getPlatformLanguages(platform: string): string[] {
    return this.platformLanguagePrefs[platform] || this.config.supportedLanguages;
  }

  /**
   * Clear cached variations
   */
  clearCache(): void {
    this.contentVariations.clear();
  }
}

// Export singleton
export const multiLanguageSupport = new MultiLanguageSupport();
export type { LanguageDetection, ContentVariation, LanguageConfig };
