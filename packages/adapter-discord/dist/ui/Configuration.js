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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const DaisyUI_1 = require("../../../client/src/components/DaisyUI");
const ToastNotification_1 = require("../../../client/src/components/DaisyUI/ToastNotification");
const DiscordConfiguration = () => {
    var _a, _b;
    const [config, setConfig] = (0, react_1.useState)({
        botToken: '',
        clientId: '',
        guildId: '',
        prefix: '!',
        status: 'online',
        features: {
            voiceSupport: true,
            messageLogging: false,
            autoModeration: false,
            analytics: true,
        },
    });
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [testing, setTesting] = (0, react_1.useState)(false);
    const [testResult, setTestResult] = (0, react_1.useState)(null);
    const successToast = (0, ToastNotification_1.useSuccessToast)();
    const errorToast = (0, ToastNotification_1.useErrorToast)();
    (0, react_1.useEffect)(() => {
        // Load existing configuration
        loadConfig();
    }, []);
    const loadConfig = async () => {
        try {
            // API call to load Discord configuration
            const response = await fetch('/api/integrations/discord/config');
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setConfig(prev => ({ ...prev, ...data }));
                }
            }
        }
        catch (error) {
            console.error('Failed to load Discord config:', error);
        }
    };
    const saveConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/integrations/discord/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });
            if (response.ok) {
                successToast('Discord configuration saved successfully');
            }
            else {
                const error = await response.json();
                errorToast('Failed to save configuration', error.message);
            }
        }
        catch (error) {
            errorToast('Failed to save configuration', error instanceof Error ? error.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    };
    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const response = await fetch('/api/integrations/discord/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ botToken: config.botToken, clientId: config.clientId }),
            });
            const result = await response.json();
            setTestResult({
                success: result.success,
                message: result.message,
            });
            if (result.success) {
                successToast('Discord connection test successful');
            }
            else {
                errorToast('Discord connection test failed', result.message);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setTestResult({
                success: false,
                message,
            });
            errorToast('Discord connection test failed', message);
        }
        finally {
            setTesting(false);
        }
    };
    const updateConfig = (path, value) => {
        setConfig(prev => {
            const keys = path.split('.');
            const newConfig = { ...prev };
            let current = newConfig;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newConfig;
        });
    };
    return (react_1.default.createElement("div", { className: "space-y-6" },
        react_1.default.createElement(DaisyUI_1.Card, { className: "bg-base-100 shadow-xl" },
            react_1.default.createElement("div", { className: "card-body p-6" },
                react_1.default.createElement("div", { className: "text-2xl font-bold mb-4" },
                    react_1.default.createElement("div", { className: "flex items-center gap-3" },
                        react_1.default.createElement("div", { className: "w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center" },
                            react_1.default.createElement("svg", { className: "w-5 h-5 text-white", fill: "currentColor", viewBox: "0 0 24 24" },
                                react_1.default.createElement("path", { d: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" }))),
                        "Discord Integration")),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" },
                    react_1.default.createElement("div", { className: "form-control w-full" },
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "Bot Token"),
                            react_1.default.createElement("span", { className: "label-text-alt text-xs text-base-content/60" }, "Required")),
                        react_1.default.createElement(DaisyUI_1.Input, { type: "password", placeholder: "Enter Discord bot token", value: config.botToken, onChange: (e) => updateConfig('botToken', e.target.value), className: "w-full" })),
                    react_1.default.createElement("div", { className: "form-control w-full" },
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "Client ID"),
                            react_1.default.createElement("span", { className: "label-text-alt text-xs text-base-content/60" }, "Required")),
                        react_1.default.createElement(DaisyUI_1.Input, { type: "text", placeholder: "Enter Discord client ID", value: config.clientId, onChange: (e) => updateConfig('clientId', e.target.value), className: "w-full" })),
                    react_1.default.createElement("div", { className: "form-control w-full" },
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "Guild ID (Server)"),
                            react_1.default.createElement("span", { className: "label-text-alt text-xs text-base-content/60" }, "Optional")),
                        react_1.default.createElement(DaisyUI_1.Input, { type: "text", placeholder: "Enter Discord guild ID", value: config.guildId, onChange: (e) => updateConfig('guildId', e.target.value), className: "w-full" })),
                    react_1.default.createElement("div", { className: "form-control w-full" },
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "Command Prefix"),
                            react_1.default.createElement("span", { className: "label-text-alt text-xs text-base-content/60" }, "Default: !")),
                        react_1.default.createElement(DaisyUI_1.Input, { type: "text", placeholder: "Command prefix", value: config.prefix, onChange: (e) => updateConfig('prefix', e.target.value), className: "w-full", maxLength: 5 }))),
                react_1.default.createElement("div", { className: "divider my-6" }, "Bot Status & Activity"),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" },
                    react_1.default.createElement("div", { className: "form-control w-full" },
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "Bot Status")),
                        react_1.default.createElement("select", { className: "select select-bordered w-full", value: config.status, onChange: (e) => updateConfig('status', e.target.value) },
                            react_1.default.createElement("option", { value: "online" }, "\uD83D\uDFE2 Online"),
                            react_1.default.createElement("option", { value: "idle" }, "\uD83D\uDFE1 Idle"),
                            react_1.default.createElement("option", { value: "dnd" }, "\uD83D\uDD34 Do Not Disturb"),
                            react_1.default.createElement("option", { value: "invisible" }, "\u26AB Invisible"))),
                    react_1.default.createElement("div", { className: "form-control w-full" },
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "Activity Type")),
                        react_1.default.createElement("select", { className: "select select-bordered w-full", value: ((_a = config.activity) === null || _a === void 0 ? void 0 : _a.type) || 'PLAYING', onChange: (e) => updateConfig('activity.type', e.target.value) },
                            react_1.default.createElement("option", { value: "PLAYING" }, "\uD83C\uDFAE Playing"),
                            react_1.default.createElement("option", { value: "STREAMING" }, "\uD83D\uDCFA Streaming"),
                            react_1.default.createElement("option", { value: "LISTENING" }, "\uD83C\uDFB5 Listening"),
                            react_1.default.createElement("option", { value: "WATCHING" }, "\uD83D\uDC40 Watching"),
                            react_1.default.createElement("option", { value: "COMPETING" }, "\u2694\uFE0F Competing"))),
                    react_1.default.createElement("div", { className: "form-control w-full md:col-span-2" },
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "Activity Name")),
                        react_1.default.createElement(DaisyUI_1.Input, { type: "text", placeholder: "What the bot is doing", value: ((_b = config.activity) === null || _b === void 0 ? void 0 : _b.name) || '', onChange: (e) => updateConfig('activity.name', e.target.value), className: "w-full" }))),
                react_1.default.createElement("div", { className: "divider my-6" }, "Features"),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" },
                    react_1.default.createElement("div", { className: "form-control" },
                        react_1.default.createElement("label", { className: "label cursor-pointer" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "\uD83C\uDFA4 Voice Support"),
                            react_1.default.createElement(DaisyUI_1.Checkbox, { checked: config.features.voiceSupport, onChange: (e) => updateConfig('features.voiceSupport', e.target.checked), className: "checkbox-primary" })),
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text-alt text-xs" }, "Enable voice channels and audio processing"))),
                    react_1.default.createElement("div", { className: "form-control" },
                        react_1.default.createElement("label", { className: "label cursor-pointer" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "\uD83D\uDCDD Message Logging"),
                            react_1.default.createElement(DaisyUI_1.Checkbox, { checked: config.features.messageLogging, onChange: (e) => updateConfig('features.messageLogging', e.target.checked), className: "checkbox-primary" })),
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text-alt text-xs" }, "Log messages for analytics"))),
                    react_1.default.createElement("div", { className: "form-control" },
                        react_1.default.createElement("label", { className: "label cursor-pointer" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "\uD83D\uDEE1\uFE0F Auto Moderation"),
                            react_1.default.createElement(DaisyUI_1.Checkbox, { checked: config.features.autoModeration, onChange: (e) => updateConfig('features.autoModeration', e.target.checked), className: "checkbox-primary" })),
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text-alt text-xs" }, "Enable automatic content moderation"))),
                    react_1.default.createElement("div", { className: "form-control" },
                        react_1.default.createElement("label", { className: "label cursor-pointer" },
                            react_1.default.createElement("span", { className: "label-text font-medium" }, "\uD83D\uDCCA Analytics"),
                            react_1.default.createElement(DaisyUI_1.Checkbox, { checked: config.features.analytics, onChange: (e) => updateConfig('features.analytics', e.target.checked), className: "checkbox-primary" })),
                        react_1.default.createElement("label", { className: "label" },
                            react_1.default.createElement("span", { className: "label-text-alt text-xs" }, "Track server statistics")))),
                testResult && (react_1.default.createElement("div", { className: `mb-6 alert ${testResult.success ? 'alert-success' : 'alert-error'}` },
                    react_1.default.createElement("div", { className: "flex items-center gap-3" },
                        react_1.default.createElement("span", null, testResult.success ? '✅' : '❌'),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("div", { className: "font-medium" }, testResult.success ? 'Connection Successful' : 'Connection Failed'),
                            react_1.default.createElement("div", { className: "text-sm opacity-80" }, testResult.message))))),
                react_1.default.createElement("div", { className: "flex flex-wrap gap-3" },
                    react_1.default.createElement(DaisyUI_1.Button, { variant: "primary", onClick: saveConfig, loading: loading, disabled: !config.botToken || !config.clientId }, "Save Configuration"),
                    react_1.default.createElement(DaisyUI_1.Button, { variant: "secondary", onClick: testConnection, loading: testing, disabled: !config.botToken || !config.clientId }, "Test Connection"),
                    react_1.default.createElement(DaisyUI_1.Button, { variant: "ghost", onClick: loadConfig }, "Reset"))))));
};
exports.default = DiscordConfiguration;
