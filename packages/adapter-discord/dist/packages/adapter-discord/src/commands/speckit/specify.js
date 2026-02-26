"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecifyCommand = void 0;
const builders_1 = require("@discordjs/builders");
exports.SpecifyCommand = {
    data: new builders_1.SlashCommandBuilder()
        .setName('speckit')
        .setDescription('Generate a structured specification from a natural language description.')
        .addStringOption(option => option.setName('topic')
        .setDescription('The topic for the specification.')
        .setRequired(true)),
};
