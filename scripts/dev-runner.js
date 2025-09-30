#!/usr/bin/env node

/**
 * Bootstraps the TypeScript backend in development mode.
 * Registers ts-node and tsconfig-paths before loading the app entrypoint.
 */
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Ensure TypeScript execution with path alias support
require('ts-node/register');
require('tsconfig-paths/register');

// Load the main server entrypoint
require('../src/index.ts');
