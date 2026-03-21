/* eslint-disable react-refresh/only-export-components, no-case-declarations */
import type { ComponentType } from 'react';
import { lazy, Suspense } from 'react';
import React from 'react';
import logger from '../utils/logger';

// Types for dynamic integration components
export interface IntegrationUIComponent {
  id: string;
  name: string;
  description?: string;
  category: 'bot' | 'provider' | 'analytics' | 'utility';
  component: ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
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

      const integrationPromises = integrations.map(async (integrationId) => {
        try {
          return await this.loadIntegrationComponents(integrationId);
        } catch (error) {
          Logger.warn(`Failed to load components for integration ${integrationId}:`, error);
          return [];
        }
      });

      const results = await Promise.all(integrationPromises);
      results.forEach((components) => allComponents.push(...components));
    } catch (error) {
      logger.error('Failed to discover integrations:', error);
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
        const componentPromises = Object.entries(manifest.ui.components).map(
          async ([componentId, componentInfo]) => {
            try {
              const component = await this.loadComponent(integrationId, componentInfo.path);

              return {
                id: `${integrationId}.${componentId}`,
                name: componentInfo.name,
                description: componentInfo.description,
                category: manifest.category,
                component,
                enabled: manifest.enabled,
                requiredProviders: manifest.requiredProviders,
                icon: componentInfo.icon,
              };
            } catch (componentError) {
              Logger.warn(
                `Failed to load component ${componentId} for integration ${integrationId}:`,
                componentError,
              );
              return null;
            }
          },
        );

        const loadedResults = await Promise.all(componentPromises);
        components.push(...loadedResults.filter((c): c is IntegrationUIComponent => c !== null));
      }

      // If no manifest exists, try to auto-discover components
      if (!manifest.ui?.components) {
        const autoComponents = await this.autoDiscoverComponents(integrationId);
        components.push(...autoComponents);
      }

    } catch (error) {
      logger.warn(`Failed to load integration ${integrationId}:`, error);
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
      logger.debug(`Failed to load manifest for integration ${integrationId}, using default:`, error);
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

      const discoveryPromises = commonComponentPaths.map(async (componentPath) => {
        try {
          const component = await this.loadComponent(integrationId, componentPath);

          return {
            id: `${integrationId}.${componentPath.split('/').pop()}`,
            name: `${this.capitalizeFirst(integrationId)} ${componentPath.split('/').pop()}`,
            description: `${this.capitalizeFirst(integrationId)} ${componentPath.split('/').pop()} component`,
            category: 'bot',
            component,
            enabled: true,
          };
        } catch (_componentError) {
          // Component doesn't exist, skip it
          logger.debug(`Component ${componentPath} not found for integration ${integrationId}`);
          return null;
        }
      });

      const discoveredResults = await Promise.all(discoveryPromises);
      components.push(...discoveredResults.filter((c): c is IntegrationUIComponent => c !== null));

    } catch (error) {
      logger.warn(`Failed to auto-discover components for integration ${integrationId}:`, error);
    }

    return components;
  }

  /**
   * Dynamically load a React component from an integration
   */
  private async loadComponent(integrationId: string, componentPath: string): Promise<ComponentType<any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
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
        logger.error(`Failed to load integration component ${integrationId}.${componentPath}:`, error);
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