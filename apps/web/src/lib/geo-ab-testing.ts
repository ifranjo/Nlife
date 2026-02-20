/**
 * A/B Testing Framework for GEO Optimization
 *
 * Enables testing of different content strategies, adaptation rules,
 * and personalization approaches to optimize for AI platforms
 */

import type { PersonalizationContext } from './ai-detection';
import type { AdaptationRules } from './dynamic-adaptation';

// Test Configuration
interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  startTime: number;
  endTime?: number;
  status: 'draft' | 'running' | 'paused' | 'completed';
  winner?: string;
}

// Test Variant
interface TestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, traffic allocation
  rules: Partial<AdaptationRules>;
  customModifications?: Record<string, any>;
}

// Test Results
interface VariantResults {
  variantId: string;
  sessions: number;
  pageViews: number;
  conversions: number; // Citation or tool usage
  avgTimeOnPage: number;
  extractionSuccessRate: number;
  citationRate: number;
  // Platform-specific metrics
  byPlatform: Record<string, {
    sessions: number;
    conversions: number;
    avgEngagement: number;
  }>;
}

interface ABTestResults {
  testId: string;
  period: { start: number; end: number };
  totalSessions: number;
  variants: Record<string, VariantResults>;
  statisticalSignificance: Record<string, number>; // p-values per metric
  winner?: {
    variantId: string;
    confidence: number;
    winningMetrics: string[];
  };
}

// GEO-specific test types
interface GEOOptimizationTest extends ABTest {
  type: 'answer_format' | 'citation_style' | 'keyword_emphasis' | 'content_length';
  targetPlatforms: string[]; // ['Claude', 'GPT-4', 'all']
  successMetrics: string[]; // ['citation_rate', 'extraction_success', 'time_on_page']
  minimumSessions: number; // For statistical significance
}

class GEOABTestingFramework {
  private static instance: GEOABTestingFramework;
  private activeTests: Map<string, GEOOptimizationTest> = new Map();
  private variants: Map<string, TestVariant[]> = new Map();
  private results: Map<string, ABTestResults> = new Map();
  private assignments: Map<string, string> = new Map(); // sessionId -> variantId

  private readonly DEFAULT_CONFIG = {
    minimumSessions: 1000,
    confidenceThreshold: 0.95,
    runtimeMinHours: 24,
    runtimeMaxHours: 168 // 1 week
  };

