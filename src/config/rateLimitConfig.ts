/**
 * Rate Limiting Configuration
 * Defines all rate limiting policies for the application
 */

interface RateLimitConfig {
  // Default rate limit: 100 requests per 15 minutes
  default: {
    windowMs: number;
    max: number;
  };
  
  // Configuration endpoint rate limit: 10 requests per 5 minutes
  config: {
    windowMs: number;
    max: number;
  };
  
  // Authentication rate limit: 5 attempts per hour
  auth: {
    windowMs: number;
    max: number;
  };
  
  // Admin operations rate limit: 20 requests per 15 minutes
  admin: {
    windowMs: number;
    max: number;
  };
  
  // Redis connection configuration
  redis: {
    url: string;
    prefix: string;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
    enableOfflineQueue: boolean;
  };
}

const rateLimitConfig: RateLimitConfig = {
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  config: {
    windowMs: 5 * 60 * 100, // 5 minutes
    max: 10
  },
  auth: {
    windowMs: 60 * 1000, // 1 hour
    max: 5
  },
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: 'rate_limit:',
    retryDelayOnFailover: 200,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false
  }
};

export default rateLimitConfig;