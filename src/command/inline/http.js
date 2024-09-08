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
exports.HTTPCommand = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('app:command:http');
/**
 * HTTPCommand class to handle HTTP requests.
 */
class HTTPCommand {
    constructor() {
        this.name = 'http';
        this.description = 'Executes HTTP requests. Usage: !http <url>';
    }
    /**
     * Executes the HTTP command.
     * @param args - The arguments passed with the HTTP command.
     * @returns A promise resolving with the execution result.
     */
    execute(args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (args.length === 0) {
                log('HTTPCommand: No URL provided');
                return { success: false, message: 'Please provide a URL.' };
            }
            const url = args[0];
            try {
                const response = yield (0, node_fetch_1.default)(url);
                const data = yield response.json();
                log('HTTPCommand: Successfully fetched data from ' + url);
                return { success: true, message: 'Data fetched successfully', data };
            }
            catch (error) {
                log('HTTPCommand: Error fetching data from ' + url + ' - ' + error.message);
                return { success: false, message: 'Failed to fetch data', error: error.message };
            }
        });
    }
}
exports.HTTPCommand = HTTPCommand;
