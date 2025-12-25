import type { ComponentType} from 'react';
import { lazy, Suspense } from 'react';
import React from 'react';

// Types for dynamic integration components
export interface IntegrationUIComponent {
  id: string;
  name: string;
  description?: string;
  category: 'bot' | 'provider' | 'analytics' | 'utility';
  component: ComponentType<any>;
  enabled: boolean;
  requiredProviders?: string[];
  icon?: string;
}

export interface IntegrationManifest {
  id: string;
  name: string;
  description?: string;
  version: string;
  category: 'bot' | 'provider' | 'analytics' | 'utility';
  enabled: boolean;
  requiredProviders?: string[];
  dependencies?: string[];
  ui?: {
    components?: {
      [componentId: string]: {
        path: string;
        name: string;
        description?: string;
        icon?: string;
      };
    };
  };
}

/**
 * Dynamic Integration Loader
 *
 * This class handles discovering and loading UI components from integration directories.
 * Each integration can expose a manifest.json file that describes its UI components.
 */
export class IntegrationLoader {
  private static instance: IntegrationLoader;
  private loadedIntegrations: Map<string, IntegrationUIComponent[]> = new Map();
  private manifestCache: Map<string, IntegrationManifest> = new Map();

  private constructor() {}

  public static getInstance(): IntegrationLoader {
    if (!IntegrationLoader.instance) {
      IntegrationLoader.instance = new IntegrationLoader();
    }
    return IntegrationLoader.instance;
  }