  /**
   * Private constructor for singleton
   */
  private constructor() {
    this.initializeDefaultTests();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GEOABTestingFramework {
    if (!GEOABTestingFramework.instance) {
      GEOABTestingFramework.instance = new GEOABTestingFramework();
    }
    return GEOABTestingFramework.instance;
  }

  /**
   * Initialize with default GEO optimization tests
   */
  private initializeDefaultTests(): void {
    // Test 1: Answer format optimization
    this.createTest({
      id: 'answer_format_v1',
      name: 'Answer Format Optimization',
      description: 'Test different TL;DR and answer box formats',
      hypothesis: 'Claude and GPT-4 prefer expanded TL;DR sections with detailed context',
      type: 'answer_format',
      startTime: Date.now(),
      status: 'draft',
      targetPlatforms: ['Claude', 'GPT-4'],
      successMetrics: ['citation_rate', 'extraction_success', 'time_on_page'],
      minimumSessions: 1000
    });

    // Test 2: Citation style optimization
    this.createTest({
      id: 'citation_style_v1',
      name: 'Citation Style Optimization',
      description: 'Test different citation formats for Perplexity',
      hypothesis: 'Perplexity prefers explicit citation blocks with numbered references',
      type: 'citation_style',
      startTime: Date.now(),
      status: 'draft',
      targetPlatforms: ['Perplexity'],
      successMetrics: ['citation_rate', 'extraction_success'],
      minimumSessions: 500
    });

    // Test 3: Keyword emphasis
    this.createTest({
      id: 'keyword_emphasis_v1',
      name: 'Keyword Emphasis Strategy',
      description: 'Test semantic keyword highlighting for AI extraction',
      hypothesis: 'GPT-4 responds better to semantic keyword emphasis with background highlighting',
      type: 'keyword_emphasis',
      startTime: Date.now(),
      status: 'draft',
      targetPlatforms: ['GPT-4'],
      successMetrics: ['citation_rate', 'extraction_success'],
      minimumSessions: 1000
    });

    // Test 4: Content length optimization
    this.createTest({
      id: 'content_length_v1',
      name: 'Content Length Optimization',
      description: 'Test concise vs detailed content for Gemini',
      hypothesis: 'Gemini prefers more concise, direct answers without extensive context',
      type: 'content_length',
      startTime: Date.now(),
      status: 'draft',
      targetPlatforms: ['Gemini'],
      successMetrics: ['citation_rate', 'time_on_page'],
      minimumSessions: 800
    });
  }

  /**
   * Create a new A/B test
   */
  createTest(test: GEOOptimizationTest): void {
    this.activeTests.set(test.id, test);

    // Create default variants
    this.createDefaultVariants(test.id);
  }

  /**
   * Create default variants for a test
   */
  private createDefaultVariants(testId: string): void {
    const test = this.activeTests.get(testId);
    if (!test) return;

    switch (test.type) {
      case 'answer_format':
        this.addVariant(testId, {
          id: 'control',
          name: 'Control (Current Format)',
          description: 'Standard TL;DR format',
          weight: 0.5,
          rules: {} // Use defaults
        });

        this.addVariant(testId, {
          id: 'expanded_tldr',
          name: 'Expanded TL;DR',
          description: 'TL;DR with expandable details',
          weight: 0.5,
          rules: {
            contentFormat: {
              expandTLDR: true,
              emphasizeKeywords: false
            }
          }
        });
        break;

      case 'citation_style':
        this.addVariant(testId, {
          id: 'inline_citations',
          name: 'Inline Citations',
          description: 'Citations integrated into content',
          weight: 0.33,
          rules: {}
        });

        this.addVariant(testId, {
          id: 'explicit_blocks',
          name: 'Explicit Citation Blocks',
          description: 'Dedicated citation sections',
          weight: 0.33,
          rules: {
            contentFormat: {
              addCitations: true
            }
          }
        });

        this.addVariant(testId, {
          id: 'numbered_references',
          name: 'Numbered References',
          description: 'Academic-style numbered references',
          weight: 0.34,
          rules: {
            contentFormat: {
              addCitations: true
            },
            customModifications: {
              citationStyle: 'academic_numbered'
            }
          }
        });
        break;

      case 'keyword_emphasis':
        this.addVariant(testId, {
          id: 'no_emphasis',
          name: 'No Keyword Emphasis',
          description: 'Natural text without highlighting',
          weight: 0.25,
          rules: {}
        });

        this.addVariant(testId, {
          id: 'semantic_highlight',
          name: 'Semantic Highlighting',
          description: 'Background highlighting for keywords',
          weight: 0.25,
          rules: {
            contentFormat: {
              emphasizeKeywords: true
            }
          }
        });

        this.addVariant(testId, {
          id: 'mark_tags',
          name: 'HTML Mark Tags',
          description: 'Semantic <mark> tags for keywords',
          weight: 0.25,
          rules: {
            contentFormat: {
              emphasizeKeywords: true
            }
          }
        });

        this.addVariant(testId, {
          id: 'data_attributes',
          name: 'Data Attributes',
          description: 'Data attributes for extraction',
          weight: 0.25,
          rules: {
            contentFormat: {
              emphasizeKeywords: true
            },
            customModifications: {
              useDataAttributes: true
            }
          }
        });
        break;

      case 'content_length':
        this.addVariant(testId, {
          id: 'detailed',
          name: 'Detailed Content',
          description: 'Comprehensive explanation with examples',
          weight: 0.5,
          rules: {}
        });

        this.addVariant(testId, {
          id: 'concise',
          name: 'Concise Content',
          description: 'Brief, direct answers only',
          weight: 0.5,
          rules: {
            contentFormat: {
              expandTLDR: false
            }
          }
        });
        break;
    }
  }

  /**
   * Add a variant to an existing test
   */
  addVariant(testId: string, variant: TestVariant): void {
    if (!this.variants.has(testId)) {
      this.variants.set(testId, []);
    }

    const variants = this.variants.get(testId)!;
    variants.push(variant);

    // Normalize weights
    this.normalizeVariantWeights(testId);
  }

  /**
   * Normalize variant weights to sum to 1
   */
  private normalizeVariantWeights(testId: string): void {
    const variants = this.variants.get(testId);
    if (!variants || variants.length === 0) return;

    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    variants.forEach(v => v.weight = v.weight / totalWeight);
  }

  /**
   * Start an A/B test
   */
  startTest(testId: string): void {
    const test = this.activeTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'running';
    test.startTime = Date.now();

    console.log(`🧪 Starting A/B test: ${test.name}`);
  }

  /**
   * Assign variant to a session
   */
  assignVariant(testId: string, sessionId: string): TestVariant | null {
    // Check if already assigned
    const assignmentKey = `${testId}_${sessionId}`;
    if (this.assignments.has(assignmentKey)) {
      const variantId = this.assignments.get(assignmentKey)!;
      return this.getVariant(testId, variantId);
    }

    // Get test and variants
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') return null;

    const variants = this.variants.get(testId);
    if (!variants || variants.length === 0) return null;

    // Select variant based on weights
    const selectedVariant = this.selectVariantByWeight(variants);

    // Store assignment
    this.assignments.set(assignmentKey, selectedVariant.id);

    return selectedVariant;
  }

  /**
   * Select variant based on weight
   */
  private selectVariantByWeight(variants: TestVariant[]): TestVariant {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }

    // Fallback to last variant
    return variants[variants.length - 1];
  }

