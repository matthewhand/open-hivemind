import Debug from 'debug';
import type { ChatInputCommandInteraction } from 'discord.js';
import { SpeckitSpecificationGenerator } from '@src/services/speckit/SpeckitSpecificationGenerator';

const log = Debug('app:discord:handlers:speckit:specify');

export async function handleSpeckitSpecify(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  log('Handling /speckit specify command');

  try {
    // Get the topic from the command options
    const topic = interaction.options.getString('topic', true);

    // Generate the specification
    const generator = new SpeckitSpecificationGenerator();
    const specification = await generator.generateSpecification(topic);

    // Reply with the generated specification
    await interaction.reply({
      content: specification,
      ephemeral: false,
    });
  } catch (error: unknown) {
    console.error('Discord speckit specify error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await interaction.reply({
      content: `Failed to generate specification: ${errorMessage}`,
      ephemeral: true,
    });
  }
}