  /**
   * Discover all integrations and their UI components
   */
  public async discoverIntegrations(): Promise<IntegrationUIComponent[]> {
    const allComponents: IntegrationUIComponent[] = [];

    try {
      // Get list of integration directories
      const integrations = await this.getIntegrationDirectories();

      for (const integrationId of integrations) {
        try {
          const components = await this.loadIntegrationComponents(integrationId);
          allComponents.push(...components);
        } catch (error) {
          console.warn(`Failed to load components for integration ${integrationId}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to discover integrations:', error);
    }

    return allComponents;
  }

  /**
   * Get available integration directories
   */
  private async getIntegrationDirectories(): Promise<string[]> {
    // For now, return known integrations
    // In a real implementation, this could scan the filesystem
    return [
      'discord',
      'slack',
      'telegram',
      'openai',
      'flowise',
      'mattermost',
      'openwebui',
      'openswarm',
    ];
  }

  /**
   * Load UI components for a specific integration
   */
  private async loadIntegrationComponents(integrationId: string): Promise<IntegrationUIComponent[]> {
    const components: IntegrationUIComponent[] = [];

    try {
      // Try to load manifest
      const manifest = await this.loadIntegrationManifest(integrationId);

      if (manifest.ui?.components) {
        for (const [componentId, componentInfo] of Object.entries(manifest.ui.components)) {
          try {
            const component = await this.loadComponent(integrationId, componentInfo.path);

            components.push({
              id: `${integrationId}.${componentId}`,
              name: componentInfo.name,
              description: componentInfo.description,
              category: manifest.category,
              component,
              enabled: manifest.enabled,
              requiredProviders: manifest.requiredProviders,
              icon: componentInfo.icon,
            });
          } catch (componentError) {
            console.warn(`Failed to load component ${componentId} for integration ${integrationId}:`, componentError);
          }
        }
      }

      // If no manifest exists, try to auto-discover components
      if (!manifest.ui?.components) {
        const autoComponents = await this.autoDiscoverComponents(integrationId);
        components.push(...autoComponents);
      }

    } catch (error) {
      console.warn(`Failed to load integration ${integrationId}:`, error);
    }

    return components;
  }

  /**
   * Load integration manifest file
   */
  private async loadIntegrationManifest(integrationId: string): Promise<IntegrationManifest> {
    if (this.manifestCache.has(integrationId)) {
      return this.manifestCache.get(integrationId)!;
    }

    try {
      // Try to import manifest from the integration directory
      // This is a simplified approach - in production you'd want proper file system access
      const manifestPath = `@integrations/${integrationId}/manifest.json`;

      // Default manifest for integrations without explicit manifests
      const defaultManifest: IntegrationManifest = {
        id: integrationId,
        name: this.capitalizeFirst(integrationId),
        description: `${this.capitalizeFirst(integrationId)} integration`,
        version: '1.0.0',
        category: 'bot',
        enabled: true,
        ui: {},
      };

      // For now, return default manifest
      // In a real implementation, you'd fetch and parse the actual manifest.json
      this.manifestCache.set(integrationId, defaultManifest);
      return defaultManifest;

    } catch (error) {
      // Return default manifest on error
      const defaultManifest: IntegrationManifest = {
        id: integrationId,
        name: this.capitalizeFirst(integrationId),
        description: `${this.capitalizeFirst(integrationId)} integration`,
        version: '1.0.0',
        category: 'bot',
        enabled: true,
        ui: {},
      };

      this.manifestCache.set(integrationId, defaultManifest);
      return defaultManifest;
    }
  }

  /**
   * Auto-discover UI components in an integration directory
   */
  private async autoDiscoverComponents(integrationId: string): Promise<IntegrationUIComponent[]> {
    const components: IntegrationUIComponent[] = [];

    try {
      // Try to import common UI component patterns
      const commonComponentPaths = [
        'ui/Configuration',
        'ui/Settings',
        'ui/Dashboard',
        'ui/Status',
        'Configuration',
        'Settings',
        'Dashboard',
        'Status',
      ];

      for (const componentPath of commonComponentPaths) {
        try {
          const component = await this.loadComponent(integrationId, componentPath);

          components.push({
            id: `${integrationId}.${componentPath.split('/').pop()}`,
            name: `${this.capitalizeFirst(integrationId)} ${componentPath.split('/').pop()}`,
            description: `${this.capitalizeFirst(integrationId)} ${componentPath.split('/').pop()} component`,
            category: 'bot',
            component,
            enabled: true,
          });
        } catch (componentError) {
          // Component doesn't exist, skip it
        }
      }

    } catch (error) {
      console.warn(`Failed to auto-discover components for integration ${integrationId}:`, error);
    }

    return components;
  }

  /**
   * Dynamically load a React component from an integration
   */
  private async loadComponent(integrationId: string, componentPath: string): Promise<ComponentType<any>> {
    try {
      // Try to dynamically import the component
      const modulePath = `../../integrations/${integrationId}/${componentPath}`;

      // Use dynamic import for code splitting
      const componentModule = await import(/* @vite-ignore */ modulePath);

      // Check if the module exports a default component
      if (componentModule.default && typeof componentModule.default === 'function') {
        return componentModule.default;
      }

      // Check if the module exports named components
      const componentName = componentPath.split('/').pop();
      if (componentModule[componentName!] && typeof componentModule[componentName!] === 'function') {
        return componentModule[componentName!];
      }

      throw new Error(`No valid component found in ${modulePath}`);

    } catch (error) {
      throw new Error(`Failed to load component ${componentPath} from integration ${integrationId}: ${error}`);
    }
  }

  /**
   * Get loaded components for a specific integration
   */
  public getIntegrationComponents(integrationId: string): IntegrationUIComponent[] {
    return this.loadedIntegrations.get(integrationId) || [];
  }

  /**
   * Get all loaded components filtered by category
   */
  public getComponentsByCategory(category: IntegrationUIComponent['category']): IntegrationUIComponent[] {
    const allComponents: IntegrationUIComponent[] = [];

    for (const components of this.loadedIntegrations.values()) {
      allComponents.push(...components.filter(c => c.category === category));
    }

    return allComponents;
  }

  /**
   * Refresh integration components (reload manifests and components)
   */
  public async refreshIntegrations(): Promise<IntegrationUIComponent[]> {
    this.loadedIntegrations.clear();
    this.manifestCache.clear();
    return await this.discoverIntegrations();
  }

  /**
   * Helper method to capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

/**
 * Higher-order component for lazy loading integration components with error handling
 */
export function LazyIntegrationComponent({
  integrationId,
  componentPath,
  fallback = <div className="loading">Loading integration component...</div>,
  onError = (error: Error) => <div className="error">Failed to load component: {error.message}</div>,
}: {
  integrationId: string;
  componentPath: string;
  fallback?: React.ReactNode;
  onError?: (error: Error) => React.ReactNode;
}) {
  const LazyComponent = lazy(() =>
    IntegrationLoader.getInstance()
      .loadComponent(integrationId, componentPath)
      .catch(error => {
        console.error(`Failed to load integration component ${integrationId}.${componentPath}:`, error);
        // Return a simple error component
        return {
          default: () => onError(error instanceof Error ? error : new Error('Unknown error')),
        };
      }),
  );

  return (
    <Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>
  );
}

/**
 * Hook for using integration components in React components
 */
export function useIntegrationComponents() {
  const [components, setComponents] = React.useState<IntegrationUIComponent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const loadComponents = async () => {
      try {
        setLoading(true);
        setError(null);
        const loader = IntegrationLoader.getInstance();
        const discoveredComponents = await loader.discoverIntegrations();
        setComponents(discoveredComponents);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load integration components'));
      } finally {
        setLoading(false);
      }
    };

    loadComponents();
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loader = IntegrationLoader.getInstance();
      const refreshedComponents = await loader.refreshIntegrations();
      setComponents(refreshedComponents);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh integration components'));
    } finally {
      setLoading(false);
    }
  }, []);

  const getComponentsByCategory = React.useCallback((category: IntegrationUIComponent['category']) => {
    return components.filter(c => c.category === category);
  }, [components]);

  const getComponentById = React.useCallback((id: string) => {
    return components.find(c => c.id === id);
  }, [components]);

  return {
    components,
    loading,
    error,
    refresh,
    getComponentsByCategory,
    getComponentById,
  };
}

export default IntegrationLoader;