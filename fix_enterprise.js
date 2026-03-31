const fs = require('fs');

const file = 'src/server/routes/enterprise.ts';
let content = fs.readFileSync(file, 'utf8');

// There are some incorrectly formed error messages where success: false was stripped but the rest was left as success envelope.
// Let's fix those by manually doing regex replacements on the bad patterns.

// Pattern to fix: `.json(ApiResponse.success({\n      message: '...', \n      error: ... \n  }));`

let regex = /\.json\(ApiResponse\.success\(\{\s*message:\s*([^,]+),\s*error:\s*([^\}]+?)\s*\}\)\)/g;

content = content.replace(regex, (match, msg, err) => {
    // We want to extract the actual error or use the message.
    // the previous JSON was:
    // {
    //    success: false,
    //    message: 'Failed to...',
    //    error: error instanceof Error ? error.message : 'Unknown error',
    // }
    // The ApiResponse.error() takes error: string, code?: string, details?: any.
    // so we can do ApiResponse.error(msg, undefined, { error: err })
    // wait, ApiResponse.error signature: `error(message: string, code?: string, details?: unknown)`
    // So `ApiResponse.error(${msg}, undefined, ${err})` or simply `ApiResponse.error(${msg})`?
    // Let's keep it as `ApiResponse.error(${msg}, undefined, ${err})` for fidelity.

    return `.json(ApiResponse.error(${msg.trim()}, undefined, ${err.trim()}))`;
});

// There may also be instances of `.json(ApiResponse.success({\n      message: '...',\n      details: ...\n  }));` if it was an error.
// We can just rely on the fact that if it's returning HTTP_STATUS.INTERNAL_SERVER_ERROR or BAD_REQUEST, we probably want an error payload.

fs.writeFileSync(file, content);
console.log('Processed enterprise');
