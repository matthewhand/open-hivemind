import fs from 'fs';
import path from 'path';
import { providerRegistry } from './registries/ProviderRegistry';
import { SwarmInstaller } from './integrations/openswarm/SwarmInstaller';
import { IProvider } from './types/IProvider';

export async function initProviders(): Promise<void> {
  const providersDir = path.join(__dirname, 'providers');

  if (fs.existsSync(providersDir)) {
    const files = await fs.promises.readdir(providersDir);

    for (const file of files) {
      if (
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.endsWith('.d.ts') &&
        !file.includes('.test.') &&
        !file.includes('.spec.')
      ) {
        const filePath = path.join(providersDir, file);
        try {
          // Dynamic import
          const module = await import(filePath);

          // Iterate exports to find IProvider implementations
          for (const key in module) {
            const ExportedClass = module[key];
            // Check if it's a class (constructor function)
            if (typeof ExportedClass === 'function' && ExportedClass.prototype) {
              try {
                // Attempt to instantiate
                // We assume provider classes have 0-argument constructors
                const instance = new ExportedClass();
                if (isProvider(instance)) {
                  providerRegistry.register(instance);
                }
              } catch (e) {
                // If instantiation fails (e.g. requires arguments), it's likely not a provider we can auto-load
                // or it's not a provider class at all.
              }
            }
          }
        } catch (e) {
          console.error(`Failed to load provider from ${file}`, e);
        }
      }
    }
  }

  // Register Tool Installers
  providerRegistry.registerInstaller(new SwarmInstaller());
}

function isProvider(obj: any): obj is IProvider {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.label === 'string' &&
    (obj.type === 'messenger' || obj.type === 'llm') &&
    typeof obj.getSchema === 'function' &&
    typeof obj.getConfig === 'function'
  );
}
