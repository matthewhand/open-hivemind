class ConfigurationManager {
  constructor() {
    this.config = {};
  }
  get(key) {
    return this.config[key] || null;
  }
}
module.exports = new ConfigurationManager();