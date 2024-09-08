"use strict";
// Use a more universal approach for type compatibility
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractContent = extractContent;
/**
 * Extracts the content from the response choice provided by OpenAI.
 * @param choice - The response choice object from OpenAI.
 * @returns The extracted content as a string.
 */
function extractContent(choice) {
    var _a, _b;
    return ((_b = (_a = choice.message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || '';
}
