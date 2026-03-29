import { API, FileInfo, Options } from 'jscodeshift';
import * as path from 'path';

export default function transformer(file: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  let hasModifications = false;

  // Find res.json(...)
  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: { name: 'json' }
    }
  }).forEach(nodePath => {
    let isResJson = false;
    let isResStatusJson = false;

    if (
      nodePath.node.callee.type === 'MemberExpression' &&
      nodePath.node.callee.object.type === 'Identifier' &&
      nodePath.node.callee.object.name === 'res'
    ) {
      isResJson = true;
    }

    if (
      nodePath.node.callee.type === 'MemberExpression' &&
      nodePath.node.callee.object.type === 'CallExpression' &&
      nodePath.node.callee.object.callee.type === 'MemberExpression' &&
      nodePath.node.callee.object.callee.object.type === 'Identifier' &&
      nodePath.node.callee.object.callee.object.name === 'res' &&
      nodePath.node.callee.object.callee.property.type === 'Identifier' &&
      nodePath.node.callee.object.callee.property.name === 'status'
    ) {
      isResStatusJson = true;
    }

    if (isResJson || isResStatusJson) {
      const args = nodePath.node.arguments;
      if (args.length === 1) {
        if (
          args[0].type === 'CallExpression' &&
          args[0].callee.type === 'MemberExpression' &&
          args[0].callee.object.type === 'Identifier' &&
          args[0].callee.object.name === 'ApiResponse'
        ) {
          return;
        }

        const obj = args[0];
        let isError = false;
        let errorMessage = null;
        let details = null;
        let successMessage = null;
        let successData = obj;
        let statusCode = 200;

        if (isResStatusJson) {
           const statusCall = nodePath.node.callee.object;
           if (statusCall.arguments.length > 0 && statusCall.arguments[0].type === 'Literal') {
             statusCode = statusCall.arguments[0].value;
           } else {
             statusCode = 500;
           }
        }

        if (obj.type === 'ObjectExpression') {
          const properties = obj.properties;

          const errorPropIndex = properties.findIndex(p =>
            p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'error'
          );

          if (errorPropIndex !== -1 || statusCode >= 400) {
            isError = true;

            const msgPropIndex = properties.findIndex(p =>
              p.type === 'Property' && p.key.type === 'Identifier' && (p.key.name === 'message' || p.key.name === 'error')
            );

            if (msgPropIndex !== -1) {
              errorMessage = properties[msgPropIndex].value;
              const otherProps = properties.filter((_, i) => i !== msgPropIndex && !(properties[i].type === 'Property' && properties[i].key.type === 'Identifier' && properties[i].key.name === 'success'));
              if (otherProps.length > 0) {
                details = j.objectExpression(otherProps);
              }
            } else {
              errorMessage = j.literal('An error occurred');
              details = obj;
            }
          } else {
            // Success response
            const msgPropIndex = properties.findIndex(p =>
              p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'message'
            );
            const dataPropIndex = properties.findIndex(p =>
              p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'data'
            );

            const otherProps = properties.filter(p => !(p.type === 'Property' && p.key.type === 'Identifier' && p.key.name === 'success'));

            if (msgPropIndex !== -1) {
               successMessage = properties[msgPropIndex].value;

               if (dataPropIndex !== -1) {
                  successData = properties[dataPropIndex].value;
               } else {
                  const dataProps = otherProps.filter(p => p !== properties[msgPropIndex]);
                  if (dataProps.length > 0) {
                     successData = j.objectExpression(dataProps);
                  } else {
                     successData = j.objectExpression([]);
                  }
               }
            } else if (dataPropIndex !== -1 && otherProps.length === 1) {
               successData = properties[dataPropIndex].value;
            } else {
               successData = j.objectExpression(otherProps);
            }
          }
        } else if (statusCode >= 400) {
          isError = true;
          errorMessage = j.literal('An error occurred');
          details = obj;
        } else {
          successData = obj;
        }

        hasModifications = true;

        let newCall;
        if (isError) {
           const callArgs = [errorMessage];
           if (details && details.properties && details.properties.length > 0) {
              callArgs.push(details);
           } else if (details && details.type !== 'ObjectExpression') {
              callArgs.push(details);
           }
           newCall = j.callExpression(
             j.memberExpression(j.identifier('ApiResponse'), j.identifier('error')),
             callArgs
           );
        } else {
           const callArgs = [successData];
           if (successMessage) callArgs.push(successMessage);
           newCall = j.callExpression(
             j.memberExpression(j.identifier('ApiResponse'), j.identifier('success')),
             callArgs
           );
        }

        nodePath.node.arguments = [newCall];
      }
    }
  });

  if (hasModifications) {
    const rootPath = path.resolve(process.cwd(), 'src/server/utils/apiResponse');
    let relativePath = path.relative(path.dirname(file.path), rootPath).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

    // strip the .ts extension from relativePath if it's there
    if (relativePath.endsWith('.ts')) relativePath = relativePath.slice(0, -3);

    const existingImports = root.find(j.ImportDeclaration, {
      source: { value: relativePath }
    });
    if (existingImports.length === 0) {
      const importDecl = j.importDeclaration(
        [j.importSpecifier(j.identifier('ApiResponse'))],
        j.literal(relativePath)
      );

      const firstImport = root.find(j.ImportDeclaration).at(0);
      if (firstImport.length > 0) {
        firstImport.insertBefore(importDecl);
      } else {
        root.get().node.program.body.unshift(importDecl);
      }
    }

    return root.toSource({ quote: 'single' });
  }

  return root.toSource();
}
