// Common UI elements and message types

// Common UI element interface – extend as needed
export interface ICommonUIElement {
  type: 'text' | 'button' | 'image' | 'embed';
  text?: string;
  url?: string;
  // Additional properties (e.g., action IDs for buttons) can be added here
}

// Common message interface that all provider messages are converted into
export interface ICommonMessage {
  text: string;
  senderId: string;
  channelId: string;
  timestamp: Date;
  uiElements?: ICommonUIElement[];
}
