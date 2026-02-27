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
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeSchema = serializeSchema;
/**
 * Serializes a convict configuration schema into a JSON-friendly format.
 * Primarily handles converting constructor functions (String, Number, etc.) in 'format' field to strings.
 */
function serializeSchema(schema) {
    if (schema === null || typeof schema !== 'object') {
        return schema;
    }
    if (Array.isArray(schema)) {
        return schema.map(function (item) { return serializeSchema(item); });
    }
    // If this object looks like a schema leaf node with a function format
    if ('format' in schema && typeof schema.format === 'function') {
        var copy = __assign({}, schema);
        var fnName = schema.format.name;
        copy.format = fnName || 'custom';
        // Recursively process other properties (e.g. default value might be an object)
        for (var key in copy) {
            if (key !== 'format') {
                copy[key] = serializeSchema(copy[key]);
            }
        }
        return copy;
    }
    var result = {};
    for (var key in schema) {
        if (Object.prototype.hasOwnProperty.call(schema, key)) {
            result[key] = serializeSchema(schema[key]);
        }
    }
    return result;
}
