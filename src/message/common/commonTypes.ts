/**
 * Common UI elements and message types for cross-platform compatibility.
 *
 * This module provides standardized interfaces for UI elements and messages
 * that work across different messaging platforms (Discord, Slack, etc.).
 */

/**
 * Represents a UI element that can be displayed across different platforms.
 *
 * This interface provides a common structure for various UI elements like
 * text, buttons, images, and embeds that can be rendered appropriately
 * on different messaging platforms.
 *
 * @interface
 * @example
 * ```typescript
 * const button: ICommonUIElement = {
 *   type: 'button',
 *   text: 'Click me',
 *   url: 'https://example.com'
 * };
 * ```
 */
export interface ICommonUIElement {
  /**
   * The type of UI element to display.
   * @type {'text' | 'button' | 'image' | 'embed'}
   */
  type: 'text' | 'button' | 'image' | 'embed';

  /**
   * The text content for the UI element.
   * Used for text, button labels, or embed descriptions.
   * @type {string}
   * @optional
   */
  text?: string;

  /**
   * The URL for the UI element.
   * Used for button links, image sources, or embed URLs.
   * @type {string}
   * @optional
   */
  url?: string;

  /**
   * Additional properties can be added here as needed.
   * For example: action IDs for buttons, embed titles, etc.
   */
  [key: string]: any;
}

/**
 * Common message interface that standardizes messages across platforms.
 *
 * This interface provides a unified structure for messages from different
 * messaging platforms, ensuring consistent handling regardless of the source.
 *
 * @interface
 * @example
 * ```typescript
 * const message: ICommonMessage = {
 *   text: "Hello, world!",
 *   senderId: "user123",
 *   channelId: "general",
 *   timestamp: new Date(),
 *   uiElements: [
 *     { type: 'button', text: 'Learn More', url: 'https://example.com' }
 *   ]
 * };
 * ```
 */
export interface ICommonMessage {
  /**
   * The text content of the message.
   * @type {string}
   */
  text: string;

  /**
   * The unique identifier of the message sender.
   * @type {string}
   */
  senderId: string;

  /**
   * The unique identifier of the channel where the message was sent.
   * @type {string}
   */
  channelId: string;

  /**
   * The timestamp when the message was created.
   * @type {Date}
   */
  timestamp: Date;

  /**
   * Optional array of UI elements to display with the message.
   * @type {ICommonUIElement[]}
   * @optional
   */
  uiElements?: ICommonUIElement[];
}
