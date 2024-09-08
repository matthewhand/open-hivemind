"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommand = executeCommand;
exports.readFile = readFile;
const debug_1 = __importDefault(require("debug"));
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const debug = (0, debug_1.default)('app:utils');
/**
 * Executes a shell command and returns the result.
 *
 * @param command - The command to execute.
 * @returns A promise that resolves to the command output.
 */
function executeCommand(command) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('Executing command: ' + command);
        const exec = util_1.default.promisify(require('child_process').exec);
        const { stdout, stderr } = yield exec(command);
        if (stderr) {
            debug('Error executing command: ' + stderr);
        }
        debug('Command output: ' + stdout);
        return stdout;
    });
}
/**
 * Reads a file and returns its content.
 *
 * @param filePath - The path to the file.
 * @returns A promise that resolves to the file content.
 */
function readFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('Reading file: ' + filePath);
        const readFile = util_1.default.promisify(fs_1.default.readFile);
        const content = yield readFile(filePath, 'utf8');
        debug('File content: ' + content);
        return content;
    });
}
