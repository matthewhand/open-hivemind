/**
 * Tool Category Inference Utility
 *
 * Infers categories for MCP tools based on their names and descriptions.
 * Supports multiple categories per tool.
 */

export type ToolCategory =
  | 'database'
  | 'filesystem'
  | 'api'
  | 'git'
  | 'computation'
  | 'ai'
  | 'search'
  | 'data'
  | 'monitoring'
  | 'communication'
  | 'security'
  | 'automation'
  | 'utility';

interface CategoryRule {
  category: ToolCategory;
  patterns: RegExp;
}

const categoryRules: CategoryRule[] = [
  {
    category: 'database',
    patterns: /\b(sql|query|database|db|postgres|mysql|mongo|redis|table|insert|update|delete|select|cassandra|dynamodb|firestore)\b/i,
  },
  {
    category: 'filesystem',
    patterns: /\b(file|directory|folder|path|read|write|delete|create|list|fs|disk|upload|download|stat|chmod|move|copy)\b/i,
  },
  {
    category: 'api',
    patterns: /\b(http|https|api|request|fetch|get|post|put|patch|rest|graphql|webhook|url|endpoint|curl)\b/i,
  },
  {
    category: 'git',
    patterns: /\b(git|github|gitlab|commit|branch|pull|push|clone|repository|repo|merge|diff|log|checkout)\b/i,
  },
  {
    category: 'computation',
    patterns: /\b(calculate|compute|process|analyze|transform|convert|parse|eval|math|algorithm|aggregate|sum|average)\b/i,
  },
  {
    category: 'ai',
    patterns: /\b(ai|ml|model|predict|train|inference|llm|gpt|claude|embed|vector|semantic|neural|classification)\b/i,
  },
  {
    category: 'search',
    patterns: /\b(search|find|query|lookup|index|elasticsearch|solr|grep|filter|match)\b/i,
  },
  {
    category: 'data',
    patterns: /\b(data|json|xml|csv|yaml|serialize|deserialize|format|encode|decode|parse|stringify)\b/i,
  },
  {
    category: 'monitoring',
    patterns: /\b(monitor|log|trace|metric|alert|health|status|ping|check|uptime|observe)\b/i,
  },
  {
    category: 'communication',
    patterns: /\b(message|email|sms|slack|discord|notification|send|notify|chat|telegram|whatsapp)\b/i,
  },
  {
    category: 'security',
    patterns: /\b(auth|authenticate|authorize|token|jwt|oauth|security|encrypt|decrypt|hash|password|credential)\b/i,
  },
  {
    category: 'automation',
    patterns: /\b(browser|web|scrape|crawl|selenium|puppeteer|screenshot|dom|html|automate|schedule|cron)\b/i,
  },
];

/**
 * Infer categories for a tool based on its name and description
 *
 * @param name - The tool name
 * @param description - The tool description
 * @returns Array of inferred categories (defaults to ['utility'] if no matches)
 */
export function inferToolCategories(name: string, description: string): ToolCategory[] {
  const categories = new Set<ToolCategory>();
  const combined = `${name.toLowerCase()} ${description.toLowerCase()}`;

  for (const rule of categoryRules) {
    if (rule.patterns.test(combined)) {
      categories.add(rule.category);
    }
  }

  // Default to utility if no specific categories found
  if (categories.size === 0) {
    categories.add('utility');
  }

  return Array.from(categories);
}

/**
 * Get the primary (first) category for a tool
 *
 * @param categories - Array of categories
 * @returns The primary category
 */
export function getPrimaryCategory(categories: ToolCategory[]): ToolCategory {
  return categories[0] || 'utility';
}

/**
 * Get DaisyUI badge color class for a category
 *
 * @param category - The category name
 * @returns DaisyUI badge color class
 */
export function getCategoryColor(category: ToolCategory): string {
  const colors: Record<ToolCategory, string> = {
    git: 'badge-primary',
    database: 'badge-secondary',
    filesystem: 'badge-info',
    api: 'badge-success',
    ai: 'badge-warning',
    utility: 'badge-ghost',
    search: 'badge-accent',
    data: 'badge-info',
    monitoring: 'badge-error',
    communication: 'badge-primary',
    security: 'badge-error',
    automation: 'badge-accent',
    computation: 'badge-warning',
  };
  return colors[category] || 'badge-ghost';
}

/**
 * Get all unique categories from an array of tools
 *
 * @param tools - Array of tools with categories
 * @returns Sorted array of unique categories
 */
export function getAllCategories(tools: Array<{ categories: ToolCategory[] }>): ToolCategory[] {
  const allCategories = new Set<ToolCategory>();

  for (const tool of tools) {
    for (const category of tool.categories) {
      allCategories.add(category);
    }
  }

  return Array.from(allCategories).sort();
}
