"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDiscordConnection = void 0;
const testDiscordConnection = async (token) => {
    const trimmed = token.trim();
    if (!trimmed) {
        return { ok: false, message: 'Discord bot token is required' };
    }
    const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
            Authorization: `Bot ${trimmed}`,
        },
    });
    if (!response.ok) {
        const text = await response.text();
        return {
            ok: false,
            message: `Discord API error: ${response.status} ${response.statusText}`,
            details: { body: text },
        };
    }
    const data = await response.json();
    return {
        ok: true,
        message: `Connected as ${data.username} (${data.id})`,
        details: data,
    };
};
exports.testDiscordConnection = testDiscordConnection;
