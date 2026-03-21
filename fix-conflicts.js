const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // This simplistic regex replaces conflict markers.
  // It specifically prefers the "origin" (REPLACE) block in typical `<<< HEAD ... === ... >>> origin` format.
  // However, looking at the backend routes, they often just have:
  // <<<<<<< HEAD
  //   logger.error('Failed...', { error: error.message });
  //   return res.status(500).json({ error: 'Failed...' });
  // =======
  //   return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: error.message });
  // >>>>>>> origin/...
  // We want to KEEP the bottom block (origin) because it uses HTTP_STATUS constants which is the newer code.

  const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>>[^\n]*\n/g;

  let matchCount = 0;
  const newContent = content.replace(conflictRegex, (match, headBlock, originBlock) => {
    matchCount++;
    return originBlock; // keep the new standard
  });

  if (matchCount > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed ${matchCount} conflicts in ${filePath}`);
  }
}

['src/server/routes/personas.ts', 'src/server/routes/health.ts', 'src/server/routes/bots.ts'].forEach(fixFile);
