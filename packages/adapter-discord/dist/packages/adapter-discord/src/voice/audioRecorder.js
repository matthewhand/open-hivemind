"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioRecorder = void 0;
const voice_1 = require("@discordjs/voice");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stream_1 = require("stream");
const util_1 = require("util");
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:discord:recorder');
const pipelineAsync = (0, util_1.promisify)(stream_1.pipeline);
class AudioRecorder {
    constructor(connection) {
        this.recordings = new Map();
        this.isRecording = false;
        this.connection = connection;
    }
    startRecording(userId) {
        if (this.isRecording) {
            return;
        }
        this.isRecording = true;
        debug('Started recording audio');
        if (userId) {
            this.recordUser(userId);
        }
        else {
            this.recordAllUsers();
        }
    }
    stopRecording() {
        this.isRecording = false;
        debug('Stopped recording audio');
        const results = new Map();
        for (const [userId, chunks] of this.recordings) {
            results.set(userId, Buffer.concat(chunks));
        }
        this.recordings.clear();
        return results;
    }
    recordUser(userId) {
        const receiver = this.connection.receiver;
        const subscription = receiver.subscribe(userId, {
            end: {
                behavior: voice_1.EndBehaviorType.AfterSilence,
                duration: 1000,
            },
        });
        if (!this.recordings.has(userId)) {
            this.recordings.set(userId, []);
        }
        subscription.on('data', (chunk) => {
            if (this.isRecording) {
                this.recordings.get(userId).push(chunk);
            }
        });
        subscription.on('end', () => {
            debug(`Recording ended for user ${userId}`);
        });
    }
    recordAllUsers() {
        const receiver = this.connection.receiver;
        receiver.speaking.on('start', (userId) => {
            if (this.isRecording && !this.recordings.has(userId)) {
                this.recordUser(userId);
            }
        });
    }
    async saveRecording(userId, outputPath) {
        try {
            const chunks = this.recordings.get(userId);
            if (!chunks || chunks.length === 0) {
                throw errors_1.ErrorUtils.createError(`No recording found for user ${userId}`, 'ValidationError', 'DISCORD_AUDIO_RECORDER_NO_RECORDING', 404, { userId });
            }
            const buffer = Buffer.concat(chunks);
            const filePath = path.join(outputPath, `recording_${userId}_${Date.now()}.pcm`);
            await fs.promises.writeFile(filePath, buffer);
            debug(`Saved recording to ${filePath}`);
            return filePath;
        }
        catch (error) {
            const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
            const classification = errors_1.ErrorUtils.classifyError(hivemindError);
            debug(`Audio recorder save error: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
            // Log with appropriate level
            if (classification.logLevel === 'error') {
                console.error('Discord audio recorder save error:', hivemindError);
            }
            throw errors_1.ErrorUtils.createError(`Failed to save audio recording: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'DISCORD_AUDIO_RECORDER_SAVE_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error, userId });
        }
    }
    getRecordingDuration(userId) {
        const chunks = this.recordings.get(userId);
        if (!chunks) {
            return 0;
        }
        // Approximate duration based on chunk count (48kHz, 16-bit, mono)
        const totalSamples = chunks.length * 960; // 960 samples per chunk at 48kHz
        return totalSamples / 48000; // Convert to seconds
    }
}
exports.AudioRecorder = AudioRecorder;
