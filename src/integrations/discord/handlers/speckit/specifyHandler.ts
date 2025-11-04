import { CommandInteraction, ChatInputCommandInteraction } from 'discord.js';
import Debug from 'debug';
import { SpeckitSpecificationGenerator } from '@src/services/speckit/SpeckitSpecificationGenerator';
import { ToolUsageGuards } from '@config/ToolUsageGuards';
import { SwarmModeManager } from '@config/SwarmModeManager';
import { ErrorUtils } from '@common/ErrorUtils';

const log = Debug('app:discord:handlers:speckit:specify');

export async function handleSpeckitSpecify(interaction: ChatInputCommandInteraction): Promise<void> {
    log('Handling /speckit specify command');

    try {
        // Check user permissions
        const hasPermission = await ToolUsageGuards.isUserAllowed(interaction.user.id, 'speckit.specify');
        if (!hasPermission) {
            await interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
            return;
        }

        // Handle swarm mode concurrency
        if (process.env.DISCORD_BOT_TOKEN?.includes(',')) { // Check if multiple tokens exist
            const lockKey = `speckit_specify_${interaction.channelId}_${interaction.user.id}`;
            const acquired = await SwarmModeManager.acquireLock(lockKey, 30000); // 30 second lock

            if (!acquired) {
                // Another instance is already processing, ignore this request
                return;
            }

            // Release the lock after processing
            process.nextTick(async () => {
                await SwarmModeManager.releaseLock(lockKey);
            });
        }

        // Get the topic from the command options
        const topic = interaction.options.getString('topic', true);

        // Generate the specification
        const generator = new SpeckitSpecificationGenerator();
        const specification = await generator.generateSpecification(topic);

        // Reply with the generated specification
        await interaction.reply({
            content: specification,
            ephemeral: false
        });

    } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        const classification = ErrorUtils.classifyError(hivemindError);

        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord speckit specify error:', hivemindError);
        }

        await interaction.reply({
            content: `Failed to generate specification: ${ErrorUtils.getMessage(hivemindError)}`,
            ephemeral: true
        });
    }
}