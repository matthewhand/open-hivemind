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
exports.startVotingProcess = startVotingProcess;
exports.checkVotingEligibility = checkVotingEligibility;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:votingUtils');
/**
 * Simulates the process of starting a voting process for banning a user.
 *
 * This function initiates a simulated voting process to decide whether a user should be banned.
 * It logs the start of the process and returns a hardcoded result for demonstration purposes.
 *
 * @param userId - The ID of the user to start a ban vote for.
 * @returns A promise resolving with the result of the voting process.
 */
function startVotingProcess(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(`Starting voting process for user ID: ${userId}`);
        // Simulated voting process result
        return { votePassed: true };
    });
}
/**
 * Checks if the user is eligible to initiate a voting process this year.
 *
 * This function checks if a user is eligible to start a voting process. It logs the eligibility
 * check and returns a hardcoded boolean value indicating eligibility.
 *
 * @param userId - The ID of the user to check eligibility for.
 * @returns A boolean indicating if the user is eligible.
 */
function checkVotingEligibility(userId) {
    debug(`Checking voting eligibility for user ID: ${userId}`);
    // Simulated eligibility check
    return true;
}