  /**
   * Get variant by ID
   */
  getVariant(testId: string, variantId: string): TestVariant | null {
    const variants = this.variants.get(testId);
    if (!variants) return null;

    return variants.find(v => v.id === variantId) || null;
  }

  /**
   * Track results for a variant
   */
  trackResult(testId: string, variantId: string, metrics: Partial<VariantResults>): void {
    if (!this.results.has(testId)) {
      this.results.set(testId, {
        testId,
        period: { start: Date.now(), end: Date.now() },
        totalSessions: 0,
        variants: {}
      });
    }

    const results = this.results.get(testId)!;
    results.totalSessions++;

    if (!results.variants[variantId]) {
      results.variants[variantId] = {
        variantId,
        sessions: 0,
        pageViews: 0,
        conversions: 0,
        avgTimeOnPage: 0,
        extractionSuccessRate: 0,
        citationRate: 0,
        byPlatform: {}
      };
    }

    const variantResults = results.variants[variantId];
    variantResults.sessions++;

    // Merge metrics
    Object.assign(variantResults, {
      ...variantResults,
      ...metrics,
      sessions: variantResults.sessions
    });

    // Update period end time
    results.period.end = Date.now();
  }

  /**
   * Calculate statistical significance
   */
  private calculateStatisticalSignificance(
    variantA: VariantResults,
    variantB: VariantResults,
    metric: string
  ): number {
    // Simplified calculation - in production use proper statistical library
    const n1 = variantA.sessions;
    const n2 = variantB.sessions;
    const p1 = this.getMetricValue(variantA, metric);
    const p2 = this.getMetricValue(variantB, metric);

    if (n1 === 0 || n2 === 0) return 0;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

    if (se === 0) return 0;

    const zScore = Math.abs(p1 - p2) / se;

    // Convert z-score to p-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(zScore));

    return 1 - pValue; // Return confidence level
  }

  /**
   * Get metric value from variant results
   */
  private getMetricValue(results: VariantResults, metric: string): number {
    switch (metric) {
      case 'conversion_rate':
        return results.conversions / Math.max(results.sessions, 1);
      case 'citation_rate':
        return results.citationRate;
      case 'extraction_success':
        return results.extractionSuccessRate;
      case 'time_on_page':
        return results.avgTimeOnPage;
      default:
        return 0;
    }
  }

