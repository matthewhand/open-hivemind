"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
class BaseCommand {
    constructor(name, description, allowedRoles) {
        this.name = name;
        this.description = description;
        this.allowedRoles = allowedRoles;
    }
    // Helper method to check if a user is allowed to execute the command
    isUserAllowed(userRoles) {
        if (!this.allowedRoles)
            return true; // No restrictions
        return userRoles.some(role => this.allowedRoles.includes(role));
    }
}
exports.BaseCommand = BaseCommand;
