/**
 * Dependency Injection Module
 *
 * Re-export the DI container and utilities for convenient importing.
 */

export {
  container,
  TOKENS,
  resetContainer,
  registerSingleton,
  registerTransient,
  registerInstance,
  resolve,
  isRegistered,
} from './container';
