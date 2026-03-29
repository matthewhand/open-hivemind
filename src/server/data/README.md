# Server Data Files

## community-packages.json

This file contains the manifest of available community packages that can be installed via the Marketplace.

### Structure

Each package in the array has the following properties:

```typescript
{
  name: string;              // Package identifier (kebab-case)
  displayName: string;       // Human-readable name
  description: string;       // Package description
  type: 'llm' | 'message' | 'memory' | 'tool' | 'bot' | 'guard' | 'persona';
  version: string;           // Semantic version
  status: 'available';       // Always 'available' for community packages
  repoUrl: string;           // GitHub repository URL
  downloadUrl?: string;      // Direct download URL (optional)
  author?: string;           // Package author/maintainer
  tags?: string[];           // Searchable tags
  requirements?: {           // System requirements
    node?: string;           // Node.js version requirement
  };
}
```

### Package Types

- **llm**: Language model providers (e.g., Claude, Gemini, Cohere)
- **message**: Messaging platform adapters (e.g., WhatsApp, Telegram)
- **memory**: Long-term memory providers (e.g., Pinecone, Qdrant, Weaviate)
- **tool**: Tool integrations (e.g., GitHub, Jira, Notion)
- **bot**: Bot implementations
- **guard**: Security/validation guards
- **persona**: Agent personas

### Adding New Packages

To add a new community package:

1. Add an entry to the `community-packages.json` array
2. Ensure the package follows the structure above
3. Test the JSON is valid: `node -e "require('./community-packages.json')"`
4. Restart the server to invalidate the cache

### Future Enhancements

The `getAvailablePackages()` function in `/src/server/routes/marketplace.ts` includes a note about supporting remote registry URLs. This would allow fetching packages from a centralized registry:

```typescript
// Potential implementation:
const REGISTRY_URL = process.env.REGISTRY_URL || 'https://registry.open-hivemind.com/packages.json';

// Fetch from remote, fall back to local manifest
try {
  const response = await fetch(REGISTRY_URL);
  packages = await response.json();
} catch (e) {
  // Fall back to local manifest
  const manifest = require('./community-packages.json');
  packages = manifest;
}
```

### Cache Behavior

The marketplace route caches package lists for 30 seconds (configurable via `CACHE_TTL_MS`). Changes to this file require either:

- Waiting 30 seconds for cache expiration
- Restarting the server
- Installing/uninstalling a plugin (invalidates cache)
