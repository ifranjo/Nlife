/**
 * Dynamic Content Adaptation Engine
 *
 * Adapts content presentation based on detected AI platform preferences
 * for optimal extraction and citation by different AI systems
 */

import { AITrafficDetector, type PersonalizationContext } from './ai-detection';

interface AdaptationRules {
  contentFormat: {
    expandTLDR: boolean; // Expand TL;DR sections for platforms that prefer brevity
    emphasizeKeywords: boolean; // Highlight priority keywords
    structureData: boolean; // Add additional structured data
    addCitations: boolean; // Add explicit citation blocks
  };
  visualPresentation: {
    highlightAnswers: boolean; // Use visual cues for answer sections
    showExpertiseSignals: boolean; // Emphasize author credentials
    displaySocialProof: boolean; // Show usage stats and testimonials
  };
  technicalEnhancements: {
    preloadResources: boolean; // Preload next pages for sequential patterns
    cacheResponses: boolean; // Cache API responses for faster access
    enablePrefetching: boolean; // Prefetch related content
  };
  customModifications?: Record<string, unknown>; // For A/B test variants
}

class DynamicAdaptationEngine {
  private detector = new AITrafficDetector();
  private context: PersonalizationContext | null = null;
  private adaptations: Partial<AdaptationRules> = {};

  /**
   * Initialize adaptation engine with AI detection context
   */
  initialize(): void {
    this.context = this.detector.detectAITraffic();
    this.adaptations = this.calculateAdaptations();
    this.applyAdaptations();
  }

  /**
   * Calculate adaptation rules based on AI platform context
   */
  private calculateAdaptations(): AdaptationRules {
    if (!this.context) {
      return this.getDefaultAdaptations();
    }

    const { isAI, platform, preferredFormat, citationPreference } = this.context;

    if (!isAI) {
      return this.getDefaultAdaptations();
    }

    // Platform-specific adaptation rules
    const platformRules: Record<string, Partial<AdaptationRules>> = {
      'Claude': {
        contentFormat: {
          expandTLDR: true,
          emphasizeKeywords: true,
          structureData: true,
          addCitations: true
        },
        visualPresentation: {
          highlightAnswers: true,
          showExpertiseSignals: true,
          displaySocialProof: true
        },
        technicalEnhancements: {
          preloadResources: false,
          cacheResponses: true,
          enablePrefetching: false
        }
      },
      'GPT-4': {
        contentFormat: {
          expandTLDR: false,
          emphasizeKeywords: true,
          structureData: true,
          addCitations: true
        },
        visualPresentation: {
          highlightAnswers: true,
          showExpertiseSignals: false,
          displaySocialProof: true
        },
        technicalEnhancements: {
          preloadResources: true,
          cacheResponses: true,
          enablePrefetching: true
        }
      },
      'Perplexity': {
        contentFormat: {
          expandTLDR: false,
          emphasizeKeywords: true,
          structureData: true,
          addCitations: true
        },
        visualPresentation: {
          highlightAnswers: true,
          showExpertiseSignals: true,
          displaySocialProof: true
        },
        technicalEnhancements: {
          preloadResources: true,
          cacheResponses: true,
          enablePrefetching: true
        }
      },
      'Gemini': {
        contentFormat: {
          expandTLDR: true,
          emphasizeKeywords: false,
          structureData: true,
          addCitations: false
        },
        visualPresentation: {
          highlightAnswers: false,
          showExpertiseSignals: false,
          displaySocialProof: false
        },
        technicalEnhancements: {
          preloadResources: false,
          cacheResponses: true,
          enablePrefetching: false
        }
      }
    };

    const platformRule = platformRules[platform] || {};

    return {
      contentFormat: {
        expandTLDR: false,
        emphasizeKeywords: false,
        structureData: false,
        addCitations: false,
        ...platformRule.contentFormat
      },
      visualPresentation: {
        highlightAnswers: false,
        showExpertiseSignals: false,
        displaySocialProof: false,
        ...platformRule.visualPresentation
      },
      technicalEnhancements: {
        preloadResources: false,
        cacheResponses: false,
        enablePrefetching: false,
        ...platformRule.technicalEnhancements
      }
    };
  }

  /**
   * Get default adaptations for regular users
   */
  private getDefaultAdaptations(): AdaptationRules {
    return {
      contentFormat: {
        expandTLDR: false,
        emphasizeKeywords: false,
        structureData: true, // Always include for SEO
        addCitations: false
      },
      visualPresentation: {
        highlightAnswers: false,
        showExpertiseSignals: true,
        displaySocialProof: true
      },
      technicalEnhancements: {
        preloadResources: false,
        cacheResponses: false,
        enablePrefetching: false
      }
    };
  }

