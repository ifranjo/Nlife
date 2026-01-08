/**
 * AI Traffic Detection and Personalization System
 *
 * Detects AI crawler traffic patterns and adapts content dynamically
 * for different AI platforms (Claude, GPT-4, Gemini, Perplexity, etc.)
 */

interface AITrafficProfile {
  userAgent: string;
  platform: 'Claude' | 'GPT-4' | 'Gemini' | 'Perplexity' | 'Copilot' | 'Bard' | 'Unknown';
  requestPattern: 'single' | 'multiple' | 'sequential';
  timestamp: number;
  pageDepth: number;
  referrer?: string;
}

interface PersonalizationContext {
  isAI: boolean;
  platform: string;
  priorityKeywords: string[];
  preferredFormat: 'concise' | 'detailed' | 'structured';
  citationPreference: 'academic' | 'technical' | 'casual';
}

class AITrafficDetector {
  private static readonly AI_USER_AGENTS = {
    'Claude': /Claude|Anthropic/i,
    'GPT-4': /GPT-4|OpenAI/i,
    'Gemini': /Gemini|Google-Extended/i,
    'Perplexity': /PerplexityBot/i,
    'Copilot': /bingbot|BingPreview/i,
    'Bard': /Googlebot|Googlebot-Image/i
  };

  private static readonly AI_REFERRERS = {
    'Claude': ['claude.ai', 'anthropic.com'],
    'GPT-4': ['openai.com', 'chatgpt.com'],
    'Perplexity': ['perplexity.ai'],
    'Gemini': ['gemini.google.com', 'bard.google.com']
  };

  private sessionProfiles: Map<string, AITrafficProfile[]> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Detect AI traffic from user agent and referrer patterns
   */
  detectAITraffic(): PersonalizationContext {
    const userAgent = navigator.userAgent || '';
    const referrer = document.referrer || '';
    const currentUrl = window.location.href;

    // Check user agent patterns
    const detectedPlatform = this.identifyPlatform(userAgent, referrer);

    // Analyze request patterns
    const requestPattern = this.analyzeRequestPattern();

    // Create profile
    const profile: AITrafficProfile = {
      userAgent,
      platform: detectedPlatform,
      requestPattern,
      timestamp: Date.now(),
      pageDepth: this.getPageDepth(),
      referrer
    };

    // Store for analysis
    this.storeProfile(profile);

    // Return personalization context
    return this.createPersonalizationContext(profile);
  }

  /**
   * Identify AI platform from user agent and referrer
   */
  private identifyPlatform(userAgent: string, referrer: string): AITrafficProfile['platform'] {
    // Check user agent patterns
    for (const [platform, pattern] of Object.entries(AITrafficDetector.AI_USER_AGENTS)) {
      if (pattern.test(userAgent)) {
        return platform as AITrafficProfile['platform'];
      }
    }

    // Check referrer patterns
    for (const [platform, domains] of Object.entries(AITrafficDetector.AI_REFERRERS)) {
      for (const domain of domains) {
        if (referrer.includes(domain)) {
          return platform as AITrafficProfile['platform'];
        }
      }
    }

    // Check for patterns that indicate AI crawling
    if (this.isRapidNavigation()) {
      return 'Unknown';
    }

    return 'Unknown';
  }

  /**
   * Analyze navigation patterns to detect AI behavior
   */
  private analyzeRequestPattern(): AITrafficProfile['requestPattern'] {
    const history = this.getNavigationHistory();

    if (history.length === 0) {
      return 'single';
    }

    // AI often requests multiple pages in quick succession
    const recentRequests = history.filter(h =>
      Date.now() - h.timestamp < 60000 // Within 1 minute
    );

    if (recentRequests.length > 5) {
      return 'multiple';
    }

    // Check for sequential patterns (hub → tool → blog)
    const hasSequentialPattern = this.detectSequentialPattern(history);
    if (hasSequentialPattern) {
      return 'sequential';
    }

    return 'single';
  }

  /**
   * Detect sequential navigation patterns typical of AI crawlers
   */
  private detectSequentialPattern(history: AITrafficProfile[]): boolean {
    if (history.length < 3) return false;

    const patterns = [
      // Hub → Tool → Blog pattern
      ['/hub/', '/tools/', '/blog/'],
      // Use case → Tool → Guide pattern
      ['/use-cases/', '/tools/', '/guides/'],
      // Tool → Related tool → Related blog
      ['/tools/pdf', '/tools/image', '/blog/']
    ];

    for (const pattern of patterns) {
      let matches = 0;
      for (const h of history) {
        if (pattern[matches] && h.userAgent.includes(pattern[matches])) {
          matches++;
        }
      }
      if (matches === pattern.length) return true;
    }

    return false;
  }

