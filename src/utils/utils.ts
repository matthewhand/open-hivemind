import util from 'util';
import fs from 'fs';
import logger from './logger';

/**
 * Executes a shell command and returns the result.
 * 
 * @param command - The command to execute.
 * @returns A promise that resolves to the command output.
 */
export async function executeCommand(command: string): Promise<string> {
    logger.debug('Executing command: ' + command);
    const exec = util.promisify(require('child_process').exec);
    const { stdout, stderr } = await exec(command);
    if (stderr) {
        logger.error('Error executing command: ' + stderr);
    }
    logger.debug('CommandHandler output: ' + stdout);
    return stdout;
}

/**
 * Reads a file and returns its content.
 * 
 * @param filePath - The path to the file.
 * @returns A promise that resolves to the file content.
 */
export async function readFile(filePath: string): Promise<string> {
    logger.debug('Reading file: ' + filePath);
    const readFile = util.promisify(fs.readFile);
    const content = await readFile(filePath, 'utf8');
    logger.debug('File content: ' + content);
    return content;
}
