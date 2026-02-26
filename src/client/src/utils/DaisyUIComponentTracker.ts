// DaisyUI Component Usage Tracker
// This system tracks which DaisyUI components are used throughout the application

interface ComponentUsage {
  component: string;
  uri: string;
  purpose: string;
  usageCount: number;
  firstUsed: string;
  lastUsed: string;
}

interface DaisyUIComponentStats {
  totalComponents: number;
  usedComponents: number;
  unusedComponents: string[];
  componentUsage: ComponentUsage[];
  categories: {
    [category: string]: {
      total: number;
      used: number;
      components: string[];
    };
  };
}

class DaisyUIComponentTracker {
  private componentUsage: Map<string, ComponentUsage> = new Map();

  // Complete list of DaisyUI components organized by category
  private readonly daisyUIComponents = {
    // Content & Typography
    content: ['alert', 'badge', 'blockquote', 'code', 'kbd', 'link', 'stat', 'text'],

    // Layout
    layout: ['artboard', 'collapse', 'divider', 'drawer', 'footer', 'hero', 'join', 'mask', 'stack', 'swap'],

    // Navigation
    navigation: ['breadcrumbs', 'bottom-nav', 'menu', 'navbar', 'pagination', 'steps', 'tab', 'toggle'],

    // Data Display
    dataDisplay: ['card', 'carousel', 'chat', 'chat-bubble', 'timeline', 'timeline-item', 'timeline-middle', 'timeline-start', 'timeline-end'],

    // Forms & Input
    forms: ['checkbox', 'file-input', 'input', 'radio', 'range', 'rating', 'select', 'textarea', 'toggle'],

    // Actions
    actions: ['btn', 'button-group', 'dropdown', 'modal', 'tooltip'],

    // Loading & Progress
    loading: ['loading', 'progress', 'radial-progress'],

    // Feedback
    feedback: ['toast', 'indicator'],

    // Utilities
    utilities: ['join', 'mockup', 'phone', 'window'],

    // Themes & Styling
    themes: ['theme'],

    // Advanced Components
    advanced: ['swap', 'mask', 'drawer', 'join', 'stack', 'artboard'],
  };

  // Track component usage
  trackComponent(component: string, uri: string, purpose: string): void {
    const existing = this.componentUsage.get(component);
    const now = new Date().toISOString();

    if (existing) {
      // Update existing usage
      this.componentUsage.set(component, {
        ...existing,
        usageCount: existing.usageCount + 1,
        lastUsed: now,
      });
    } else {
      // New usage
      this.componentUsage.set(component, {
        component,
        uri,
        purpose,
        usageCount: 1,
        firstUsed: now,
        lastUsed: now,
      });
    }
  }

  // Get component statistics
  getStats(): DaisyUIComponentStats {
    const allComponents = Object.values(this.daisyUIComponents).flat();
    const usedComponents = Array.from(this.componentUsage.keys());
    const unusedComponents = allComponents.filter(comp => !usedComponents.includes(comp));

    // Categorize used components
    const categories: DaisyUIComponentStats['categories'] = {};

    Object.entries(this.daisyUIComponents).forEach(([category, components]) => {
      const usedInCategory = components.filter(comp => usedComponents.includes(comp));
      categories[category] = {
        total: components.length,
        used: usedInCategory.length,
        components: usedInCategory,
      };
    });

    return {
      totalComponents: allComponents.length,
      usedComponents: usedComponents.length,
      unusedComponents,
      componentUsage: Array.from(this.componentUsage.values()).sort((a, b) =>
        b.usageCount - a.usageCount,
      ),
      categories,
    };
  }

  // Get all unused components with their categories
  getUnusedComponentsByCategory(): { [category: string]: string[] } {
    const stats = this.getStats();
    const unusedByCategory: { [category: string]: string[] } = {};

    Object.entries(this.daisyUIComponents).forEach(([category, components]) => {
      const unused = components.filter(comp => !stats.componentUsage.some(usage => usage.component === comp));
      if (unused.length > 0) {
        unusedByCategory[category] = unused;
      }
    });

    return unusedByCategory;
  }

  // Export data for analysis
  exportData(): string {
    const stats = this.getStats();
    return JSON.stringify(stats, null, 2);
  }

  // Import data (for persistence)
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.componentUsage && Array.isArray(parsed.componentUsage)) {
        this.componentUsage.clear();
        parsed.componentUsage.forEach((usage: ComponentUsage) => {
          this.componentUsage.set(usage.component, usage);
        });
      }
    } catch (error) {
      console.error('Failed to import DaisyUI tracking data:', error);
    }
  }

  // Clear all tracking data
  clearData(): void {
    this.componentUsage.clear();
  }

  // Get component suggestions based on unused components
  getSuggestions(): { component: string; category: string; suggestedUse: string }[] {
    const unusedByCategory = this.getUnusedComponentsByCategory();
    const suggestions: { component: string; category: string; suggestedUse: string }[] = [];

    // Define suggested uses for common unused components
    const suggestedUses: { [key: string]: string } = {
      'artboard': 'For responsive design testing and demonstrations',
      'bottom-nav': 'For mobile navigation patterns',
      'chat': 'For messaging interfaces or AI chatbots',
      'chat-bubble': 'For individual message display in chat interfaces',
      'collapse': 'For expandable content sections or FAQs',
      'drawer': 'For slide-out navigation panels',
      'hero': 'For landing page headers and featured content',
      'mockup': 'For device frame demonstrations',
      'phone': 'For mobile app showcases',
      'radial-progress': 'For circular progress indicators',
      'swap': 'For toggle states or on/off switches',
      'timeline': 'For process visualization or event history',
      'window': 'For desktop app demonstrations',
    };

    Object.entries(unusedByCategory).forEach(([category, components]) => {
      components.forEach(component => {
        suggestions.push({
          component,
          category,
          suggestedUse: suggestedUses[component] || `Consider using ${component} for enhanced UI functionality`,
        });
      });
    });

    return suggestions.sort((a, b) => a.component.localeCompare(b.component));
  }
}

// Create singleton instance
export const daisyUITracker = new DaisyUIComponentTracker();

// Convenience function for tracking
export const trackDaisyUIComponent = (component: string, uri: string, purpose: string): void => {
  daisyUITracker.trackComponent(component, uri, purpose);
};

// Types for external use
export type { ComponentUsage, DaisyUIComponentStats };