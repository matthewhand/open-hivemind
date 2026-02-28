"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRegistry = exports.ProviderRegistry = void 0;
var ProviderRegistry = /** @class */ (function () {
    function ProviderRegistry() {
        this.providers = new Map();
        this.installers = new Map();
    }
    ProviderRegistry.getInstance = function () {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    };
    ProviderRegistry.prototype.register = function (provider) {
        if (this.providers.has(provider.id)) {
            console.warn("Provider with id ".concat(provider.id, " already registered. Overwriting."));
        }
        this.providers.set(provider.id, provider);
    };
    ProviderRegistry.prototype.get = function (id) {
        return this.providers.get(id);
    };
    ProviderRegistry.prototype.getAll = function () {
        return Array.from(this.providers.values());
    };
    ProviderRegistry.prototype.getMessageProviders = function () {
        return this.getAll().filter(function (p) { return p.type === 'messenger'; });
    };
    ProviderRegistry.prototype.getLLMProviders = function () {
        return this.getAll().filter(function (p) { return p.type === 'llm'; });
    };
    ProviderRegistry.prototype.registerInstaller = function (installer) {
        this.installers.set(installer.id, installer);
    };
    ProviderRegistry.prototype.getInstaller = function (id) {
        return this.installers.get(id);
    };
    ProviderRegistry.prototype.getAllInstallers = function () {
        return Array.from(this.installers.values());
    };
    return ProviderRegistry;
}());
exports.ProviderRegistry = ProviderRegistry;
exports.providerRegistry = ProviderRegistry.getInstance();
