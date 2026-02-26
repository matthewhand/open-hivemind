"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSpeckitSpecify = handleSpeckitSpecify;
const debug_1 = __importDefault(require("debug"));
const SpeckitSpecificationGenerator_1 = require("@src/services/speckit/SpeckitSpecificationGenerator");
const log = (0, debug_1.default)('app:discord:handlers:speckit:specify');
async function handleSpeckitSpecify(interaction) {
    log('Handling /speckit specify command');
    try {
        // Get the topic from the command options
        const topic = interaction.options.getString('topic', true);
        // Generate the specification
        const generator = new SpeckitSpecificationGenerator_1.SpeckitSpecificationGenerator();
        const specification = await generator.generateSpecification(topic);
        // Reply with the generated specification
        await interaction.reply({
            content: specification,
            ephemeral: false,
        });
    }
    catch (error) {
        console.error('Discord speckit specify error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await interaction.reply({
            content: `Failed to generate specification: ${errorMessage}`,
            ephemeral: true,
        });
    }
}
