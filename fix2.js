const fs = require('fs');

const path = 'src/client/src/pages/GuardsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const usersInputSearch = `value={editingProfile.guards.mcpGuard.allowedUsers?.join(',') || ''}
                        onChange={e => updateGuard('mcpGuard', { allowedUsers: e.target.value.split(',') })}`;
const usersInputReplace = `value={editingProfile.guards.mcpGuard.allowedUsers?.join(', ') || ''}
                        onChange={e => updateGuard('mcpGuard', { allowedUsers: e.target.value.split(',').map(s => s.trimStart()) })}`;
content = content.replace(usersInputSearch, usersInputReplace);

const toolsInputSearch = `value={editingProfile.guards.mcpGuard.allowedTools?.join(',') || ''}
                      onChange={e => updateGuard('mcpGuard', { allowedTools: e.target.value.split(',') })}`;
const toolsInputReplace = `value={editingProfile.guards.mcpGuard.allowedTools?.join(', ') || ''}
                      onChange={e => updateGuard('mcpGuard', { allowedTools: e.target.value.split(',').map(s => s.trimStart()) })}`;
content = content.replace(toolsInputSearch, toolsInputReplace);

const blockedTermsSearch = `value={editingProfile.guards.contentFilter?.blockedTerms?.join(',') || ''}
                      onChange={e => updateGuard('contentFilter', { blockedTerms: e.target.value.split(',') })}`;
const blockedTermsReplace = `value={editingProfile.guards.contentFilter?.blockedTerms?.join(', ') || ''}
                      onChange={e => updateGuard('contentFilter', { blockedTerms: e.target.value.split(',').map(s => s.trimStart()) })}`;
content = content.replace(blockedTermsSearch, blockedTermsReplace);

fs.writeFileSync(path, content, 'utf8');
