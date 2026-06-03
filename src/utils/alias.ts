// This file must be imported before any other imports that use path aliases
// so that module-alias can register the paths.
//
// IMPORTANT: Only register in production (compiled dist/).
// In development and test, tsx handles TypeScript path aliases natively via
// tsconfig.json paths, so pointing to dist/ would cause MODULE_NOT_FOUND errors.
if (process.env.NODE_ENV === 'production') {
  try {
    require('module-alias/register');
  } catch {
    // Ignore if module-alias is not found
  }
}
