/**
 * AI Crawler Performance Optimizer
 *
 * Optimizes page performance and resource delivery specifically for AI crawlers
 * to improve indexation speed and extraction efficiency
 */

interface PerformanceMetrics {
  pageLoadTime: number;
  renderTime: number;
  resourceCount: number;
  totalTransferSize: number;
  aiSpecificMetrics: {
    schemaParseTime: number;
    contentExtractionTime: number;
    answerDetectionTime: number;
  };
}

interface OptimizationConfig {
  enableStreamlinedMode: boolean;
  removeNonEssentialElements: boolean;
  preloadCriticalContent: boolean;
  cacheAggressively: boolean;
  optimizeForExtraction: boolean;
}

class PerformanceOptimizer {
  private metrics: Partial<PerformanceMetrics> = {};
  private optimizationsApplied: string[] = [];
  private readonly AI_BOT_PRIORITIES = {
    'Claude': 1,
    'GPT-4': 2,
    'Gemini': 3,
    'Perplexity': 4,
    'Copilot': 5,
    'Bard': 6
  };

  /**
   * Initialize performance optimization for AI crawlers
   */
  initialize(): void {
    const startTime = performance.now();

    // Detect AI crawler and apply optimizations
    const aiPlatform = this.detectAICrawler();

    if (aiPlatform) {
      this.applyAIOptimizations(aiPlatform);
      this.setupAIMetricsCollection();
    }

    // Always optimize for extraction
    this.optimizeForContentExtraction();

    const initTime = performance.now() - startTime;
    console.log(`AI Performance Optimizer initialized in ${initTime.toFixed(2)}ms`);
  }

  /**
   * Detect AI crawler from various signals
   */
  private detectAICrawler(): string | null {
    const signals = [
      navigator.userAgent,
      document.referrer,
      (window as any).navigator?.userAgentData?.platform,
      new URLSearchParams(window.location.search).get('ai_crawler')
    ];

    const aiPatterns = {
      'Claude': /anthropic|claude/i,
      'GPT-4': /openai|gpt-4|chatgpt/i,
      'Gemini': /google.*ai|gemini/i,
      'Perplexity': /perplexity/i,
      'Copilot': /bingbot|microsoft.*bot/i
    };

    for (const signal of signals) {
      if (!signal) continue;

      for (const [platform, pattern] of Object.entries(aiPatterns)) {
        if (pattern.test(signal)) {
          document.documentElement.classList.add(`ai-crawler-${platform.toLowerCase()}`);
          return platform;
        }
      }
    }

    return null;
  }

  /**
   * Apply AI-specific optimizations based on detected platform
   */
  private applyAIOptimizations(platform: string): void {
    console.log(`Applying AI optimizations for ${platform}`);

    const optimizations: OptimizationConfig = {
      enableStreamlinedMode: true,
      removeNonEssentialElements: true,
      preloadCriticalContent: true,
      cacheAggressively: true,
      optimizeForExtraction: true
    };

    // Apply optimizations in priority order
    if (optimizations.enableStreamlinedMode) {
      this.enableStreamlinedMode();
    }

    if (optimizations.removeNonEssentialElements) {
      this.removeNonEssentialElements();
    }

    if (optimizations.preloadCriticalContent) {
      this.preloadCriticalContent();
    }

    if (optimizations.cacheAggressively) {
      this.enableAggressiveCaching();
    }

    // Mark optimizations as applied
    this.optimizationsApplied.push(...Object.keys(optimizations));

    console.log(`Applied ${this.optimizationsApplied.length} optimizations for ${platform}`);
  }

