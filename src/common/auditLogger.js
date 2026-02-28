"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var readline_1 = require("readline");
var debug_1 = require("debug");
var debug = (0, debug_1.default)('app:auditLogger');
var AuditLogger = /** @class */ (function () {
    function AuditLogger() {
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5;
        this.logQueue = [];
        this.isProcessing = false;
        var configDir = process.env.NODE_CONFIG_DIR || path_1.default.join(__dirname, '../../config');
        this.logFilePath = path_1.default.join(configDir, 'audit.log');
        this.ensureLogDirectory();
    }
    AuditLogger.getInstance = function () {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    };
    AuditLogger.prototype.ensureLogDirectory = function () {
        var dir = path_1.default.dirname(this.logFilePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    };
    AuditLogger.prototype.rotateLogIfNeeded = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, stats, i, oldFile, newFile, _b, error_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 18, , 19]);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fs_1.promises.access(this.logFilePath)];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _c.sent();
                        return [2 /*return*/]; // File does not exist
                    case 4: return [4 /*yield*/, fs_1.promises.stat(this.logFilePath)];
                    case 5:
                        stats = _c.sent();
                        if (!(stats.size > this.maxLogSize)) return [3 /*break*/, 17];
                        i = this.maxLogFiles - 1;
                        _c.label = 6;
                    case 6:
                        if (!(i >= 1)) return [3 /*break*/, 15];
                        oldFile = "".concat(this.logFilePath, ".").concat(i);
                        newFile = "".concat(this.logFilePath, ".").concat(i + 1);
                        _c.label = 7;
                    case 7:
                        _c.trys.push([7, 13, , 14]);
                        return [4 /*yield*/, fs_1.promises.access(oldFile)];
                    case 8:
                        _c.sent();
                        if (!(i === this.maxLogFiles - 1)) return [3 /*break*/, 10];
                        return [4 /*yield*/, fs_1.promises.unlink(oldFile)];
                    case 9:
                        _c.sent(); // Remove oldest
                        return [3 /*break*/, 12];
                    case 10: return [4 /*yield*/, fs_1.promises.rename(oldFile, newFile)];
                    case 11:
                        _c.sent();
                        _c.label = 12;
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        _b = _c.sent();
                        return [3 /*break*/, 14];
                    case 14:
                        i--;
                        return [3 /*break*/, 6];
                    case 15:
                    // Move current log to .1
                    return [4 /*yield*/, fs_1.promises.rename(this.logFilePath, "".concat(this.logFilePath, ".1"))];
                    case 16:
                        // Move current log to .1
                        _c.sent();
                        _c.label = 17;
                    case 17: return [3 /*break*/, 19];
                    case 18:
                        error_1 = _c.sent();
                        debug('Failed to rotate audit log:', error_1);
                        return [3 /*break*/, 19];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    AuditLogger.prototype.processQueue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var batch, data, error_2, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isProcessing)
                            return [2 /*return*/];
                        this.isProcessing = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, 10, 11]);
                        _a.label = 2;
                    case 2:
                        if (!(this.logQueue.length > 0)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.rotateLogIfNeeded()];
                    case 3:
                        _a.sent();
                        batch = this.logQueue.splice(0, this.logQueue.length);
                        if (batch.length === 0)
                            return [3 /*break*/, 8];
                        data = batch.join('');
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, fs_1.promises.appendFile(this.logFilePath, data)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_2 = _a.sent();
                        debug('Failed to write to audit log:', error_2);
                        console.error('AUDIT LOG WRITE ERROR:', error_2);
                        return [3 /*break*/, 7];
                    case 7: return [3 /*break*/, 2];
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        error_3 = _a.sent();
                        debug('Error in processQueue:', error_3);
                        return [3 /*break*/, 11];
                    case 10:
                        this.isProcessing = false;
                        // Check if new items arrived while we were finishing
                        if (this.logQueue.length > 0) {
                            this.processQueue();
                        }
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    AuditLogger.prototype.waitForQueueDrain = function () {
        return __awaiter(this, arguments, void 0, function (timeoutMs) {
            var start;
            if (timeoutMs === void 0) { timeoutMs = 5000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = Date.now();
                        _a.label = 1;
                    case 1:
                        if (!(this.isProcessing || this.logQueue.length > 0)) return [3 /*break*/, 3];
                        if (Date.now() - start > timeoutMs) {
                            debug('Timeout waiting for queue drain');
                            return [3 /*break*/, 3];
                        }
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 50); })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuditLogger.prototype.log = function (event) {
        try {
            var auditEvent = __assign({ id: this.generateId(), timestamp: new Date().toISOString() }, event);
            var logEntry = JSON.stringify(auditEvent) + '\n';
            this.logQueue.push(logEntry);
            debug('Audit event queued:', {
                id: auditEvent.id,
                action: auditEvent.action,
                user: auditEvent.user,
                result: auditEvent.result,
            });
            this.processQueue();
        }
        catch (error) {
            debug('Failed to queue audit event:', error);
            console.error('AUDIT LOG ERROR:', event, error);
        }
    };
    AuditLogger.prototype.logConfigChange = function (user, action, resource, result, details, options) {
        if (options === void 0) { options = {}; }
        this.log(__assign({ user: user, action: "CONFIG_".concat(action), resource: resource, result: result, details: details }, options));
    };
    AuditLogger.prototype.logBotAction = function (user, action, botName, result, details, options) {
        if (options === void 0) { options = {}; }
        this.log(__assign({ user: user, action: "BOT_".concat(action), resource: "bots/".concat(botName), result: result, details: details }, options));
    };
    AuditLogger.prototype.logAdminAction = function (user, action, resource, result, details, options) {
        if (options === void 0) { options = {}; }
        this.log(__assign({ user: user, action: "ADMIN_".concat(action), resource: resource, result: result, details: details }, options));
    };
    AuditLogger.prototype.getAuditEvents = function () {
        return __awaiter(this, arguments, void 0, function (limit, offset, filter) {
            var fileStream, rl, bufferSize, buffer, count, _a, rl_1, rl_1_1, line, trimmed, event_1, e_1_1, results, totalElements, i, logicalIndex, physicalIndex, normalizedIndex, error_4;
            var _b, e_1, _c, _d;
            if (limit === void 0) { limit = 100; }
            if (offset === void 0) { offset = 0; }
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 13, , 14]);
                        if (!fs_1.default.existsSync(this.logFilePath)) {
                            return [2 /*return*/, []];
                        }
                        fileStream = fs_1.default.createReadStream(this.logFilePath, { encoding: 'utf8' });
                        rl = readline_1.default.createInterface({
                            input: fileStream,
                            crlfDelay: Infinity,
                        });
                        bufferSize = limit + offset;
                        buffer = new Array(bufferSize);
                        count = 0;
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 6, 7, 12]);
                        _a = true, rl_1 = __asyncValues(rl);
                        _e.label = 2;
                    case 2: return [4 /*yield*/, rl_1.next()];
                    case 3:
                        if (!(rl_1_1 = _e.sent(), _b = rl_1_1.done, !_b)) return [3 /*break*/, 5];
                        _d = rl_1_1.value;
                        _a = false;
                        line = _d;
                        trimmed = line.trim();
                        if (!trimmed)
                            return [3 /*break*/, 4];
                        try {
                            event_1 = JSON.parse(trimmed);
                            if (filter && !filter(event_1)) {
                                return [3 /*break*/, 4];
                            }
                            buffer[count % bufferSize] = event_1;
                            count++;
                        }
                        catch (e) {
                            debug('Failed to parse audit log line: %O', e);
                            return [3 /*break*/, 4];
                        }
                        _e.label = 4;
                    case 4:
                        _a = true;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 12];
                    case 6:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 12];
                    case 7:
                        _e.trys.push([7, , 10, 11]);
                        if (!(!_a && !_b && (_c = rl_1.return))) return [3 /*break*/, 9];
                        return [4 /*yield*/, _c.call(rl_1)];
                    case 8:
                        _e.sent();
                        _e.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 11: return [7 /*endfinally*/];
                    case 12:
                        results = [];
                        totalElements = Math.min(count, bufferSize);
                        for (i = 0; i < totalElements; i++) {
                            logicalIndex = count - 1 - i;
                            physicalIndex = logicalIndex % bufferSize;
                            normalizedIndex = physicalIndex < 0 ? physicalIndex + bufferSize : physicalIndex;
                            results.push(buffer[normalizedIndex]);
                        }
                        // Apply offset (skip first 'offset' items) and limit
                        return [2 /*return*/, results.slice(offset, offset + limit)];
                    case 13:
                        error_4 = _e.sent();
                        debug('Failed to read audit events:', error_4);
                        return [2 /*return*/, []];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    AuditLogger.prototype.getAuditEventsByUser = function (user_1) {
        return __awaiter(this, arguments, void 0, function (user, limit) {
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getAuditEvents(limit, 0, function (event) { return event.user === user; })];
            });
        });
    };
    AuditLogger.prototype.getAuditEventsByAction = function (action_1) {
        return __awaiter(this, arguments, void 0, function (action, limit) {
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getAuditEvents(limit, 0, function (event) { return event.action === action; })];
            });
        });
    };
    AuditLogger.prototype.getBotActivity = function (botId_1) {
        return __awaiter(this, arguments, void 0, function (botId, limit) {
            var resourceKey;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                resourceKey = "bots/".concat(botId);
                return [2 /*return*/, this.getAuditEvents(limit, 0, function (event) {
                        return Boolean(event.resource === resourceKey || (event.metadata && event.metadata.botId === botId));
                    })];
            });
        });
    };
    AuditLogger.prototype.generateId = function () {
        return "audit_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    AuditLogger.prototype.getLogFilePath = function () {
        return this.logFilePath;
    };
    return AuditLogger;
}());
exports.AuditLogger = AuditLogger;
exports.default = AuditLogger;