  /**
   * Normal distribution CDF approximation
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  /**
   * Get test results
   */
  getResults(testId: string): ABTestResults | null {
    const results = this.results.get(testId);
    if (!results) return null;

    // Calculate significance for each metric
    const test = this.activeTests.get(testId);
    if (!test) return results;

    const variants = Object.values(results.variants);
    if (variants.length < 2) return results;

    const significance: Record<string, number> = {};

    test.successMetrics.forEach(metric => {
      // Compare each variant to control
      const control = variants.find(v => v.variantId === 'control') || variants[0];
      variants.forEach(variant => {
        if (variant.variantId === control.variantId) return;

        const key = `${variant.variantId}_vs_${control.variantId}_${metric}`;
        significance[key] = this.calculateStatisticalSignificance(
          control,
          variant,
          metric
        );
      });
    });

    results.statisticalSignificance = significance;

    // Determine winner if any variant has >95% confidence on all metrics
    const winner = this.determineWinner(results, test);
    if (winner) {
      results.winner = winner;
    }

    return results;
  }

  /**
   * Determine if there's a clear winner
   */
  private determineWinner(
    results: ABTestResults,
    test: GEOOptimizationTest
  ): ABTestResults['winner'] | null {
    const variants = Object.values(results.variants);
    if (variants.length < 2) return null;

    const winningVariants: Array<{ variant: VariantResults; metrics: string[] }> = [];

    variants.forEach(variant => {
      const winningMetrics: string[] = [];

      test.successMetrics.forEach(metric => {
        const controlKey = Object.keys(results.statisticalSignificance).find(
          key => key.includes(`_vs_control_${metric}`)
        );

        if (controlKey && results.statisticalSignificance[controlKey] >= 0.95) {
          winningMetrics.push(metric);
        }
      });

      if (winningMetrics.length > 0) {
        winningVariants.push({ variant, metrics: winningMetrics });
      }
    });

    // Sort by number of winning metrics
    winningVariants.sort((a, b) => b.metrics.length - a.metrics.length);

    if (winningVariants.length > 0) {
      const topWinner = winningVariants[0];
      return {
        variantId: topWinner.variant.variantId,
        confidence: Math.min(...topWinner.metrics.map(metric => {
          const key = `${topWinner.variant.variantId}_vs_control_${metric}`;
          return results.statisticalSignificance[key] || 0;
        })),
        winningMetrics: topWinner.metrics
      };
    }

    return null;
  }

  /**
   * Get all running tests
   */
  getRunningTests(): GEOOptimizationTest[] {
    return Array.from(this.activeTests.values())
      .filter(test => test.status === 'running');
  }

  /**
   * Pause a test
   */
  pauseTest(testId: string): void {
    const test = this.activeTests.get(testId);
    if (test) {
      test.status = 'paused';
    }
  }

  /**
   * Complete a test
   */
  completeTest(testId: string): ABTestResults | null {
    const test = this.activeTests.get(testId);
    if (!test) return null;

    test.status = 'completed';

    // Determine final winner
    const results = this.getResults(testId);
    if (results?.winner) {
      test.winner = results.winner.variantId;

      // Apply winning variant as new default
      this.applyWinner(testId, results.winner.variantId);
    }

    return results;
  }

  /**
   * Apply winning variant as new control
   */
  private applyWinner(testId: string, variantId: string): void {
    const variant = this.getVariant(testId, variantId);
    if (!variant) return;

    console.log(`🏆 Applying winning variant: ${variant.name}`);

    // In a real implementation, this would update the default configuration
    // For now, just log the change
    console.log('Applied rules:', variant.rules);
  }

  /**
   * Export test data for external analysis
   */
  exportTestData(testId: string): string {
    const test = this.activeTests.get(testId);
    const results = this.results.get(testId);

    if (!test || !results) return '';

    const data = {
      test: {
        id: test.id,
        name: test.name,
        type: test.type,
        platforms: test.targetPlatforms
      },
      variants: this.variants.get(testId),
      results: results,
      exported: Date.now()
    };

    return JSON.stringify(data, null, 2);
  }
}

// Export singleton
export const geoABTesting = GEOABTestingFramework.getInstance();

// Auto-initialize
if (typeof window !== 'undefined') {
  const initABTesting = () => {
    // In production, you might want to start tests automatically
    // For now, tests are created in draft mode and need manual start
    console.log('🧪 GEO A/B Testing framework initialized');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initABTesting);
  } else {
    initABTesting();
  }
}

// Export types
export type {
  GEOOptimizationTest,
  TestVariant,
  VariantResults,
  ABTestResults
};
