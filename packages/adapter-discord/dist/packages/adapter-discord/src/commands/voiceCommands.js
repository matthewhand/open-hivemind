"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listenCommand = exports.leaveVoiceCommand = exports.joinVoiceCommand = void 0;
exports.handleJoinVoice = handleJoinVoice;
exports.handleLeaveVoice = handleLeaveVoice;
exports.handleStartListening = handleStartListening;
const builders_1 = require("@discordjs/builders");
const connectToVoiceChannel_1 = require("../interaction/connectToVoiceChannel");
const voiceCommandHandler_1 = require("../voice/voiceCommandHandler");
const errors_1 = require("@src/types/errors");
exports.joinVoiceCommand = new builders_1.SlashCommandBuilder()
    .setName('join')
    .setDescription('Join your voice channel');
exports.leaveVoiceCommand = new builders_1.SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel');
exports.listenCommand = new builders_1.SlashCommandBuilder()
    .setName('listen')
    .setDescription('Start listening for voice commands');
async function handleJoinVoice(interaction) {
    var _a;
    const member = interaction.member;
    const voiceChannel = (_a = member === null || member === void 0 ? void 0 : member.voice) === null || _a === void 0 ? void 0 : _a.channel;
    if (!voiceChannel) {
        await interaction.reply('You need to be in a voice channel!');
        return;
    }
    try {
        const connection = await (0, connectToVoiceChannel_1.connectToVoiceChannel)(interaction.client, voiceChannel.id);
        await interaction.reply(`Joined ${voiceChannel.name}!`);
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord join voice channel error:', hivemindError);
        }
        await interaction.reply(`Failed to join voice channel: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
    }
}
async function handleLeaveVoice(interaction) {
    var _a;
    const connection = (_a = interaction.guild) === null || _a === void 0 ? void 0 : _a.voiceConnection;
    if (connection) {
        connection.destroy();
        await interaction.reply('Left the voice channel!');
    }
    else {
        await interaction.reply('Not in a voice channel!');
    }
}
async function handleStartListening(interaction) {
    var _a;
    const member = interaction.member;
    const voiceChannel = (_a = member === null || member === void 0 ? void 0 : member.voice) === null || _a === void 0 ? void 0 : _a.channel;
    if (!voiceChannel) {
        await interaction.reply('You need to be in a voice channel!');
        return;
    }
    try {
        const connection = await (0, connectToVoiceChannel_1.connectToVoiceChannel)(interaction.client, voiceChannel.id);
        const handler = new voiceCommandHandler_1.VoiceCommandHandler(connection);
        handler.startListening();
        await interaction.reply('Now listening for voice commands!');
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord start listening error:', hivemindError);
        }
        await interaction.reply(`Failed to start listening: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
    }
}
