"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCommands = exports.registerCommands = void 0;
const debug_1 = __importDefault(require("debug"));
const rest_1 = require("@discordjs/rest");
const v9_1 = require("discord-api-types/v9");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug = (0, debug_1.default)('app:slashCommandHandler');
const commands = [];
const commandExecutors = {};
// Load command files from the commands/slash directory
const commandsPath = path_1.default.join(__dirname, '..', 'commands', 'slash');
const commandFiles = fs_1.default.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
for (const file of commandFiles) {
    const filePath = path_1.default.join(commandsPath, file);
    const command = require(filePath).default;
    if (command.data && command.execute) {
        commands.push(command.data.toJSON());
        commandExecutors[command.data.name] = command.execute;
    }
    else {
        debug('The command at ' + filePath + ' is missing a required "data" or "execute" property.');
    }
}
/**
 * Registers commands with the Discord API.
 * @param clientId - The client ID of the bot.
 * @param token - The bot token.
 * @param guildId - The guild ID where commands should be registered.
 */
const registerCommands = (clientId, token, guildId) => __awaiter(void 0, void 0, void 0, function* () {
    const rest = new rest_1.REST({ version: '9' }).setToken(token);
    try {
        debug('Started refreshing ' + commands.length + ' application (/) commands.');
        const data = yield rest.put(v9_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        debug('Successfully reloaded ' + (Array.isArray(data) ? data.length : 0) + ' application (/) commands.');
    }
    catch (error) {
        debug('Error registering commands: ' + error.message);
        if (error.code === 50001) {
            debug('Missing Access: The bot does not have permissions to register slash commands in the guild.');
        }
        else if (error.code === 50013) {
            debug('Missing Permissions: The bot lacks necessary permissions to execute this operation.');
        }
    }
});
exports.registerCommands = registerCommands;
/**
 * Handles command interactions.
 * @param client - The Discord client instance.
 */
const handleCommands = (client) => {
    client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
        if (!interaction.isCommand())
            return;
        const commandExecutor = commandExecutors[interaction.commandName];
        if (commandExecutor) {
            try {
                yield commandExecutor(interaction);
            }
            catch (error) {
                debug('Error executing command ' + interaction.commandName + ': ' + error.message);
                yield interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true });
            }
        }
        else {
            debug('No executor found for command ' + interaction.commandName);
        }
    }));
};
exports.handleCommands = handleCommands;
