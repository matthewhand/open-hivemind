const fs = require('fs');

let chatPagePath = 'src/client/src/pages/ChatPage.tsx';
let chatPageContent = fs.readFileSync(chatPagePath, 'utf8');

// Add the missing error state declaration
chatPageContent = chatPageContent.replace(
  'const [loading, setLoading] = useState(false);',
  'const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);'
);

// Properly set error during fetch
chatPageContent = chatPageContent.replace(
  'const fetchBots = async () => {\n    try {\n      setLoading(true);',
  'const fetchBots = async () => {\n    try {\n      setLoading(true);\n      setError(null);'
);

chatPageContent = chatPageContent.replace(
  /} catch \(_error\) {\n      toastError\('Failed to load active bots'\);\n    } finally {/g,
  '} catch (_error) {\n      toastError(\'Failed to load active bots\');\n      setError(String(_error));\n    } finally {'
);

fs.writeFileSync(chatPagePath, chatPageContent, 'utf8');
console.log('Fixed error state in ChatPage.tsx');
