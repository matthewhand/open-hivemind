const fs = require('fs');
const ts = require('typescript');

function migrateUsingAst(filepath) {
    let sourceText = fs.readFileSync(filepath, 'utf8');

    // Add import statement at top safely
    if (!sourceText.includes("import { ApiResponse }")) {
        sourceText = sourceText.replace("import { validateRequest }", "import { ApiResponse } from '../utils/apiResponse';\nimport { validateRequest }");
        if (!sourceText.includes("import { ApiResponse }")) {
             sourceText = sourceText.replace("import { auditMiddleware", "import { ApiResponse } from '../utils/apiResponse';\nimport { auditMiddleware");
        }
    }

    const sourceFile = ts.createSourceFile(
        filepath,
        sourceText,
        ts.ScriptTarget.Latest,
        true
    );

    const replacements = [];

    function visit(node) {
        // Look for res.status(...).json(...) or res.json(...)
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'json') {
            let statusNum = 200; // default for res.json()
            let isStatusCall = false;

            if (ts.isCallExpression(node.expression.expression) &&
                ts.isPropertyAccessExpression(node.expression.expression.expression) &&
                node.expression.expression.expression.name.text === 'status') {
                isStatusCall = true;
                const statusNode = node.expression.expression.arguments[0];
                if (statusNode) {
                    const statusText = statusNode.getText();
                    if (!isNaN(parseInt(statusText))) {
                        statusNum = parseInt(statusText);
                    } else if (statusText.includes('statusCode')) {
                        statusNum = statusText; // Keep it as string if dynamic
                    }
                }
            }

            const jsonArgs = node.arguments;
            if (jsonArgs.length > 0) {
                const arg = jsonArgs[0];

                // If it's already using ApiResponse, skip
                if (arg.getText().includes('ApiResponse')) {
                    return;
                }

                if (ts.isObjectLiteralExpression(arg)) {
                    const props = arg.properties;
                    let successVal = null;
                    let dataProp = null;
                    let errorProp = null;
                    let messageProp = null;
                    let codeProp = null;
                    let detailsProp = null;

                    props.forEach(p => {
                        if (ts.isPropertyAssignment(p)) {
                            const name = p.name.getText();
                            if (name === 'success') successVal = p.initializer.getText();
                            if (name === 'data') dataProp = p.initializer;
                            if (name === 'error') errorProp = p.initializer.getText();
                            if (name === 'message') messageProp = p.initializer.getText();
                            if (name === 'code') codeProp = p.initializer.getText();
                            if (name === 'details') detailsProp = p.initializer.getText();
                        }
                    });

                    let replacement = null;
                    let isSuccess = (typeof statusNum === 'number' && statusNum < 400) || successVal === 'true';
                    let statusStr = isStatusCall ? `res.status(${statusNum})` : 'res';

                    if (isSuccess) {
                        if (dataProp) {
                            replacement = `${statusStr}.json(ApiResponse.success(${dataProp.getText()}))`;
                        } else {
                            // Collect properties that aren't 'success' or 'message' (since message is often dropped in success)
                            const otherProps = props.filter(p => {
                                if (p.name) {
                                    const n = p.name.getText();
                                    return n !== 'success' && n !== 'message';
                                }
                                return true;
                            });

                            if (otherProps.length > 0) {
                                const objText = '{ ' + otherProps.map(p => p.getText()).join(', ') + ' }';
                                replacement = `${statusStr}.json(ApiResponse.success(${objText}))`;
                            } else {
                                replacement = `${statusStr}.json(ApiResponse.success())`;
                            }
                        }
                    } else {
                        // Error case
                        let errMsg = errorProp || messageProp || "'An error occurred'";
                        if (errorProp && messageProp) {
                           // If it has an error code like "Registration Failed" AND a detailed message, the standard envelope expects one error string. We usually prioritize the detailed message or combine them.
                           // Actually the codebase expects to map these to ApiResponse.error(msg, code, status)
                           // Let's pass the error prop. Some places use `error.message` for `message` and fixed string for `error`.
                           // Usually `message` is the detailed error.
                           if (messageProp.includes('error.message')) {
                              errMsg = messageProp;
                           } else {
                              errMsg = errorProp;
                           }
                        }

                        let codeArg = codeProp ? `, ${codeProp}` : ', undefined';
                        let statusArg = typeof statusNum === 'string' ? `, ${statusNum}` : (statusNum ? `, ${statusNum}` : '');

                        if (codeArg === ', undefined' && !statusArg) codeArg = '';

                        replacement = `${statusStr}.json(ApiResponse.error(${errMsg}${codeArg}${statusArg}))`;
                    }

                    if (replacement) {
                        replacements.push({
                            start: node.getStart(),
                            end: node.getEnd(),
                            text: replacement
                        });
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Apply replacements backwards
    replacements.sort((a, b) => b.start - a.start);
    for (const r of replacements) {
        sourceText = sourceText.substring(0, r.start) + r.text + sourceText.substring(r.end);
    }

    fs.writeFileSync(filepath, sourceText);
    console.log(`Updated ${replacements.length} responses in ${filepath}`);
}

migrateUsingAst('src/server/routes/auth.ts');
migrateUsingAst('src/server/routes/botConfig.ts');
migrateUsingAst('src/server/routes/config.ts');
