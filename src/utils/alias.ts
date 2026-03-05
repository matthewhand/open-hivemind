// This file must be imported before any other imports that use path aliases
// so that module-alias can register the paths.
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
  try {
    require('module-alias/register');
  } catch (e) {
    // Ignore if module-alias is not found (e.g. in some dev setups)
    // although it should be there in production.
  }
}
