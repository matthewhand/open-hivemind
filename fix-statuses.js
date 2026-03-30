const fs = require('fs');

const files = [
  'src/server/routes/activity.ts',
  'src/server/routes/agents.ts',
  'src/server/routes/ai-assist.ts',
  'src/server/routes/anomaly.ts',
  'src/server/routes/cache.ts',
  'src/server/routes/ci.ts',
  'src/server/routes/config.ts',
  'src/server/routes/consolidated.ts',
  'src/server/routes/demo.ts',
  'src/server/routes/errors.ts',
  'src/server/routes/guardProfiles.ts',
  'src/server/routes/guards.ts',
  'src/server/routes/health.ts',
  'src/server/routes/hotReload.ts',
  'src/server/routes/importExport.ts',
  'src/server/routes/integrations.ts',
  'src/server/routes/letta.ts',
  'src/server/routes/marketplace.ts',
  'src/server/routes/onboarding.ts',
  'src/server/routes/personas.ts',
  'src/server/routes/providers.ts',
  'src/server/routes/secureConfig.ts',
  'src/server/routes/sitemap.ts',
  'src/server/routes/specs.ts',
  'src/server/routes/usage-tracking.ts',
  'src/server/routes/validation.ts',
  'src/server/routes/webhookEvents.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Find ApiResponse.success(X) calls
  // Ensure that they are actually successes!
  // It's possible some res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.success(X)) occurred

  content = content.replace(/res\.status\(([^)]+)\)\.json\(\s*ApiResponse\.success\(([^)]*)\)\s*\)/g, (match, status, args) => {
      if (status.includes('400') || status.includes('401') || status.includes('403') || status.includes('404') || status.includes('500') ||
          status.includes('BAD_REQUEST') || status.includes('UNAUTHORIZED') || status.includes('FORBIDDEN') || status.includes('NOT_FOUND') || status.includes('INTERNAL_SERVER_ERROR')) {

          // It's an error.
          // If args is an object, extract error message or pass it to details
          if (args.trim().startsWith('{')) {
              let extractedError = "'An error occurred'";
              let details = args;

              // try to find { error: "msg" }
              const errorMatch = args.match(/error:\s*('[^']+'|"[^"]+"|`[^`]+`|[a-zA-Z0-9_]+)/);
              if (errorMatch) {
                  extractedError = errorMatch[1];
              } else {
                 const messageMatch = args.match(/message:\s*('[^']+'|"[^"]+"|`[^`]+`|[a-zA-Z0-9_]+)/);
                 if (messageMatch) {
                     extractedError = messageMatch[1];
                 }
              }
              return `res.status(${status}).json(ApiResponse.error(${extractedError}, undefined, ${details}))`;
          }
          return `res.status(${status}).json(ApiResponse.error('An error occurred', undefined, ${args}))`;
      }
      return match;
  });

  // also handle dynamic status codes where variable names like status, statusCode, err.status are used
  // e.g. res.status(error.status || 500).json(ApiResponse.success(...))
  content = content.replace(/res\.status\(([^)]+)\)\.json\(\s*ApiResponse\.success\(([^)]*)\)\s*\)/g, (match, status, args) => {
     if (status.toLowerCase().includes('statuscode') || status.toLowerCase().includes('status')) {
         // this is highly likely an error handler route
         // But what if it's dynamic? We probably should just look at the args.
         // If args contains 'error', 'message', 'stack', it's an error
         if (args.includes('error:') || args.includes('message:') || args.includes('error.message')) {
            let extractedError = "'An error occurred'";
            const errorMatch = args.match(/error:\s*('[^']+'|"[^"]+"|`[^`]+`|[^,}]+)/);
            if (errorMatch) {
                 extractedError = errorMatch[1].trim();
            } else {
                 const messageMatch = args.match(/message:\s*('[^']+'|"[^"]+"|`[^`]+`|[^,}]+)/);
                 if (messageMatch) {
                     extractedError = messageMatch[1].trim();
                 }
            }
            return `res.status(${status}).json(ApiResponse.error(${extractedError}, undefined, ${args}))`;
         }
     }
     return match;
  });

  fs.writeFileSync(file, content);
}

console.log('Fixed statuses');
