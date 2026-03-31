import type { BotConfig } from '../../../types/config';

export interface BotValidationResult {
  name: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationSummary {
  botValidation: BotValidationResult[];
  errors: string[];
  warnings: string[];
  recommendations: string[];
  isValid: boolean;
}

export function validateBotConfiguration(bot: Partial<BotConfig>): BotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = bot.name ?? 'Unnamed bot';

  if (!bot.name) {
    errors.push('Bot name is required');
    errors.push('Name is required');
  }

  if (!bot.messageProvider) {
    errors.push('Message provider is required');
  }

  if (!bot.llmProvider) {
    errors.push('LLM provider is required');
  }

  if (bot.messageProvider === 'discord') {
    if (!bot.discord?.token) {
      errors.push('Discord bot token is required');
    } else if (bot.discord.token.length < 10) {
      warnings.push('Discord token appears to be invalid (too short)');
    }
  }

  if (bot.messageProvider === 'slack') {
    if (!bot.slack?.botToken) {
      errors.push('Slack bot token is required');
    }
    if (!bot.slack?.signingSecret) {
      errors.push('Slack signing secret is required');
    }
  }

  if (bot.llmProvider === 'openai') {
    if (!bot.openai?.apiKey) {
      errors.push('OpenAI API key is required');
    } else if (!bot.openai.apiKey.startsWith('sk-')) {
      warnings.push('OpenAI API key should start with "sk-"');
    }
  }

  // Anthropic config type not explicitly available in types yet based on previous check,
  // however validation existed here originally. Handled implicitly or ignored if type
  // is cast properly, but we must fix TS issue by typecasting bot to any here temporarily
  // or removing the check if not supported.
  if ((bot.llmProvider as any) === 'anthropic') {
    const anyBot = bot as any;
    if (!anyBot.anthropic?.apiKey) {
      errors.push('Anthropic API key is required');
    } else if (!anyBot.anthropic.apiKey.startsWith('sk-ant-')) {
      warnings.push('Anthropic API key should start with "sk-ant-"');
    }
  }

  return {
    name,
    valid: errors.length === 0 && warnings.length === 0,
    errors,
    warnings,
  };
}

export const buildRecommendations = (bots: Partial<BotConfig>[]): string[] => {
  const recommendations: string[] = [];

  if (bots.length === 1) {
    recommendations.push('Consider adding multiple message providers for redundancy');
  }

  if (bots.length > 3) {
    recommendations.push('Consider using a load balancer for better performance');
  }

  return recommendations;
};

export const evaluateBotConfigurations = (
  bots: Partial<BotConfig>[],
  environmentWarnings: string[] = []
): ValidationSummary => {
  const botValidation = bots.map(validateBotConfiguration);
  const warnings = [
    ...(environmentWarnings ?? []),
    ...botValidation.flatMap((bot) => bot.warnings),
  ];
  const errors = botValidation.flatMap((bot) => bot.errors);
  const recommendations = buildRecommendations(bots);
  const isValid = botValidation.every((bot) => bot.valid) && warnings.length === 0;

  return {
    botValidation,
    errors,
    warnings,
    recommendations,
    isValid,
  };
};
