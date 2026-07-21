export interface GuardProfile {
  id: string;
  name: string;
  description?: string;
  guards: {
    mcpGuard: { enabled: boolean; type: 'owner' | 'custom'; allowedUsers?: string[]; allowedTools?: string[] };
    rateLimit?: { enabled: boolean; maxRequests: number; windowMs: number };
    contentFilter?: { enabled: boolean; strictness: 'low' | 'medium' | 'high'; blockedTerms?: string[] };
  };
  createdAt?: string;
  updatedAt?: string;
}
