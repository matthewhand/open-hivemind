import fs from 'fs';
import path from 'path';
import { providerRegistry } from './registries/ProviderRegistry';
import { SwarmInstaller } from './integrations/openswarm/SwarmInstaller';

export async function initProviders() {
  const providersDir = path.join(__dirname, 'providers');

  if (fs.existsSync(providersDir)) {
      const files = await fs.promises.readdir(providersDir);
      for (const file of files) {
          // Filter for .ts and .js files, excluding definition files and tests
          if ((file.endsWith('.ts') || file.endsWith('.js')) &&
              !file.endsWith('.d.ts') &&
              !file.endsWith('.test.ts') &&
              !file.endsWith('.spec.ts')) {

              const filePath = path.join(providersDir, file);
              try {
                  // Dynamic import
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  const module = await import(filePath);

                  // Find exported class that looks like a provider
                  for (const key in module) {
                      const ExportedClass = module[key];
                      if (typeof ExportedClass === 'function' && ExportedClass.prototype) {
                          // Instantiate to check properties
                          // We assume provider classes have a no-argument constructor
                          try {
                              const instance = new ExportedClass();

                              // Duck typing check for IProvider
                              // Must have id, type, and getConfig method
                              if (instance.id &&
                                  instance.type &&
                                  typeof instance.getConfig === 'function' &&
                                  typeof instance.getSchema === 'function') {

                                  providerRegistry.register(instance);
                                  // console.log(`Registered provider: ${instance.id} from ${file}`);
                              }
                          } catch (e) {
                              // Ignore instantiation errors (e.g. requires args, or abstract class)
                          }
                      }
                  }
              } catch (e) {
                  console.error(`Failed to load provider from ${file}`, e);
              }
          }
      }
  } else {
      console.warn(`Providers directory not found at ${providersDir}`);
  }

  // Register Tool Installers
  // These are currently manual as they reside in integrations/
  providerRegistry.registerInstaller(new SwarmInstaller());
}