  /**
   * Apply calculated adaptations to the page
   */
  private applyAdaptations(): void {
    if (!this.adaptations.contentFormat || !this.context) return;

    const { contentFormat } = this.adaptations;

    // Apply content format adaptations
    if (contentFormat.emphasizeKeywords) {
      this.emphasizePriorityKeywords();
    }

    if (contentFormat.expandTLDR) {
      this.expandTLDRSections();
    }

    if (contentFormat.addCitations) {
      this.addCitationBlocks();
    }

    // Apply visual adaptations
    if (this.adaptations.visualPresentation?.highlightAnswers) {
      this.highlightAnswerSections();
    }

    // Apply technical enhancements
    if (this.adaptations.technicalEnhancements?.enablePrefetching) {
      this.enablePrefetching();
    }
  }

  /**
   * Emphasize priority keywords for AI platforms that scan for them
   * Uses TreeWalker to safely iterate text nodes without breaking event listeners
   */
  private emphasizePriorityKeywords(): void {
    if (!this.context) return;

    const keywords = this.context.priorityKeywords;
    if (keywords.length === 0) return;

    // Use TreeWalker to iterate only text nodes (skip script, style, etc.)
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Text) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          // Skip script, style, and elements with user-generated content
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: Text[] = [];
    let node: Text | null;
    while (node = walker.nextNode() as Text) {
      textNodes.push(node);
    }

    // Process each text node safely
    for (const textNode of textNodes) {
      let content = textNode.textContent || '';
      let modified = false;

      for (const keyword of keywords) {
        // Escape regex special characters in keyword
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(\\b${escapedKeyword}\\b)`, 'gi');

        if (regex.test(content)) {
          content = content.replace(regex, '<mark class="ai-keyword" data-keyword="$1">$1</mark>');
          modified = true;
        }
      }

      if (modified) {
        // Replace text node with HTML span
        const span = document.createElement('span');
        span.innerHTML = content;
        textNode.parentNode?.replaceChild(span, textNode);
      }
    }
  }

  /**
   * Expand TL;DR sections for platforms that prefer more context
   */
  private expandTLDRSections(): void {
    const tldrElements = document.querySelectorAll('[data-tldr="summary"]');

    tldrElements.forEach(element => {
      const expandButton = document.createElement('button');
      expandButton.className = 'tldr-expand-btn';
      expandButton.textContent = 'Show more details...';

      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'tldr-details';
      detailsContainer.innerHTML = '<p>Additional technical details and implementation information...</p>';

      element.appendChild(expandButton);
      element.appendChild(detailsContainer);

      expandButton.addEventListener('click', () => {
        detailsContainer.style.display = detailsContainer.style.display === 'none' ? 'block' : 'none';
      });
    });
  }

  /**
   * Add explicit citation blocks for platforms that prioritize sources
   */
  private addCitationBlocks(): void {
    const sections = document.querySelectorAll('section, article');

    sections.forEach(section => {
      const citationBlock = document.createElement('aside');
      citationBlock.className = 'ai-citation-block';
      citationBlock.innerHTML = `
        <h4>Sources & References</h4>
        <ul>
          <li><a href="https://www.newlifesolutions.dev">New Life Solutions Official Documentation</a></li>
          <li><a href="https://github.com/yourusername/new-life-solutions">GitHub Repository</a></li>
          <li>Technical Implementation: Browser-based processing using WebAssembly</li>
        </ul>
      `;

      section.appendChild(citationBlock);
    });
  }

  /**
   * Highlight answer sections for better extraction
   */
  private highlightAnswerSections(): void {
    const answerSections = document.querySelectorAll('[itemprop="acceptedAnswer"], .voice-answer');

    answerSections.forEach(section => {
      section.classList.add('ai-answer-highlight');

      // Add visual indicator
      const indicator = document.createElement('div');
      indicator.className = 'ai-answer-indicator';
      indicator.textContent = 'Excerpt optimized for AI extraction';
      section.appendChild(indicator);
    });
  }

  /**
   * Enable prefetching for AI crawlers that follow sequential patterns
   */
  private enablePrefetching(): void {
    const links = document.querySelectorAll('a[href*="/tools/"], a[href*="/blog/"], a[href*="/guides/"]');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);
      }
    });
  }

  /**
   * Get current adaptation state
   */
  getCurrentAdaptations(): Partial<AdaptationRules> {
    return this.adaptations;
  }

  /**
   * Force specific adaptations (for testing)
   */
  forceAdaptations(adaptations: Partial<AdaptationRules>): void {
    this.adaptations = adaptations;
    this.applyAdaptations();
  }

  /**
   * Reset to default adaptations
   */
  reset(): void {
    this.adaptations = this.getDefaultAdaptations();
    this.applyAdaptations();
  }

  /**
   * Get adaptation metrics for analytics
   */
  getMetrics(): Record<string, any> {
    return {
      isAI: this.context?.isAI,
      platform: this.context?.platform,
      adaptations: this.adaptations,
      timestamp: Date.now()
    };
  }
}

// Export both the class constructor and instance
export { DynamicAdaptationEngine };
export { type AdaptationRules };
export const adaptationEngine = new DynamicAdaptationEngine();

// NOTE: Initialization is controlled by PersonalizationLayer
// Do NOT auto-initialize here - it causes race conditions with multiple modules

