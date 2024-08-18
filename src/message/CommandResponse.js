/**
 * Abstract class representing a standardized response from executing a command.
 */
class CommandResponse {
    /**
     * Creates an instance of CommandResponse.
     * @param {boolean} success - Indicates if the command was executed successfully.
     * @param {string} message - The message or result of the command.
     * @param {any} [data] - Optional data returned by the command.
     * @param {string} [error] - Optional error message if the command failed.
     */
    constructor(success, message, data = null, error = null) {
        if (new.target === CommandResponse) {
            throw new Error("Abstract class CommandResponse cannot be instantiated directly.");
        }
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
    }

    /**
     * Gets the success status of the command response.
     * @returns {boolean}
     */
    isSuccess() {
        return this.success;
    }

    /**
     * Gets the message from the command response.
     * @returns {string}
     */
    getMessage() {
        return this.message;
    }

    /**
     * Gets the optional data from the command response.
     * @returns {any}
     */
    getData() {
        return this.data;
    }

    /**
     * Gets the error message if the command failed.
     * @returns {string}
     */
    getError() {
        return this.error;
    }
}

module.exports = CommandResponse;
