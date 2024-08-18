const util = require('util');
const fs = require('fs');
const logger = require('./logger');

/**
 * Executes a shell command and returns the result.
 * @param {string} command - The command to execute.
 * @returns {Promise<string>} The command output.
 */
async function executeCommand(command) {
    logger.debug('Executing command: ' + command);
    const exec = util.promisify(require('child_process').exec);
    const { stdout, stderr } = await exec(command);
    if (stderr) {
        logger.error('Error executing command: ' + stderr);
    }
    logger.debug('Command output: ' + stdout);
    return stdout;
}

/**
 * Reads a file and returns its content.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<string>} The file content.
 */
async function readFile(filePath) {
    logger.debug('Reading file: ' + filePath);
    const readFile = util.promisify(fs.readFile);
    const content = await readFile(filePath, 'utf8');
    logger.debug('File content: ' + content);
    return content;
}

module.exports = {
    executeCommand,
    readFile
};
