// Path aliases are resolved by tsx via tsconfig.json paths in every supported
// runtime (dev, test, production Docker image — all run tsx against src/).
// module-alias used to be registered here for NODE_ENV=production, but it
// remapped @src to the unmaintained dist/ tree and crashed any production
// run (e.g. the Docker image) with MODULE_NOT_FOUND. The dist/ runtime is
// not supported; this module is kept only so the import order in index.ts
// stays stable.
export {};
