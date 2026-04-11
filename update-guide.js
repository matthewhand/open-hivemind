const fs = require('fs');

let content = fs.readFileSync('docs/USER_GUIDE.md', 'utf8');

const pluginSecurityContent = `
### [Plugin Security](/admin/plugin-security)
Monitor and manage security settings for all installed plugins.

![Plugin Security Dashboard](screenshots/plugin-security-dashboard.png)

*   **Plugin Overview**: View a list of all installed plugins, their trust level, signature validity, and capabilities.
*   **Trust Management**: Trust or revoke trust from community plugins. Trusted plugins are granted their required capabilities.
*   **Capability Inspection**: See exactly which system capabilities (e.g., network, filesystem) are granted, denied, or required by each plugin.
*   **Filtering**: Quickly filter plugins by their status (Trusted, Untrusted, Built-in, Verification Failed).
`;

// Insert into table of contents
content = content.replace(
  '  - [Audit & Governance](#audit--governance)',
  '  - [Audit & Governance](#audit--governance)\n  - [Plugin Security](#plugin-security)'
);

// Insert section
content = content.replace(
  '### [Audit & Governance](/admin/audit)',
  pluginSecurityContent + '\n### [Audit & Governance](/admin/audit)'
);

fs.writeFileSync('docs/USER_GUIDE.md', content);
