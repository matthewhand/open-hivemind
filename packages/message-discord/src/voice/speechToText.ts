/**
 * Speech-to-text helper for Discord voice audio files.
 *
 * Transcribes a WAV/audio file to text using an OpenAI-compatible
 * audio transcription endpoint (Whisper). The implementation is
 * dependency-free: it uses the Node.js global `fetch`/`FormData`/`Blob`
 * (Node 18+) so the `message-discord` package does not need to pull in
 * the heavy OpenAI SDK or any local speech models.
 *
 * **End-to-end voice is not a product capability.** Voice channel join is an
 * intentional no-op (`voiceChannelManager.ts`); DiscordService public voice
 * methods throw. This helper is only useful if a caller supplies an audio file
 * by another path (tests, future join wiring).
 *
 * Behavior is intentionally fail-safe: if no API key is configured, or
 * the audio file is missing/empty, or the request fails for any reason,
 * the function resolves to an empty string. Callers
 * (e.g. VoiceCommandHandler) already treat `''` as "no transcription"
 * and skip further processing.
 *
 * Configuration (environment variables):
 *   - OPENAI_API_KEY            API key for the transcription endpoint (required to enable STT).
 *   - OPENAI_BASE_URL           Base URL (default: https://api.openai.com/v1).
 *   - OPENAI_TRANSCRIBE_MODEL   Model name (default: whisper-1).
 *   - DISCORD_STT_TIMEOUT_MS    Request timeout in ms (default: 30000).
 */
import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:discord:speechToText');

const DEFAULT_MODEL = 'whisper-1';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Normalize a base URL so it ends with the `/v1` API root exactly once. */
function resolveTranscriptionUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  const withVersion = /\/v\d+$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
  return `${withVersion}/audio/transcriptions`;
}

/**
 * Transcribe an audio file to text.
 *
 * @param audioPath - Absolute or relative path to the audio file (e.g. a WAV produced by convertOpusToWav).
 * @returns The transcribed text, or an empty string if transcription is unavailable or fails.
 */
export async function speechToText(audioPath: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    debug('OPENAI_API_KEY not set; speech-to-text disabled, returning empty string');
    return '';
  }

  if (!audioPath || !fs.existsSync(audioPath)) {
    debug('Audio file does not exist: %s', audioPath);
    return '';
  }

  let buffer: Buffer;
  try {
    buffer = await fs.promises.readFile(audioPath);
  } catch (error) {
    debug('Failed to read audio file %s: %O', audioPath, error);
    return '';
  }

  if (buffer.length === 0) {
    debug('Audio file is empty: %s', audioPath);
    return '';
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_TRANSCRIBE_MODEL || DEFAULT_MODEL;
  const timeoutMs = Number(process.env.DISCORD_STT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const url = resolveTranscriptionUrl(baseUrl);

  const form = new FormData();
  // Convert the Node Buffer into a typed array so it is accepted by the
  // global Blob constructor across Node versions.
  const bytes = new Uint8Array(buffer.byteLength);
  buffer.copy(bytes);
  form.append('file', new Blob([bytes]), path.basename(audioPath) || 'audio.wav');
  form.append('model', model);
  form.append('response_format', 'json');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      debug('Transcription request failed with status %d', response.status);
      return '';
    }

    const data = (await response.json()) as { text?: unknown };
    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    debug('Transcription succeeded (%d chars)', text.length);
    return text;
  } catch (error) {
    debug('Error during transcription request: %O', error);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export const transcribeAudio = speechToText;
