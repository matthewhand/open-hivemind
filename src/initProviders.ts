import fs from 'fs';
import path from 'path';
import { providerRegistry } from './registries/ProviderRegistry';
import { SwarmInstaller } from './integrations/openswarm/SwarmInstaller';
import { IProvider } from './types/IProvider';

// Helper to check if an object implements IProvider
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

export async function initProviders(): Promise<void> {
  // Use process.cwd() or __dirname?
  // If compiled to dist/, __dirname is dist/src/.
  // src/providers will be dist/src/providers.
  // So __dirname is correct.
  const providersDir = path.join(__dirname, 'providers');

  if (fs.existsSync(providersDir)) {
    const files = await fs.promises.readdir(providersDir);

    for (const file of files) {
      // Filter for .ts and .js files, excluding .d.ts and test files
      if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts') && !file.includes('.test.') && !file.includes('__tests__')) {
        const filePath = path.join(providersDir, file);
        try {
          // Dynamic import
          // In CommonJS/ts-node, require or import() works.
          const module = await import(filePath);

          // Check all exports for provider classes
          let registered = false;
          for (const key of Object.keys(module)) {
             const ExportedItem = module[key];

             // Check if it's a class/constructor function
             if (typeof ExportedItem === 'function' && ExportedItem.prototype) {
                try {
                   // Try to instantiate without arguments
                   const instance = new ExportedItem();
                   if (isProvider(instance)) {
                      // Prevent duplicate registration if multiple exports point to same class?
                      // ProviderRegistry handles overwrites with warning.
                      // Usually one provider per file.
                      providerRegistry.register(instance);
                      registered = true;
                   }
                } catch (e) {
                   // Ignore if instantiation fails (e.g. requires arguments or not a class)
                }
             }
          }

          if (registered) {
             // console.log(`Loaded providers from ${file}`);
          }

        } catch (err) {
          console.error(`Failed to load provider from ${file}:`, err);
        }
      }
    }
  } else {
    console.warn(`Providers directory not found at ${providersDir}`);
  }

  // Register Tool Installers
  // These are currently manually registered as they reside in integrations/ or other locations
  providerRegistry.registerInstaller(new SwarmInstaller());
}
