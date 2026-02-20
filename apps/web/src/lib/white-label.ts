/**
 * White-Label Configuration System
 *
 * Provides comprehensive white-label and branding capabilities
 * for the HAMBREDEVICTORIA GEO optimization system
 */

export interface WhiteLabelConfig {
  // Brand Identity
  brandName: string;
  brandLogo?: {
    light: string;
    dark?: string;
    favicon?: string;
    appleTouch?: string;
  };

  // Colors (CSS variables)
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    success?: string;
    warning?: string;
    error?: string;
  };

  // Typography
  typography?: {
    fontFamily?: string;
    headingFont?: string;
    fontSize?: {
      base?: string;
      scale?: number;
    };
  };

  // Layout
  layout?: {
    borderRadius?: string;
    spacing?: string;
    maxWidth?: string;
    containerStyle?: 'boxed' | 'full-width';
  };

  // Content
  content?: {
    companyName?: string;
    supportEmail?: string;
    supportPhone?: string;
    website?: string;
    privacyPolicy?: string;
    termsOfService?: string;
    customFooter?: string;
  };

  // Features
  features?: {
    showPoweredBy?: boolean;
    customWatermark?: boolean;
    whiteLabelMode?: boolean;
    customDomain?: boolean;
    apiBranding?: boolean;
  };

  // Advanced
  customCSS?: string;
  customJS?: string;
  metadata?: Record<string, string>;
  integrations?: {
    analytics?: string;
    chat?: string;
    crm?: string;
  };
}

export interface BrandVariant {
  id: string;
  name: string;
  config: WhiteLabelConfig;
  preview?: string;
}

export interface BrandApplication {
  element: HTMLElement;
  appliedAt: number;
  configSnapshot: WhiteLabelConfig;
}

class WhiteLabelSystem {
  private config: WhiteLabelConfig = {
    brandName: 'New Life Solutions',
    colors: {
      primary: '#00ff00',
      secondary: '#818cf8',
      accent: '#fbbf24',
      background: '#0a0a0a',
      text: '#e0e0e0',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff4444'
    },
    content: {
      companyName: 'New Life Solutions',
      supportEmail: 'support@newlifesolutions.dev',
      website: 'https://www.newlifesolutions.dev'
    },
    features: {
      showPoweredBy: true,
      whiteLabelMode: false,
      customWatermark: false
    }
  };

