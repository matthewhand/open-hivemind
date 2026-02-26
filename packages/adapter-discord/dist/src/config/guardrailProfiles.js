"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuardrailProfiles = exports.getGuardrailProfileByKey = exports.saveGuardrailProfiles = exports.loadGuardrailProfiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:guardrailProfiles');
const DEFAULT_GUARDRAIL_PROFILES = [
    {
        key: 'open',
        name: 'Open',
        description: 'Allow MCP tools without restrictions',
        mcpGuard: {
            enabled: false,
            type: 'owner',
        },
    },
    {
        key: 'owner-only',
        name: 'Owner Only',
        description: 'Only the channel owner can use MCP tools',
        mcpGuard: {
            enabled: true,
            type: 'owner',
        },
    },
    {
        key: 'custom-list',
        name: 'Custom Allow List',
        description: 'Only approved user IDs can use MCP tools',
        mcpGuard: {
            enabled: true,
            type: 'custom',
            allowedUserIds: [],
        },
    },
];
const getProfilesPath = () => {
    const configDir = process.env.NODE_CONFIG_DIR || path_1.default.join(process.cwd(), 'config');
    return path_1.default.join(configDir, 'guardrail-profiles.json');
};
const loadGuardrailProfiles = () => {
    const filePath = getProfilesPath();
    try {
        if (!fs_1.default.existsSync(filePath)) {
            return DEFAULT_GUARDRAIL_PROFILES.map(profile => ({ ...profile, mcpGuard: { ...profile.mcpGuard } }));
        }
        const raw = fs_1.default.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            throw new Error('guardrail profiles must be an array');
        }
        return parsed;
    }
    catch (error) {
        debug('Failed to load guardrail profiles, using defaults:', error);
        return DEFAULT_GUARDRAIL_PROFILES.map(profile => ({ ...profile, mcpGuard: { ...profile.mcpGuard } }));
    }
};
exports.loadGuardrailProfiles = loadGuardrailProfiles;
const saveGuardrailProfiles = (profiles) => {
    const filePath = getProfilesPath();
    const dir = path_1.default.dirname(filePath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    fs_1.default.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
};
exports.saveGuardrailProfiles = saveGuardrailProfiles;
const getGuardrailProfileByKey = (key) => {
    const normalized = key.trim().toLowerCase();
    return (0, exports.loadGuardrailProfiles)().find(profile => profile.key.toLowerCase() === normalized);
};
exports.getGuardrailProfileByKey = getGuardrailProfileByKey;
const getGuardrailProfiles = () => (0, exports.loadGuardrailProfiles)();
exports.getGuardrailProfiles = getGuardrailProfiles;
