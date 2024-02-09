// src/config/configurationManager.js

class ConfigurationManager {
    constructor() {
      this.config = {};
    }
  
    loadConfig() {
      // The existing loadConfig logic here
    }
  
    getConfig(key) {
      return this.config[key];
    }
  
    setConfig(key, value) {
      this.config[key] = value;
      // Optionally save to file or handle dynamic updates
    }
  
    // Extend with any specific methods needed for configuration operations
  }
  
  const configManager = new ConfigurationManager();
  configManager.loadConfig(); // Ensure config is loaded at startup
  
  module.exports = configManager;
  