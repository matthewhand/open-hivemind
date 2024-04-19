/**
 * Redacts sensitive information in logs.
 * 
 * @param {string} key - The key potentially associated with sensitive information.
 * @param {string} value - The value associated with the key.
 * @returns {string} - The redacted or original value, depending on the key.
 */
function redactSensitiveInfo(key, value) {
    if (key === 'apiKey') {
        return `${value.substring(0, 5)}*********${value.slice(-2)}`;
    }
    return value;
}

module.exports = {
    redactSensitiveInfo,
};
