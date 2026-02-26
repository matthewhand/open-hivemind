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
exports.getMcpServerProfiles = getMcpServerProfiles;
exports.getMcpServerProfileByKey = getMcpServerProfileByKey;
exports.createMcpServerProfile = createMcpServerProfile;
exports.updateMcpServerProfile = updateMcpServerProfile;
exports.deleteMcpServerProfile = deleteMcpServerProfile;
exports.reloadMcpServerProfiles = reloadMcpServerProfiles;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:mcpServerProfiles');
const CONFIG_DIR = path.join(process.cwd(), 'config');
const PROFILES_FILE = path.join(CONFIG_DIR, 'mcp-server-profiles.json');
let profilesCache = null;
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}
function loadProfiles() {
    if (profilesCache) {
        return profilesCache;
    }
    try {
        if (fs.existsSync(PROFILES_FILE)) {
            const data = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
            profilesCache = Array.isArray(data.profiles) ? data.profiles : [];
            debug(`Loaded ${profilesCache.length} MCP server profiles`);
        }
        else {
            profilesCache = [];
            debug('No MCP server profiles file found, starting with empty list');
        }
    }
    catch (err) {
        debug('Error loading MCP server profiles:', err);
        profilesCache = [];
    }
    return profilesCache;
}
function saveProfiles(profiles) {
    ensureConfigDir();
    const data = { profiles };
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    profilesCache = profiles;
    debug(`Saved ${profiles.length} MCP server profiles`);
}
function getMcpServerProfiles() {
    return loadProfiles();
}
function getMcpServerProfileByKey(key) {
    return loadProfiles().find(p => p.key === key);
}
function createMcpServerProfile(profile) {
    var _a;
    const profiles = loadProfiles();
    if (profiles.some(p => p.key === profile.key)) {
        throw new Error(`Profile with key "${profile.key}" already exists`);
    }
    const newProfile = {
        key: profile.key.trim().toLowerCase().replace(/\s+/g, '-'),
        name: profile.name.trim(),
        description: ((_a = profile.description) === null || _a === void 0 ? void 0 : _a.trim()) || undefined,
        mcpServers: Array.isArray(profile.mcpServers) ? profile.mcpServers : [],
    };
    profiles.push(newProfile);
    saveProfiles(profiles);
    return newProfile;
}
function updateMcpServerProfile(key, updates) {
    var _a, _b;
    const profiles = loadProfiles();
    const index = profiles.findIndex(p => p.key === key);
    if (index === -1) {
        return null;
    }
    const existing = profiles[index];
    const updated = {
        ...existing,
        name: ((_a = updates.name) === null || _a === void 0 ? void 0 : _a.trim()) || existing.name,
        description: ((_b = updates.description) === null || _b === void 0 ? void 0 : _b.trim()) || existing.description,
        mcpServers: Array.isArray(updates.mcpServers) ? updates.mcpServers : existing.mcpServers,
    };
    profiles[index] = updated;
    saveProfiles(profiles);
    return updated;
}
function deleteMcpServerProfile(key) {
    const profiles = loadProfiles();
    const index = profiles.findIndex(p => p.key === key);
    if (index === -1) {
        return false;
    }
    profiles.splice(index, 1);
    saveProfiles(profiles);
    return true;
}
function reloadMcpServerProfiles() {
    profilesCache = null;
    loadProfiles();
}
