import fs from 'fs';
import path from 'path';
import { providerRegistry } from './registries/ProviderRegistry';
import { SwarmInstaller } from './integrations/openswarm/SwarmInstaller';
import { IProvider } from './types/IProvider';

export async function initProviders(): Promise<void> {
  const providersDir = path.join(__dirname, 'providers');

  // Register Tool Installers (still manual as they are in integrations)
  providerRegistry.registerInstaller(new SwarmInstaller());

  // Dynamic Provider Loading
  if (!fs.existsSync(providersDir)) {
    console.warn('Providers directory not found:', providersDir);
    return;
  }

  const files = await fs.promises.readdir(providersDir);
  for (const file of files) {
    // Skip definition files and tests
    if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts') && !file.includes('.test.')) {
      const filePath = path.join(providersDir, file);
      try {
        // Dynamic import
        const module = await import(filePath);

        // Iterate exports to find IProvider implementations
        for (const exportName in module) {
          const ExportedClass = module[exportName];

          // Check if it's a class (function/constructor)
          if (typeof ExportedClass === 'function' && ExportedClass.prototype) {
             try {
                 // Attempt to instantiate to check if it matches the interface
                 // This assumes providers have 0-argument constructors
                 const instance = new ExportedClass();
                 if (isProvider(instance)) {
                     // console.log(`Registering provider: ${instance.id} (${instance.type}) from ${file}`);
                     providerRegistry.register(instance);
                 }
             } catch (e) {
                 // Not a provider class or instantiation failed
             }
          }
        }
      } catch (err) {
        console.error(`Failed to load provider from ${file}:`, err);
      }
    }
  }
}

function isProvider(obj: any): obj is IProvider {
    return obj &&
        typeof obj.id === 'string' &&
        typeof obj.label === 'string' &&
        (obj.type === 'messenger' || obj.type === 'llm') &&
        typeof obj.getSchema === 'function' &&
        typeof obj.getConfig === 'function';
}