  private brandVariants: Map<string, BrandVariant> = new Map();
  private appliedElements: Map<HTMLElement, BrandApplication> = new Map();
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.initializeSystem();
  }

  /**
   * Initialize white-label system
   */
  private initializeSystem(): void {
    if (typeof window === 'undefined') return;

    // Create style element for dynamic CSS
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'white-label-styles';
    document.head.appendChild(this.styleElement);

    // Apply default branding
    this.applyCSSVariables();

    // Load saved configuration
    this.loadSavedConfig();
  }

  /**
   * Configure white-label system
   */
  configure(config: Partial<WhiteLabelConfig>): void {
    this.config = { ...this.config, ...config };

    // Save to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('white_label_config', JSON.stringify(this.config));
    }

    // Apply new configuration
    this.applyCSSVariables();
    this.reapplyBranding();

    console.log('🏷️ White-label configuration updated');
  }

  /**
   * Apply CSS variables
   */
  private applyCSSVariables(): void {
    if (!this.styleElement) return;

    const css = `
      :root {
        --brand-primary: ${this.config.colors.primary};
        --brand-secondary: ${this.config.colors.secondary || this.config.colors.primary};
        --brand-accent: ${this.config.colors.accent || '#fbbf24'};
        --brand-bg: ${this.config.colors.background || '#0a0a0a'};
        --brand-text: ${this.config.colors.text || '#e0e0e0'};
        --brand-success: ${this.config.colors.success || '#00ff00'};
        --brand-warning: ${this.config.colors.warning || '#ffaa00'};
        --brand-error: ${this.config.colors.error || '#ff4444'};

        --brand-name: "${this.config.brandName}";
        --brand-font: ${this.config.typography?.fontFamily || 'system-ui'};
        --brand-heading-font: ${this.config.typography?.headingFont || 'inherit'};
        --brand-border-radius: ${this.config.layout?.borderRadius || '0.5rem'};
        --brand-spacing: ${this.config.layout?.spacing || '1rem'};
        --brand-max-width: ${this.config.layout?.maxWidth || '1200px'};
      }

      .white-label-branded {
        --primary: var(--brand-primary);
        --secondary: var(--brand-secondary);
        --accent: var(--brand-accent);
        --bg: var(--brand-bg);
        --text: var(--brand-text);
        --success: var(--brand-success);
        --warning: var(--brand-warning);
        --error: var(--brand-error);
      }

      .white-label-branded .brand-logo {
        content: url('${this.config.brandLogo?.light || '/logo.svg'}');
      }

      @media (prefers-color-scheme: dark) {
        .white-label-branded .brand-logo {
          content: url('${this.config.brandLogo?.dark || this.config.brandLogo?.light || '/logo.svg'}');
        }
      }

      .white-label-branded .brand-name::before {
        content: var(--brand-name);
      }

      ${this.config.customCSS || ''}
    `;

    this.styleElement.textContent = css;
  }

  /**
   * Apply branding to element
   */
  applyBranding(element: HTMLElement): void {
    const startTime = Date.now();

    // Add branded class
    element.classList.add('white-label-branded');

    // Apply logo
    this.applyLogo(element);

    // Apply content
    this.applyContent(element);

    // Apply features
    this.applyFeatures(element);

    // Store application info
    this.appliedElements.set(element, {
      element,
      appliedAt: Date.now(),
      configSnapshot: { ...this.config }
    });

    // Execute custom JS
    if (this.config.customJS) {
      try {
        const func = new Function(this.config.customJS);
        func.call(element);
      } catch (error) {
        console.error('Error executing custom JS:', error);
      }
    }

    console.log(`🏷️ Branding applied to element in ${Date.now() - startTime}ms`);
  }

  /**
   * Apply logo
   */
  private applyLogo(element: HTMLElement): void {
    if (!this.config.brandLogo) return;

    // Find and update logo elements
    const logos = element.querySelectorAll('[data-brand-logo]');
    logos.forEach((logo) => {
      if (logo instanceof HTMLImageElement) {
        logo.src = this.config.brandLogo?.light || '';
        logo.classList.add('brand-logo');
      }
    });

    // Update favicon
    if (this.config.brandLogo.favicon) {
      this.updateFavicon(this.config.brandLogo.favicon);
    }

    // Update Apple touch icon
    if (this.config.brandLogo.appleTouch) {
      this.updateAppleTouchIcon(this.config.brandLogo.appleTouch);
    }
  }

  /**
   * Apply content changes
   */
  private applyContent(element: HTMLElement): void {
    const content = this.config.content;
    if (!content) return;

    // Update company name
    if (content.companyName) {
      const companyElements = element.querySelectorAll('[data-brand-company]');
      companyElements.forEach(el => {
        if (el.textContent?.includes('New Life Solutions')) {
          el.textContent = el.textContent.replace(/New Life Solutions/g, content.companyName!);
        }
      });
    }

    // Update support email
    if (content.supportEmail) {
      const emailElements = element.querySelectorAll('a[href*="support@newlifesolutions.dev"]');
      emailElements.forEach(el => {
        if (el instanceof HTMLAnchorElement) {
          el.href = el.href.replace('support@newlifesolutions.dev', content.supportEmail!);
          el.textContent = el.textContent?.replace('support@newlifesolutions.dev', content.supportEmail!) || '';
        }
      });
    }

    // Update links
    if (content.website) {
      const websiteElements = element.querySelectorAll('a[href*="newlifesolutions.dev"]');
      websiteElements.forEach(el => {
        if (el instanceof HTMLAnchorElement) {
          el.href = el.href.replace('newlifesolutions.dev', content.website.replace(/^https?:\/\//, ''));
        }
      });
    }

    // Update footer
    if (content.customFooter) {
      const footer = element.querySelector('footer');
      if (footer) {
        const customFooter = footer.querySelector('.custom-footer');
        if (customFooter) {
          customFooter.innerHTML = content.customFooter;
        }
      }
    }
  }

  /**
   * Apply features
   */
  private applyFeatures(element: HTMLElement): void {
    const features = this.config.features || {};

    // Hide powered by
    if (!features.showPoweredBy) {
      const poweredByElements = element.querySelectorAll('.powered-by, [data-powered-by]');
      poweredByElements.forEach(el => el.remove());
    }

    // Add watermark
    if (features.customWatermark) {
      this.addWatermark(element);
    }

    // Apply white-label mode
    if (features.whiteLabelMode) {
      element.classList.add('white-label-mode');
    }
  }

  /**
   * Add watermark
   */
  private addWatermark(element: HTMLElement): void {
    if (typeof document === 'undefined') return;

    const watermark = document.createElement('div');
    watermark.className = 'brand-watermark';
    watermark.textContent = 'Powered by ' + this.config.brandName;
    watermark.style.cssText = 'position: fixed; bottom: 10px; right: 10px; opacity: 0.5; font-size: 12px; color: var(--brand-text); pointer-events: none; z-index: 9999;';
    element.appendChild(watermark);
  }

  /**
   * Update favicon
   */
  private updateFavicon(url: string): void {
    if (typeof document === 'undefined') return;

    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  /**
   * Update Apple touch icon
   */
  private updateAppleTouchIcon(url: string): void {
    if (typeof document === 'undefined') return;

    let link = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  /**
   * Reapply branding to all elements
   */
  private reapplyBranding(): void {
    this.appliedElements.forEach((app, element) => {
      this.applyBranding(element);
    });
  }

  /**
   * Load saved configuration
   */
  private loadSavedConfig(): void {
    if (typeof localStorage === 'undefined') return;

    const saved = localStorage.getItem('white_label_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        this.config = { ...this.config, ...config };
        this.applyCSSVariables();
      } catch (error) {
        console.error('Error loading saved config:', error);
      }
    }
  }

  /**
   * Get current configuration
   */
  getBrandConfig(): WhiteLabelConfig {
    return { ...this.config };
  }

  /**
   * Get brand variants
   */
  getBrandVariants(): BrandVariant[] {
    return Array.from(this.brandVariants.values());
  }

  /**
   * Save brand variant
   */
  saveBrandVariant(id: string, name: string, config?: Partial<WhiteLabelConfig>): void {
    const variantConfig = config ? { ...this.config, ...config } : { ...this.config };

    this.brandVariants.set(id, {
      id,
      name,
      config: variantConfig
    });

    // Save to localStorage
    if (typeof localStorage !== 'undefined') {
      const variants = Array.from(this.brandVariants.entries());
      localStorage.setItem('white_label_variants', JSON.stringify(variants));
    }
  }

  /**
   * Load brand variant
   */
  loadBrandVariant(id: string): boolean {
    const variant = this.brandVariants.get(id);
    if (variant) {
      this.configure(variant.config);
      return true;
    }
    return false;
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      this.configure(config);
      return true;
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }

  /**
   * Remove branding from element
   */
  removeBranding(element: HTMLElement): void {
    element.classList.remove('white-label-branded');
    this.appliedElements.delete(element);

    // Remove watermark
    const watermark = element.querySelector('.brand-watermark');
    if (watermark) {
      watermark.remove();
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.configure({
      brandName: 'New Life Solutions',
      colors: {
        primary: '#00ff00',
        secondary: '#818cf8',
        accent: '#fbbf24',
        background: '#0a0a0a',
        text: '#e0e0e0',
        success: '#00ff00',
        warning: '#ffaa00',
        error: '#ff4444'
      },
      content: {
        companyName: 'New Life Solutions',
        supportEmail: 'support@newlifesolutions.dev',
        website: 'https://www.newlifesolutions.dev'
      },
      features: {
        showPoweredBy: true,
        whiteLabelMode: false,
        customWatermark: false
      }
    });

    // Clear saved config
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('white_label_config');
    }
  }
}

// Export singleton
export const whiteLabel = new WhiteLabelSystem();
export type { WhiteLabelConfig, BrandVariant, BrandApplication };

// Auto-initialize
if (typeof window !== 'undefined') {
  const initWhiteLabel = () => {
    // Apply branding to body if in white-label mode
    if (window.location.search.includes('white_label=true')) {
      whiteLabel.configure({
        features: {
          whiteLabelMode: true,
          showPoweredBy: false
        }
      });

      whiteLabel.applyBranding(document.body);
      console.log('🏷️ White-label system initialized');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhiteLabel);
  } else {
    initWhiteLabel();
  }
}

console.log('🏷️ White-label configuration system loaded');