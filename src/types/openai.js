'use strict';
/**
 * OpenAI API response types and interfaces
 *
 * Provides strongly-typed interfaces for OpenAI API responses
 * to replace 'any' usage in OpenAI integrations.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.isOpenAIError = isOpenAIError;
exports.isChatCompletionResponse = isChatCompletionResponse;
exports.isModelsListResponse = isModelsListResponse;
exports.isCompletionResponse = isCompletionResponse;
// Type guards
function isOpenAIError(response) {
  return 'error' in response;
}
function isChatCompletionResponse(response) {
  return 'object' in response && response.object === 'chat.completion';
}
function isModelsListResponse(response) {
  return (
    'object' in response &&
    response.object === 'list' &&
    'data' in response &&
    Array.isArray(response.data) &&
    response.data.length > 0 &&
    'id' in response.data[0]
  );
}
function isCompletionResponse(response) {
  return 'object' in response && response.object === 'text_completion';
}
