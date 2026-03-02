const fs = require('fs');

const path = 'src/client/src/pages/GuardsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update Save Profile
const handleSaveProfileSearch = `
    if (!editingProfile.name.trim()) {
      showError('Profile name is required');
      return;
    }

    try {
      setSaving(true);
`;
const handleSaveProfileReplace = `
    if (!editingProfile.name.trim()) {
      showError('Profile name is required');
      return;
    }

    // Clean up arrays before saving
    const profileToSave = JSON.parse(JSON.stringify(editingProfile));
    if (profileToSave.guards.mcpGuard.allowedUsers) {
      profileToSave.guards.mcpGuard.allowedUsers = profileToSave.guards.mcpGuard.allowedUsers.map((s: string) => s.trim()).filter(Boolean);
    }
    if (profileToSave.guards.mcpGuard.allowedTools) {
      profileToSave.guards.mcpGuard.allowedTools = profileToSave.guards.mcpGuard.allowedTools.map((s: string) => s.trim()).filter(Boolean);
    }
    if (profileToSave.guards.contentFilter?.blockedTerms) {
      profileToSave.guards.contentFilter.blockedTerms = profileToSave.guards.contentFilter.blockedTerms.map((s: string) => s.trim()).filter(Boolean);
    }

    try {
      setSaving(true);
`;
content = content.replace(handleSaveProfileSearch, handleSaveProfileReplace);

const bodySearch = `
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProfile),
      });
`;
const bodyReplace = `
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileToSave),
      });
`;
content = content.replace(bodySearch, bodyReplace);

// Update input fields
const usersInputSearch = `value={editingProfile.guards.mcpGuard.allowedUsers?.join(', ') || ''}
                        onChange={e => updateGuard('mcpGuard', { allowedUsers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}`;
const usersInputReplace = `value={editingProfile.guards.mcpGuard.allowedUsers?.join(',') || ''}
                        onChange={e => updateGuard('mcpGuard', { allowedUsers: e.target.value.split(',') })}`;
content = content.replace(usersInputSearch, usersInputReplace);

const toolsInputSearch = `value={editingProfile.guards.mcpGuard.allowedTools?.join(', ') || ''}
                      onChange={e => updateGuard('mcpGuard', { allowedTools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}`;
const toolsInputReplace = `value={editingProfile.guards.mcpGuard.allowedTools?.join(',') || ''}
                      onChange={e => updateGuard('mcpGuard', { allowedTools: e.target.value.split(',') })}`;
content = content.replace(toolsInputSearch, toolsInputReplace);

const blockedTermsSearch = `value={editingProfile.guards.contentFilter?.blockedTerms?.join(', ') || ''}
                      onChange={e => updateGuard('contentFilter', { blockedTerms: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}`;
const blockedTermsReplace = `value={editingProfile.guards.contentFilter?.blockedTerms?.join(',') || ''}
                      onChange={e => updateGuard('contentFilter', { blockedTerms: e.target.value.split(',') })}`;
content = content.replace(blockedTermsSearch, blockedTermsReplace);

fs.writeFileSync(path, content, 'utf8');
