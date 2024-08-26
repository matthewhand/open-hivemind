import Debug from "debug";
import * as votingUtils from '../message/helpers/votingUtils';
import ConfigurationManager from '@config/ConfigurationManager';

/**
 * Handles errors by logging them and potentially performing other actions.
 * This is a simplified placeholder for the previous handleError function.
 * 
 * @param {Error} error - The error to handle.
 */
function handleError(error: Error): void {
    debug('Error:', error.message);
}

export {
    aliasUtils,
    handleError,
    debug,
    votingUtils,
    ConfigurationManager
};
