import type { FieldMetadata } from '../../services/api';
import type { Bot, StatusResponse } from '../../services/api';
import type { ProviderInfo } from '../../services/providerService';

export interface GuardState {
  enabled: boolean;
  type: 'owner' | 'custom';
  allowedUserIds: string[];
}

export interface BotUIState {
  messageProvider: string;
  llmProvider: string;
  llmProfile: string;
  responseProfile: string;
  mcpGuardProfile: string;
  mcpServerProfile: string;
  persona: string;
  systemInstruction: string;
  mcpServers: string[];
  mcpGuard: GuardState;
}

export interface GuardInputState {
  [botName: string]: string;
}

export interface AgentConfigCardProps {
  bot: Bot;
  metadata: Record<string, FieldMetadata | undefined>;
  uiState: BotUIState | undefined;
  status: StatusResponse['bots'][number] | undefined;
  pending: boolean;
  personaOptions: Array<{ value: string; label: string }>;
  responseProfileOptions: Array<{ value: string; label: string }>;
  mcpServerProfileOptions: Array<{ value: string; label: string; description?: string }>;
  guardrailProfileOptions: Array<{ value: string; label: string; description?: string }>;
  llmProfileOptions: Array<{ value: string; label: string }>;
  messageProviderOptions: Array<{ value: string; label: string }>;
  llmProviderOptions: Array<{ value: string; label: string }>;
  messageProviderInfo: Record<string, ProviderInfo | undefined>;
  llmProviderInfo: Record<string, ProviderInfo | undefined>;
  providersLoading: boolean;
  personasLoading: boolean;
  availableMcpServers: string[];
  guardOptions: Array<{ value: GuardState['type']; label: string }>;
  guardInput: string;
  onGuardrailProfileChange: (bot: Bot, profileKey: string) => void;
  onSelectionChange: <K extends keyof BotUIState>(bot: Bot, field: K, value: BotUIState[K], commitImmediately?: boolean) => void;
  onSystemInstructionBlur: (bot: Bot) => void;
  onGuardToggle: (bot: Bot, enabled: boolean) => void;
  onGuardTypeChange: (bot: Bot, type: GuardState['type']) => void;
  onGuardUsersChange: (bot: Bot, value: string) => void;
  onGuardUsersBlur: (bot: Bot) => void;
}
