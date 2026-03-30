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

  // Fix any status 2xx that got turned into ApiResponse.error
  content = content.replace(/res\.status\((HTTP_STATUS\.OK|HTTP_STATUS\.CREATED|200|201)\)\.json\(\s*ApiResponse\.error\(([^)]*)\)\s*\)/g, (match, status, args) => {
     // Wait, if it's OK/CREATED it shouldn't be ApiResponse.error unless it's a "soft" error or just a bug in regex
     // Let's assume bug in regex:
     // If the args is a string, and no details, then it's wrong.
     // But wait! If it's a bug in regex, it might look like `ApiResponse.error('Guard profile created successfully', undefined, { success: true, ... })`
     // We need to parse that back to success.

     // Let's just do a simpler replacement for the known signature: `ApiResponse.error(STR, undefined, OBJ)` -> `ApiResponse.success(OBJ)`
     // But regexes might fail here due to nested braces. Let's write a simple loop over the file content
     return match; // fallback
  });

  // More robust approach for `res.status(HTTP_STATUS.OK).json(ApiResponse.error(...))`
  // Just find `res.status(OK_STATUS).json(ApiResponse.error(msg, undefined, { ... }))` and replace with `res.status(OK_STATUS).json(ApiResponse.success({ ... }))`
  content = content.replace(/res\.status\(([^)]+)\)\.json\(\s*ApiResponse\.error\([^,]+,\s*undefined,\s*(\{[\s\S]*?\})\s*\)\s*\)/g, (match, status, obj) => {
      if (status.includes('OK') || status.includes('CREATED') || status.includes('200') || status.includes('201') || status.includes('202')) {
          return `res.status(${status}).json(ApiResponse.success(${obj}))`;
      }
      return match;
  });

  // The reviewer said "HTTP 404 statuses or dynamic error status codes ... were incorrectly wrapped in ApiResponse.success()"
  // I already fixed that in the previous run, but let's double check there are no `res.status(404).json(ApiResponse.success(...))`
  content = content.replace(/res\.status\(([^)]+)\)\.json\(\s*ApiResponse\.success\(\s*(\{[\s\S]*?\})\s*\)\s*\)/g, (match, status, obj) => {
      if (status.includes('400') || status.includes('401') || status.includes('403') || status.includes('404') || status.includes('500') ||
          status.includes('BAD_REQUEST') || status.includes('UNAUTHORIZED') || status.includes('FORBIDDEN') || status.includes('NOT_FOUND') || status.includes('INTERNAL_SERVER_ERROR')) {

          let extractedError = "'An error occurred'";
          const errorMatch = obj.match(/error:\s*('[^']+'|"[^"]+"|`[^`]+`|[a-zA-Z0-9_]+)/);
          if (errorMatch) {
              extractedError = errorMatch[1];
          } else {
             const messageMatch = obj.match(/message:\s*('[^']+'|"[^"]+"|`[^`]+`|[a-zA-Z0-9_]+)/);
             if (messageMatch) {
                 extractedError = messageMatch[1];
             }
          }
          return `res.status(${status}).json(ApiResponse.error(${extractedError}, undefined, ${obj}))`;
      }
      return match;
  });

  fs.writeFileSync(file, content);
}
console.log('Fixed successes');
