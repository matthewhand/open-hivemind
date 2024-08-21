import { ICommand } from '@command/types/ICommand';
import { analyzeImage } from '@command/common/replicate';
import Logger from '@utils/logger';

export class ReplicateCommand implements ICommand {
    name = 'replicate';
    description = 'Analyze an image using the Replicate API';

    async execute(interaction: any): Promise<void> {
        const imageUrl = interaction.options.getString('image', true);
        const prompt = interaction.options.getString('prompt', true);

        await interaction.deferReply();

        const result = await analyzeImage(imageUrl, prompt);

        if (result.success) {
            await interaction.editReply({ content: result.message, components: [{ type: 1, components: [{ type: 2, style: 5, label: 'View Prediction', url: result.url }] }] });
        } else {
            await interaction.editReply(`Failed to analyze image: ${result.message}`);
        }
    }
}
