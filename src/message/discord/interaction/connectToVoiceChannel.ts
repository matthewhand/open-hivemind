import Debug from "debug";
const debug = Debug("app");

import { Client } from "discord.js"; import { VoiceConnection } from "@discordjs/voice"; import Debug from "debug"; const debug = Debug("app");; import { setupVoiceChannel } from "../voice/setupVoiceChannel"; import { playWelcomeMessage } from "../voice/playWelcomeMessage"; export async function connectToVoiceChannel(client: Client, channelId: string): Promise<VoiceConnection> { debug(`DiscordManager: Connecting to voice channel ID: ${channelId}`); const connection = await setupVoiceChannel(client); debug("DiscordManager: Playing welcome message"); if (connection) { playWelcomeMessage(connection); } return connection!; }
