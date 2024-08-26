import Debug from "debug";
import { OpenAI } from "openai";

/**
 * Builds a request body for OpenAI API completions.
 *
 * This module prepares the data structure necessary for making requests to the OpenAI API.
 * It includes handling input validation, default value assignment, and logging.
 */

const debug = Debug("app:buildRequestBody");

export function buildRequestBody(historyMessages: any[]): object {
  // Guard clause for input validation
  if (!Array.isArray(historyMessages)) {
    debug("Invalid input: historyMessages must be an array");
    throw new Error("Invalid input: historyMessages must be an array");
  }

  debug("Building request body for history messages: ", historyMessages);

  // Build and return the request body
  return {
    model: "gpt-4",
    messages: historyMessages.map((msg) => ({
      role: msg.role || "user",
      content: msg.content,
    })),
    max_tokens: 150,
    temperature: 0.7,
  };
}

