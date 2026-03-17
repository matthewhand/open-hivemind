const fs = require('fs');
const content = fs.readFileSync('src/client/src/components/DaisyUI/StatsCards.tsx', 'utf8');
const fixed = content.replace(/const StatsCards: React.FC<StatsCardsProps> =/, 'export const StatsCards: React.FC<StatsCardsProps> =').replace(/export default StatsCards;/g, '');
fs.writeFileSync('src/client/src/components/DaisyUI/StatsCards.tsx', fixed + '\nexport default StatsCards;');
