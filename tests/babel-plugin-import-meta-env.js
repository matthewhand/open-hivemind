/**
 * Custom Babel plugin that transforms `import.meta.env` references into
 * `process.env` so that Jest (which runs in CommonJS/Node) can evaluate
 * Vite-style environment access without throwing a SyntaxError.
 *
 * Covers patterns like:
 *   import.meta.env.DEV        -> process.env.DEV
 *   import.meta.env.VITE_FOO   -> process.env.VITE_FOO
 *   import.meta.env             -> process.env
 */
module.exports = function ({ types: t }) {
  return {
    visitor: {
      MetaProperty(path) {
        // Match `import.meta`
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          const parent = path.parentPath;
          // Match `import.meta.env` (MemberExpression with property `env`)
          if (parent.isMemberExpression() && parent.node.property.name === 'env') {
            // Replace `import.meta.env` with `process.env`
            parent.replaceWith(t.memberExpression(t.identifier('process'), t.identifier('env')));
          }
        }
      },
    },
  };
};