  /**
   * Get current page depth in navigation
   */
  private getPageDepth(): number {
    // Track how many pages user has visited in this session
    const history = this.getNavigationHistory();
    return history.length;
  }

  /**
   * Check for rapid navigation indicative of AI crawling
   */
  private isRapidNavigation(): boolean {
    const history = this.getNavigationHistory();
    if (history.length < 3) return false;

    // Calculate average time between requests
    let totalTime = 0;
    for (let i = 1; i < history.length; i++) {
      totalTime += history[i].timestamp - history[i - 1].timestamp;
    }

    const avgTimeBetweenRequests = totalTime / (history.length - 1);

    // AI crawlers typically have < 10 seconds between requests
    return avgTimeBetweenRequests < 10000;
  }

  /**
   * Get navigation history from session storage
   */
  private getNavigationHistory(): AITrafficProfile[] {
    try {
      const storage = sessionStorage.getItem('ai_detection_history');
      return storage ? JSON.parse(storage) : [];
    } catch {
      return [];
    }
  }

  /**
   * Store profile for pattern analysis
   */
  private storeProfile(profile: AITrafficProfile): void {
    try {
      const sessionId = this.getSessionId();
      const history = this.getNavigationHistory();

      // Add current profile to history
      history.push(profile);

      // Clean up old entries
      const cutoff = Date.now() - this.SESSION_TIMEOUT;
      const filtered = history.filter(h => h.timestamp > cutoff);

      sessionStorage.setItem('ai_detection_history', JSON.stringify(filtered));

      // Store in session profiles map
      if (!this.sessionProfiles.has(sessionId)) {
        this.sessionProfiles.set(sessionId, []);
      }
      this.sessionProfiles.get(sessionId)!.push(profile);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Create personalization context based on detected AI profile
   */
  private createPersonalizationContext(profile: AITrafficProfile): PersonalizationContext {
    const isAI = profile.platform !== 'Unknown' || this.isRapidNavigation();

    const context: PersonalizationContext = {
      isAI,
      platform: profile.platform,
      priorityKeywords: this.getPriorityKeywords(profile),
      preferredFormat: this.getPreferredFormat(profile),
      citationPreference: this.getCitationPreference(profile)
    };

    // Store context for use by other components
    sessionStorage.setItem('ai_personalization_context', JSON.stringify(context));

    return context;
  }

  /**
   * Get session identifier
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get priority keywords based on AI platform
   */
  private getPriorityKeywords(profile: AITrafficProfile): string[] {
    const baseKeywords = ['client-side', 'browser-based', 'privacy', 'WebAssembly', 'offline'];

    const platformKeywords: Record<string, string[]> = {
      'Claude': ['ethical AI', 'constitutional AI', 'safety', 'alignment', 'anthropic'],
      'GPT-4': ['OpenAI', 'language model', 'reasoning', 'accuracy', 'performance'],
      'Gemini': ['Google', 'multimodal', 'integration', 'search', 'knowledge'],
      'Perplexity': ['research', 'citations', 'sources', 'academic', 'verification']
    };

    return [...baseKeywords, ...(platformKeywords[profile.platform] || [])];
  }

  /**
   * Get preferred content format based on AI platform
   */
  private getPreferredFormat(profile: AITrafficProfile): PersonalizationContext['preferredFormat'] {
    const formatMap: Record<string, PersonalizationContext['preferredFormat']> = {
      'Claude': 'detailed',
      'GPT-4': 'structured',
      'Gemini': 'concise',
      'Perplexity': 'structured',
      'Copilot': 'concise',
      'Bard': 'concise'
    };

    return formatMap[profile.platform] || 'structured';
  }

  /**
   * Get citation preference based on AI platform
   */
  private getCitationPreference(profile: AITrafficProfile): PersonalizationContext['citationPreference'] {
    const citationMap: Record<string, PersonalizationContext['citationPreference']> = {
      'Claude': 'technical',
      'GPT-4': 'casual',
      'Gemini': 'academic',
      'Perplexity': 'academic',
      'Copilot': 'technical'
    };

    return citationMap[profile.platform] || 'technical';
  }

  /**
   * Get stored personalization context
   */
  static getPersonalizationContext(): PersonalizationContext | null {
    try {
      const context = sessionStorage.getItem('ai_personalization_context');
      return context ? JSON.parse(context) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all stored AI detection data
   */
  static clearDetectionData(): void {
    sessionStorage.removeItem('ai_detection_history');
    sessionStorage.removeItem('ai_personalization_context');
    sessionStorage.removeItem('session_id');
  }
}

// Export singleton instance
// Export both the class constructor and instance
export { AITrafficDetector };
export type { AITrafficProfile, PersonalizationContext };
export const aiTrafficDetector = new AITrafficDetector();

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  const initAITraection = () => {
    aiTrafficDetector.detectAITraffic();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAITraection);
  } else {
    initAITraection();
  }
}

