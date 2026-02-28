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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var debug_1 = require("debug");
var express_1 = require("express");
var ProviderRegistry_1 = require("../registries/ProviderRegistry");
var middleware_1 = require("../auth/middleware");
var audit_1 = require("../server/middleware/audit");
var security_1 = require("../server/middleware/security");
var schemaSerializer_1 = require("../utils/schemaSerializer");
var debug = (0, debug_1.default)('app:admin');
exports.adminRouter = (0, express_1.Router)();
// Apply IP whitelist middleware first (blocks unauthorized IPs)
exports.adminRouter.use(security_1.ipWhitelist);
// Apply authentication middleware (requires valid JWT token)
exports.adminRouter.use(middleware_1.authenticate);
// Apply audit middleware to all admin routes
exports.adminRouter.use(audit_1.auditMiddleware);
function loadPersonas() {
    return __awaiter(this, void 0, void 0, function () {
        var configDir, personasDir, fallback, _a, files, validFiles, promises, results, out, e_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    configDir = process.env.NODE_CONFIG_DIR || path_1.default.join(__dirname, '../../config');
                    personasDir = path_1.default.join(configDir, 'personas');
                    fallback = [
                        {
                            key: 'friendly-helper',
                            name: 'Friendly Helper',
                            systemPrompt: 'You are a friendly, concise assistant.',
                        },
                        {
                            key: 'dev-assistant',
                            name: 'Dev Assistant',
                            systemPrompt: 'You are a senior engineer. Answer with pragmatic code examples.',
                        },
                        {
                            key: 'teacher',
                            name: 'Teacher',
                            systemPrompt: 'Explain concepts clearly with analogies and steps.',
                        },
                    ];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 8, , 9]);
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, fs_1.default.promises.access(personasDir)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [2 /*return*/, fallback];
                case 5: return [4 /*yield*/, fs_1.default.promises.readdir(personasDir)];
                case 6:
                    files = _b.sent();
                    validFiles = files.filter(function (file) { return file.endsWith('.json'); });
                    promises = validFiles.map(function (file) { return __awaiter(_this, void 0, void 0, function () {
                        var content, data, e_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, fs_1.default.promises.readFile(path_1.default.join(personasDir, file), 'utf8')];
                                case 1:
                                    content = _a.sent();
                                    data = JSON.parse(content);
                                    if (data && data.key && data.name && typeof data.systemPrompt === 'string') {
                                        return [2 /*return*/, data];
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    e_2 = _a.sent();
                                    debug('Invalid persona file:', file, e_2);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/, null];
                            }
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(promises)];
                case 7:
                    results = _b.sent();
                    out = results.filter(function (item) { return item !== null; });
                    return [2 /*return*/, out.length ? out : fallback];
                case 8:
                    e_1 = _b.sent();
                    debug('Failed loading personas', e_1);
                    return [2 /*return*/, fallback];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.adminRouter.get('/status', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slack_1, slackBots, slackInfo, discordBots, discordInfo, DiscordModule, ds, bots;
    var _a;
    return __generator(this, function (_b) {
        try {
            slack_1 = SlackService.getInstance();
            slackBots = slack_1.getBotNames();
            slackInfo = slackBots.map(function (name) {
                var _a, _b;
                var cfg = slack_1.getBotConfig(name) || {};
                return {
                    provider: 'slack',
                    name: name,
                    defaultChannel: ((_a = cfg === null || cfg === void 0 ? void 0 : cfg.slack) === null || _a === void 0 ? void 0 : _a.defaultChannelId) || '',
                    mode: ((_b = cfg === null || cfg === void 0 ? void 0 : cfg.slack) === null || _b === void 0 ? void 0 : _b.mode) || 'socket',
                };
            });
            discordBots = [];
            discordInfo = [];
            try {
                DiscordModule = Discord;
                ds = DiscordModule.DiscordService.getInstance();
                bots = ((_a = ds.getAllBots) === null || _a === void 0 ? void 0 : _a.call(ds)) || [];
                discordBots = bots.map(function (b) { var _a; return (b === null || b === void 0 ? void 0 : b.botUserName) || ((_a = b === null || b === void 0 ? void 0 : b.config) === null || _a === void 0 ? void 0 : _a.name) || 'discord'; });
                discordInfo = bots.map(function (b) {
                    var _a;
                    return ({
                        provider: 'discord',
                        name: (b === null || b === void 0 ? void 0 : b.botUserName) || ((_a = b === null || b === void 0 ? void 0 : b.config) === null || _a === void 0 ? void 0 : _a.name) || 'discord',
                    });
                });
            }
            catch (_c) { }
            res.json({
                ok: true,
                slackBots: slackBots,
                discordBots: discordBots,
                discordCount: discordBots.length,
                slackInfo: slackInfo,
                discordInfo: discordInfo,
            });
        }
        catch (_d) {
            res.json({ ok: true, bots: [] });
        }
        return [2 /*return*/];
    });
}); });
exports.adminRouter.get('/personas', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _b = (_a = res).json;
                _c = { ok: true };
                return [4 /*yield*/, loadPersonas()];
            case 1:
                _b.apply(_a, [(_c.personas = _d.sent(), _c)]);
                return [2 /*return*/];
        }
    });
}); });
exports.adminRouter.get('/llm-providers', function (_req, res) {
    var providers = ProviderRegistry_1.providerRegistry.getLLMProviders().map(function (p) { return ({
        key: p.id,
        label: p.label,
        docsUrl: p.docsUrl,
        helpText: p.helpText,
    }); });
    res.json({ ok: true, providers: providers });
});
exports.adminRouter.get('/messenger-providers', function (_req, res) {
    var providers = ProviderRegistry_1.providerRegistry.getMessageProviders().map(function (p) { return ({
        key: p.id,
        label: p.label,
        docsUrl: p.docsUrl,
        helpText: p.helpText,
    }); });
    res.json({ ok: true, providers: providers });
});
exports.adminRouter.get('/providers/:providerId/schema', middleware_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var providerId, provider, schema, serialized;
    return __generator(this, function (_a) {
        providerId = req.params.providerId;
        provider = ProviderRegistry_1.providerRegistry.get(providerId);
        if (!provider) {
            return [2 /*return*/, res.status(404).json({ ok: false, error: "Provider '".concat(providerId, "' not found") })];
        }
        try {
            schema = provider.getSchema();
            serialized = (0, schemaSerializer_1.serializeSchema)(schema);
            return [2 /*return*/, res.json({ ok: true, schema: serialized })];
        }
        catch (e) {
            debug("Failed to get schema for provider ".concat(providerId), e);
            return [2 /*return*/, res.status(500).json({ ok: false, error: e.message || String(e) })];
        }
        return [2 /*return*/];
    });
}); });
// Generic bot creation endpoint
exports.adminRouter.post('/providers/:providerId/bots', middleware_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var providerId, provider, e_3, configDir, messengersPath, cfg, fileContent, e_4, e_5, slack, instanceCfg_1, e_6;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                providerId = req.params.providerId;
                provider = ProviderRegistry_1.providerRegistry.get(providerId);
                if (!provider || provider.type !== 'messenger') {
                    return [2 /*return*/, res
                            .status(404)
                            .json({ ok: false, error: "Message provider '".concat(providerId, "' not found") })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                return [4 /*yield*/, provider.addBot(req.body)];
            case 2:
                _d.sent();
                (0, audit_1.logAdminAction)(req, "CREATE_".concat(providerId.toUpperCase(), "_BOT"), "".concat(providerId, "-bots/").concat(((_a = req.body) === null || _a === void 0 ? void 0 : _a.name) || 'unknown'), 'success', "Created ".concat(provider.label, " bot"));
                return [2 /*return*/, res
                        .status(400)
                        .json({ ok: false, error: 'name, botToken, and signingSecret are required' })];
            case 3:
                e_3 = _d.sent();
                debug("Error adding bot to ".concat(providerId), e_3);
                return [2 /*return*/, res.status(500).json({ ok: false, error: e_3.message || String(e_3) })];
            case 4:
                configDir = process.env.NODE_CONFIG_DIR || path_1.default.join(__dirname, '../../config');
                messengersPath = path_1.default.join(configDir, 'messengers.json');
                cfg = { slack: { instances: [] } };
                _d.label = 5;
            case 5:
                _d.trys.push([5, 7, , 8]);
                return [4 /*yield*/, fs_1.default.promises.readFile(messengersPath, 'utf8')];
            case 6:
                fileContent = _d.sent();
                cfg = JSON.parse(fileContent);
                return [3 /*break*/, 8];
            case 7:
                e_4 = _d.sent();
                if (e_4.code === 'ENOENT') {
                    // File doesn't exist yet, start with empty config
                }
                else {
                    debug('Failed reading messengers.json', e_4);
                    throw e_4;
                }
                return [3 /*break*/, 8];
            case 8:
                cfg.slack = cfg.slack || {};
                cfg.slack.mode = cfg.slack.mode || mode || 'socket';
                cfg.slack.instances = cfg.slack.instances || [];
                cfg.slack.instances.push({ name: name, token: botToken, signingSecret: signingSecret, llm: llm });
                _d.label = 9;
            case 9:
                _d.trys.push([9, 12, , 13]);
                return [4 /*yield*/, fs_1.default.promises.mkdir(path_1.default.dirname(messengersPath), { recursive: true })];
            case 10:
                _d.sent();
                return [4 /*yield*/, fs_1.default.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8')];
            case 11:
                _d.sent();
                return [3 /*break*/, 13];
            case 12:
                e_5 = _d.sent();
                debug('Failed writing messengers.json', e_5);
                return [3 /*break*/, 13];
            case 13:
                _d.trys.push([13, 15, , 16]);
                slack = SlackService.getInstance();
                instanceCfg_1 = {
                    name: name,
                    slack: {
                        botToken: botToken,
                        signingSecret: signingSecret,
                        appToken: appToken || '',
                        defaultChannelId: defaultChannelId || '',
                        joinChannels: joinChannels || '',
                        mode: mode || 'socket',
                    },
                    llm: llm,
                };
                // Cast slack to unknown to access addBot which might be dynamically added or not in type def
                return [4 /*yield*/, ((_c = (_b = slack).addBot) === null || _c === void 0 ? void 0 : _c.call(_b, instanceCfg_1))];
            case 14:
                // Cast slack to unknown to access addBot which might be dynamically added or not in type def
                _d.sent();
                return [3 /*break*/, 16];
            case 15:
                e_6 = _d.sent();
                debug('Runtime addBot failed (continue, config was persisted):', e_6);
                return [3 /*break*/, 16];
            case 16: return [2 /*return*/];
        }
    });
}); });
exports.adminRouter.post('/slack-bots', middleware_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, e_7, message;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                provider = ProviderRegistry_1.providerRegistry.get('slack');
                if (!provider)
                    return [2 /*return*/, res.status(404).json({ ok: false, error: 'Slack provider not found' })];
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, provider.addBot(req.body)];
            case 2:
                _c.sent();
                (0, audit_1.logAdminAction)(req, 'CREATE_SLACK_BOT', "slack-bots/".concat((_a = req.body) === null || _a === void 0 ? void 0 : _a.name), 'success', 'Created Slack bot');
                return [2 /*return*/, res.json({ ok: true })];
            case 3:
                e_7 = _c.sent();
                message = (e_7 === null || e_7 === void 0 ? void 0 : e_7.message) || String(e_7);
                (0, audit_1.logAdminAction)(req, 'CREATE_SLACK_BOT', "slack-bots/".concat(((_b = req.body) === null || _b === void 0 ? void 0 : _b.name) || 'unknown'), 'failure', "Failed to create Slack bot: ".concat(message));
                return [2 /*return*/, res.status(500).json({ ok: false, error: message })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.adminRouter.post('/discord-bots', middleware_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, _a, name_1, token, llm, configDir, messengersPath, cfg, fileContent, e_8, e_9, DiscordModule, ds, instanceCfg, e_10, e_11, message;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                provider = ProviderRegistry_1.providerRegistry.get('discord');
                if (!provider)
                    return [2 /*return*/, res.status(404).json({ ok: false, error: 'Discord provider not found' })];
                _e.label = 1;
            case 1:
                _e.trys.push([1, 14, , 15]);
                _a = req.body || {}, name_1 = _a.name, token = _a.token, llm = _a.llm;
                if (!token) {
                    (0, audit_1.logAdminAction)(req, 'CREATE_DISCORD_BOT', "discord-bots/".concat(name_1 || 'unnamed'), 'failure', 'Missing required field: token');
                    return [2 /*return*/, res.status(400).json({ ok: false, error: 'token is required' })];
                }
                configDir = process.env.NODE_CONFIG_DIR || path_1.default.join(__dirname, '../../config');
                messengersPath = path_1.default.join(configDir, 'messengers.json');
                cfg = { discord: { instances: [] } };
                _e.label = 2;
            case 2:
                _e.trys.push([2, 4, , 5]);
                return [4 /*yield*/, fs_1.default.promises.readFile(messengersPath, 'utf8')];
            case 3:
                fileContent = _e.sent();
                cfg = JSON.parse(fileContent);
                return [3 /*break*/, 5];
            case 4:
                e_8 = _e.sent();
                if (e_8.code === 'ENOENT') {
                    // File doesn't exist yet, start with empty config
                }
                else {
                    debug('Failed reading messengers.json', e_8);
                    throw e_8;
                }
                return [3 /*break*/, 5];
            case 5:
                cfg.discord = cfg.discord || {};
                cfg.discord.instances = cfg.discord.instances || [];
                cfg.discord.instances.push({ name: name_1 || '', token: token, llm: llm });
                _e.label = 6;
            case 6:
                _e.trys.push([6, 9, , 10]);
                return [4 /*yield*/, fs_1.default.promises.mkdir(path_1.default.dirname(messengersPath), { recursive: true })];
            case 7:
                _e.sent();
                return [4 /*yield*/, fs_1.default.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8')];
            case 8:
                _e.sent();
                return [3 /*break*/, 10];
            case 9:
                e_9 = _e.sent();
                debug('Failed writing messengers.json', e_9);
                return [3 /*break*/, 10];
            case 10:
                _e.trys.push([10, 12, , 13]);
                DiscordModule = Discord;
                ds = DiscordModule.DiscordService.getInstance();
                instanceCfg = { name: name_1 || '', token: token, llm: llm };
                return [4 /*yield*/, ((_b = ds.addBot) === null || _b === void 0 ? void 0 : _b.call(ds, instanceCfg))];
            case 11:
                _e.sent();
                (0, audit_1.logAdminAction)(req, 'CREATE_DISCORD_BOT', "discord-bots/".concat(name_1 || 'unnamed'), 'success', "Created Discord bot ".concat(name_1 || 'unnamed', " with runtime initialization"));
                return [2 /*return*/, res.json({ ok: true, note: 'Added and saved.' })];
            case 12:
                e_10 = _e.sent();
                debug('Discord runtime add failed; config persisted:', e_10);
                return [3 /*break*/, 13];
            case 13:
                (0, audit_1.logAdminAction)(req, 'CREATE_DISCORD_BOT', "discord-bots/".concat((_c = req.body) === null || _c === void 0 ? void 0 : _c.name), 'success', 'Created Discord bot');
                return [2 /*return*/, res.json({ ok: true, note: 'Saved. Restart app to initialize Discord bot.' })];
            case 14:
                e_11 = _e.sent();
                message = (e_11 === null || e_11 === void 0 ? void 0 : e_11.message) || String(e_11);
                (0, audit_1.logAdminAction)(req, 'CREATE_DISCORD_BOT', "discord-bots/".concat(((_d = req.body) === null || _d === void 0 ? void 0 : _d.name) || 'unnamed'), 'failure', "Failed to create Discord bot: ".concat(message));
                return [2 /*return*/, res.status(500).json({ ok: false, error: message })];
            case 15: return [2 /*return*/];
        }
    });
}); });
// Reload bots
exports.adminRouter.post('/reload', middleware_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var configDir, messengersPath, cfg, content, e_12, addedSlack, addedDiscord, slack, existing, instances, _i, instances_1, inst, nm, slackAny, e_13, DiscordModule, ds, allBots, have, instances, _a, instances_2, inst, e_14, e_15, message;
    var _b, _c, _d, _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                _h.trys.push([0, 18, , 19]);
                configDir = process.env.NODE_CONFIG_DIR || path_1.default.join(__dirname, '../../config');
                messengersPath = path_1.default.join(configDir, 'messengers.json');
                cfg = void 0;
                _h.label = 1;
            case 1:
                _h.trys.push([1, 3, , 4]);
                return [4 /*yield*/, fs_1.default.promises.readFile(messengersPath, 'utf8')];
            case 2:
                content = _h.sent();
                cfg = JSON.parse(content);
                return [3 /*break*/, 4];
            case 3:
                e_12 = _h.sent();
                if (e_12.code === 'ENOENT') {
                    return [2 /*return*/, res.status(400).json({ ok: false, error: 'messengers.json not found' })];
                }
                throw e_12;
            case 4:
                addedSlack = 0;
                addedDiscord = 0;
                _h.label = 5;
            case 5:
                _h.trys.push([5, 10, , 11]);
                slack = SlackService.getInstance();
                existing = new Set(slack.getBotNames());
                instances = ((_b = cfg.slack) === null || _b === void 0 ? void 0 : _b.instances) || [];
                _i = 0, instances_1 = instances;
                _h.label = 6;
            case 6:
                if (!(_i < instances_1.length)) return [3 /*break*/, 9];
                inst = instances_1[_i];
                nm = inst.name || '';
                if (!(!nm || !existing.has(nm))) return [3 /*break*/, 8];
                slackAny = slack;
                return [4 /*yield*/, ((_c = slackAny.addBot) === null || _c === void 0 ? void 0 : _c.call(slackAny, {
                        name: nm || "Bot".concat(Date.now()),
                        slack: {
                            botToken: inst.token,
                            signingSecret: inst.signingSecret || '',
                            mode: ((_d = cfg.slack) === null || _d === void 0 ? void 0 : _d.mode) || 'socket',
                        },
                    }))];
            case 7:
                _h.sent();
                addedSlack++;
                _h.label = 8;
            case 8:
                _i++;
                return [3 /*break*/, 6];
            case 9: return [3 /*break*/, 11];
            case 10:
                e_13 = _h.sent();
                debug('Error loading Slack instances', e_13);
                return [3 /*break*/, 11];
            case 11:
                _h.trys.push([11, 16, , 17]);
                DiscordModule = Discord;
                ds = DiscordModule.DiscordService.getInstance();
                allBots = ((_e = ds.getAllBots) === null || _e === void 0 ? void 0 : _e.call(ds)) || [];
                have = new Set(allBots.map(function (b) { var _a, _b, _c; return ((_b = (_a = b === null || b === void 0 ? void 0 : b.config) === null || _a === void 0 ? void 0 : _a.discord) === null || _b === void 0 ? void 0 : _b.token) || ((_c = b === null || b === void 0 ? void 0 : b.config) === null || _c === void 0 ? void 0 : _c.token); }));
                instances = ((_f = cfg.discord) === null || _f === void 0 ? void 0 : _f.instances) || [];
                _a = 0, instances_2 = instances;
                _h.label = 12;
            case 12:
                if (!(_a < instances_2.length)) return [3 /*break*/, 15];
                inst = instances_2[_a];
                if (!(inst.token && !have.has(inst.token))) return [3 /*break*/, 14];
                return [4 /*yield*/, ((_g = ds.addBot) === null || _g === void 0 ? void 0 : _g.call(ds, { name: inst.name || '', token: inst.token }))];
            case 13:
                _h.sent();
                addedDiscord++;
                _h.label = 14;
            case 14:
                _a++;
                return [3 /*break*/, 12];
            case 15: return [3 /*break*/, 17];
            case 16:
                e_14 = _h.sent();
                debug('Discord reload error', e_14);
                return [3 /*break*/, 17];
            case 17:
                (0, audit_1.logAdminAction)(req, 'RELOAD_BOTS', 'bots/reload', 'success', "Reloaded bots from messengers.json: ".concat(addedSlack, " Slack bots, ").concat(addedDiscord, " Discord bots added"));
                return [2 /*return*/, res.json({ ok: true, addedSlack: addedSlack, addedDiscord: addedDiscord })];
            case 18:
                e_15 = _h.sent();
                message = (e_15 === null || e_15 === void 0 ? void 0 : e_15.message) || String(e_15);
                (0, audit_1.logAdminAction)(req, 'RELOAD_BOTS', 'bots/reload', 'failure', "Failed to reload bots: ".concat(message));
                return [2 /*return*/, res.status(500).json({ ok: false, error: message })];
            case 19: return [2 /*return*/];
        }
    });
}); });
exports.default = exports.adminRouter;
