const fs = require('fs');
const path = require('path');

function loadServerPolicy() {
    // Construct the path to serverPolicy.txt within the /config directory
    const txtPolicyPath = path.join(__dirname, '..', 'config', 'serverPolicy.txt');
    
    if (fs.existsSync(txtPolicyPath)) {
        // Read the policy from the txt file
        return fs.readFileSync(txtPolicyPath, 'utf8');
    } else {
        // Default one-liner policy with a hint for configuration
        return 'Default server policy: Respect all members and follow community guidelines. (This policy can be configured)';
    }
}

module.exports = loadServerPolicy;
