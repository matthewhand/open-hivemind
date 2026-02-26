"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLlmProfiles = exports.getLlmProfileByKey = exports.saveLlmProfiles = exports.loadLlmProfiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:llmProfiles');
const DEFAULT_LLM_PROFILES = {
    llm: [],
};
const getProfilesPath = () => {
    const configDir = process.env.NODE_CONFIG_DIR || path_1.default.join(process.cwd(), 'config');
    return path_1.default.join(configDir, 'llm-profiles.json');
};
const loadLlmProfiles = () => {
    const filePath = getProfilesPath();
    try {
        if (!fs_1.default.existsSync(filePath)) {
            // Create scaffolding if missing
            const scaffold = { ...DEFAULT_LLM_PROFILES };
            try {
                const dir = path_1.default.dirname(filePath);
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
                fs_1.default.writeFileSync(filePath, JSON.stringify(scaffold, null, 2), 'utf8');
                debug('Created scaffolding for llm profiles at', filePath);
                return scaffold;
            }
            catch (err) {
                debug('Failed to create scaffolding:', err);
                return scaffold;
            }
        }
        const raw = fs_1.default.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('llm profiles must be an object');
        }
        return {
            llm: Array.isArray(parsed.llm) ? parsed.llm : [],
        };
    }
    catch (error) {
        debug('Failed to load llm profiles, using defaults:', error);
        return { ...DEFAULT_LLM_PROFILES, llm: [] };
    }
};
exports.loadLlmProfiles = loadLlmProfiles;
const saveLlmProfiles = (profiles) => {
    const filePath = getProfilesPath();
    const dir = path_1.default.dirname(filePath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    fs_1.default.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
};
exports.saveLlmProfiles = saveLlmProfiles;
const getLlmProfileByKey = (key) => {
    const normalized = key.trim().toLowerCase();
    return (0, exports.loadLlmProfiles)().llm.find(profile => profile.key.toLowerCase() === normalized);
};
exports.getLlmProfileByKey = getLlmProfileByKey;
const getLlmProfiles = () => (0, exports.loadLlmProfiles)();
exports.getLlmProfiles = getLlmProfiles;
