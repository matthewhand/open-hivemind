const fs = require('fs');

let content = fs.readFileSync('src/client/src/components/BotManagement/BotCard.tsx', 'utf8');

// Add isUpdating to props
content = content.replace(
  /interface BotCardProps \{/,
  "interface BotCardProps {\n  isUpdating?: boolean;"
);

// Destructure it
content = content.replace(
  /const BotCard: React\.FC<BotCardProps> = \(\{\s*bot,\s*isSelected,\s*onPreview,\s*onEdit,\s*onDelete,\s*onToggleStatus\s*\}\) => \{/,
  "const BotCard: React.FC<BotCardProps> = ({ bot, isSelected, onPreview, onEdit, onDelete, onToggleStatus, isUpdating }) => {"
);

// Apply to buttons
content = content.replace(
  /<button\s+className="btn btn-sm btn-ghost btn-square text-error"\s+onClick=\{onDelete\}/g,
  '<button className="btn btn-sm btn-ghost btn-square text-error" onClick={onDelete} disabled={isUpdating}'
);

content = content.replace(
  /<button\s+className="btn btn-sm btn-ghost btn-square"\s+onClick=\{onEdit\}/g,
  '<button className="btn btn-sm btn-ghost btn-square" onClick={onEdit} disabled={isUpdating}'
);

content = content.replace(
  /onChange=\{onToggleStatus\}/g,
  'onChange={onToggleStatus} disabled={isUpdating}'
);

fs.writeFileSync('src/client/src/components/BotManagement/BotCard.tsx', content);
