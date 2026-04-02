/**
 * API Service — main entry point.
 *
 * Domain-specific methods live in ./api/ sub-modules.
 * This file composes them into a single `apiService` singleton and
 * re-exports every type so that existing imports remain unchanged:
 *
 *   import { apiService, Bot, StatusResponse } from '../services/api';
 */

import { ApiService } from './api/core';
import { botsMixin } from './api/bots';
import { configMixin } from './api/config';
import { personasMixin } from './api/personas';
import { secureConfigsMixin } from './api/secure-configs';
import { monitoringMixin } from './api/monitoring';
import { adminMixin } from './api/admin';
import { authMixin } from './api/auth';

// Re-export every public type so consumers don't need to change imports
export type {
  FieldMetadata,
  BotMetadata,
  DiscordConfig,
  SlackConfig,
  MattermostConfig,
  OpenAIConfig,
  FlowiseConfig,
  OpenWebUIConfig,
  OpenSwarmConfig,
  PerplexityConfig,
  ReplicateConfig,
  N8nConfig,
  Persona,
  ProviderConfig,
  Bot,
  ConfigResponse,
  StatusResponse,
  ConfigFile,
  ConfigOverride,
  ConfigSourcesResponse,
  SecureConfig,
  HotReloadRequest,
  HotReloadResponse,
  ActivityEvent,
  ActivityTimelineBucket,
  ActivityResponse,
  RateLimitInfo,
  RateLimitListener,
} from './api/types';

// Build the composed service by merging the core ApiService instance
// with all domain mixin return values.
const core = new ApiService();

export const apiService = Object.assign(
  core,
  botsMixin(core),
  configMixin(core),
  personasMixin(core),
  secureConfigsMixin(core),
  monitoringMixin(core),
  adminMixin(core),
  authMixin(core),
);