  /**
   * Enable streamlined mode - remove interactive elements, animations, etc.
   */
  private enableStreamlinedMode(): void {
    // Add streamlined class to body
    document.body.classList.add('ai-streamlined-mode');

    // Remove animation classes
    const animatedElements = document.querySelectorAll('*:not(script):not(style)');
    animatedElements.forEach(el => {
      if (el.className) {
        el.className = el.className
          .replace(/\banimated?\b/gi, '')
          .replace(/\btransition.*\b/gi, '')
          .replace(/\bfade.*\b/gi, '')
          .replace(/\bslide.*\b/gi, '')
          .replace(/\bbounce.*\b/gi, '');
      }
    });

    // Disable all animations via CSS
    const style = document.createElement('style');
    style.textContent = `
      .ai-streamlined-mode * {
        animation: none !important;
        transition: none !important;
        transform: none !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);

    this.optimizationsApplied.push('streamlined-mode');
  }

  /**
   * Remove non-essential elements for faster parsing
   */
  private removeNonEssentialElements(): void {
    const selectorsToRemove = [
      // UI elements not needed for content extraction
      '.ad-banner',
      '.newsletter-signup',
      '.social-share',
      '.promotional-content',
      '.overlay',
      '.modal',
      // Interactive elements
      '[data-interactive="true"]',
      '.interactive-demo',
      // Decorative elements
      '.decoration',
      '.ornament',
      // Comments and secondary content
      '.comments-section',
      '.related-posts-secondary'
    ];

    selectorsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.setAttribute('aria-hidden', 'true');
        (el as HTMLElement).style.display = 'none';
      });
    });

    this.optimizationsApplied.push('removed-non-essential');
  }

  /**
   * Preload critical content that AI crawlers need
   */
  private preloadCriticalContent(): void {
    // Preload main content
    const mainContent = document.querySelector('main, article, [role="main"]');
    if (mainContent) {
      mainContent.setAttribute('data-critical-content', 'true');
    }

    // Preload JSON-LD schema
    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
    schemaScripts.forEach(script => {
      script.setAttribute('data-priority-load', 'true');
    });

    // Preload tool metadata
    const toolCards = document.querySelectorAll('.tool-card, [data-tool]');
    toolCards.forEach(card => {
      card.setAttribute('data-preload', 'true');
    });

    this.optimizationsApplied.push('preloaded-critical');
  }

  /**
   * Enable aggressive caching for AI crawlers
   */
  private enableAggressiveCaching(): void {
    // Set long cache headers for static resources
    const resources = document.querySelectorAll('script[src], link[href]');

    resources.forEach(resource => {
      const url = resource.getAttribute('src') || resource.getAttribute('href');
      if (url && !url.startsWith('data:')) {
        // Add cache-busting parameter for fresh load
        const separator = url.includes('?') ? '&' : '?';
        const newUrl = `${url}${separator}ai-cache=${Date.now()}`;

        if (resource.tagName === 'SCRIPT') {
          resource.setAttribute('src', newUrl);
        } else {
          resource.setAttribute('href', newUrl);
        }
      }
    });

    this.optimizationsApplied.push('aggressive-caching');
  }

  /**
   * Optimize content structure for AI extraction
   */
  private optimizeForContentExtraction(): void {
    // Add extraction markers
    const answerSections = document.querySelectorAll(
      '[itemprop="acceptedAnswer"], [itemprop="text"], .voice-answer'
    );

    answerSections.forEach((section, index) => {
      section.setAttribute('data-ai-extract', `answer-${index}`);
      section.setAttribute('data-extraction-priority', String(index));
    });

    // Optimize FAQ sections
    const faqItems = document.querySelectorAll('[itemprop="mainEntity"]');
    faqItems.forEach((item, index) => {
      item.setAttribute('data-faq-item', String(index));
      item.setAttribute('data-extract-question', item.querySelector('[itemprop="name"]')?.textContent || '');
    });

    // Add content hierarchy markers
    const headings = document.querySelectorAll('h1, h2, h3, h4');
    headings.forEach(heading => {
      heading.setAttribute('data-content-level', heading.tagName.toLowerCase());
    });

    // Mark tool metadata for easy extraction
    const tools = document.querySelectorAll('[data-tool-id], .tool-card');
    tools.forEach(tool => {
      tool.setAttribute('data-tool-metadata', 'true');
    });

    this.optimizationsApplied.push('content-extraction');
  }

  /**
   * Setup metrics collection for AI crawler performance
   */
  private setupAIMetricsCollection(): void {
    // Performance observer for detailed metrics
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const key = `${entry.entryType}-${entry.name}` as keyof PerformanceMetrics;
          (this.metrics as any)[key] = entry.duration;
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'measure'] });
    }

    // Custom metrics for AI-specific tracking
    performance.mark('ai-optimization-start');

    // Mark when main content is available
    const checkMainContent = () => {
      const mainContent = document.querySelector('main, article');
      if (mainContent && mainContent.textContent.trim().length > 100) {
        performance.mark('main-content-available');
        performance.measure(
          'content-availability',
          'ai-optimization-start',
          'main-content-available'
        );
      }
    };

    // Check immediately and after a delay
    checkMainContent();
    setTimeout(checkMainContent, 100);
    setTimeout(checkMainContent, 500);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): Partial<PerformanceMetrics> {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      pageLoadTime: navEntry?.loadEventEnd - navEntry?.startTime,
      renderTime: navEntry?.domContentLoadedEventEnd - navEntry?.startTime,
      resourceCount: performance.getEntriesByType('resource').length,
      totalTransferSize: this.calculateTotalTransferSize(),
      aiSpecificMetrics: this.getAISpecificMetrics()
    };
  }

  /**
   * Calculate total transfer size of all resources
   */
  private calculateTotalTransferSize(): number {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.reduce((total, resource) => total + (resource.transferSize || 0), 0);
  }

  /**
   * Get AI-specific performance metrics
   */
  private getAISpecificMetrics(): PerformanceMetrics['aiSpecificMetrics'] {
    const measures = performance.getEntriesByType('measure');

    return {
      schemaParseTime: measures.find(m => m.name.includes('schema'))?.duration || 0,
      contentExtractionTime: measures.find(m => m.name.includes('content'))?.duration || 0,
      answerDetectionTime: measures.find(m => m.name.includes('answer'))?.duration || 0
    };
  }

  /**
   * Generate AI crawler optimization report
   */
  generateOptimizationReport(): Record<string, any> {
    return {
      platform: this.detectAICrawler() || 'Unknown',
      optimizationsApplied: this.optimizationsApplied,
      metrics: this.getMetrics(),
      recommendations: this.getRecommendations(),
      timestamp: Date.now()
    };
  }

  /**
   * Get optimization recommendations
   */
  private getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.metrics.pageLoadTime) {
      recommendations.push('Page load time not available - consider adding performance monitoring');
    } else if (this.metrics.pageLoadTime > 3000) {
      recommendations.push('Page load time exceeds 3 seconds - optimize critical resources');
    }

    if ((this.metrics.resourceCount || 0) > 50) {
      recommendations.push('High resource count detected - consider reducing HTTP requests');
    }

    const aiMetrics = this.metrics.aiSpecificMetrics;
    if (aiMetrics && aiMetrics.contentExtractionTime > 100) {
      recommendations.push('Content extraction is slow - optimize DOM structure and markup');
    }

    return recommendations;
  }

  /**
   * Export metrics in structured format for AI consumption
   */
  exportMetricsForAI(): Record<string, any> {
    const report = this.generateOptimizationReport();

    return {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'AI Crawler Performance Report',
      datePublished: new Date().toISOString(),
      author: {
        '@type': 'Organization',
        name: 'New Life Solutions'
      },
      description: `Performance metrics and optimizations for AI crawler ${report.platform}`,
      articleBody: JSON.stringify(report, null, 2),
      keywords: ['performance', 'AI', 'crawler', 'optimization']
    };
  }

  /**
   * Cleanup and reset optimizations
   */
  cleanup(): void {
    document.body.classList.remove('ai-streamlined-mode');
    document.documentElement.classList.remove(...document.documentElement.classList.value.split(' ').filter(c => c.startsWith('ai-crawler-')));

    // Remove optimization style tags
    const optimizationStyles = document.querySelectorAll('style[data-optimization="true"]');
    optimizationStyles.forEach(style => style.remove());

    this.optimizationsApplied.length = 0;
  }
}

// Export both the class constructor and instance
export { PerformanceOptimizer };
export { type PerformanceMetrics, type OptimizationConfig };
export const performanceOptimizer = new PerformanceOptimizer();

// Auto-initialize when ready

// Auto-initialize when ready
if (typeof window !== 'undefined') {
  const initOptimizer = () => {
    performanceOptimizer.initialize();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptimizer);
  } else {
    initOptimizer();
  }
}

