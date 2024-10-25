import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { ConfigurationManager } from '@config/ConfigurationManager';
import { SlashCommandBuilder } from '@discordjs/builders';
import Debug from 'debug';

const log = Debug('command:setLlmProvider');

export const setLlmProviderCommand = new SlashCommandBuilder()
  .setName('llm:setProvider')
  .setDescription('Set the LLM provider for the current channel')
  .addStringOption(option =>
    option
      .setName('provider')
      .setDescription('The LLM provider to set (e.g., openai, flowise)')
      .setRequired(true)
  );

export async function handleSetLlmProvider(interaction: CommandInteraction): Promise<void> {
  const provider = interaction.options.get('provider')?.value as string;
  const channelId = interaction.channelId;
  const configManager = ConfigurationManager.getInstance();

  log(`Received provider: ${provider} for channel: ${channelId}`);

  // Guard clause for invalid providers
  if (!['openai', 'flowise'].includes(provider)) {
    log(`Invalid provider: ${provider}`);
    await interaction.reply('⚠️ Invalid provider. Choose either "openai" or "flowise".');
    return;
  }

  log(`Setting provider to ${provider} for channel ${channelId}`);
  configManager.setSession('llm', channelId, provider);

  const embed = new EmbedBuilder()
    .setColor(provider === 'openai' ? '#5865F2' : '#F47B67')
    .setTitle('🔮 The Prophecy Has Shifted!')
    .setDescription(`Behold! The LLM provider has now been set to **${provider.toUpperCase()}**! Brace yourself for a new age of AI-powered responses...`)
    .addFields({
      name: '🌀 Power Level Increased',
      value: `Your channel will now benefit from the immense wisdom of **${provider === 'openai' ? 'OpenAI\'s vast knowledge' : 'Flowise\'s arcane chatflow mastery'}**.`
    })
    .setFooter({ text: 'Remember, with great power comes great responses!' });

  try {
    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    if (message) {
      await message.react('⚡');
      await message.react('🎉');
    }
  } catch (error: any) {
    log(`Failed to send or react to message: ${error.message}`);
    await interaction.followUp('⚠️ Failed to complete the request.');
  }
}
