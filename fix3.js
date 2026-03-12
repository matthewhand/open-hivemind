const fs = require('fs');

const files = [
  'src/client/src/components/DaisyUI/StatsCards.tsx',
  'src/client/src/components/DaisyUI/Timeline.tsx',
  'src/client/src/components/Monitoring/MetricChart.tsx',
  'src/client/src/components/Monitoring/MonitoringDashboard.tsx',
  'src/client/src/pages/SystemManagement.tsx',
  'src/client/src/pages/ActivityPage.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix StatsCards specifically
  if (file.includes('StatsCards.tsx')) {
    content = content.replace(/React\.const timerRef = useRef<number \| null>\(null\);useEffect/g, 'const timerRef = React.useRef<number | null>(null);\n  React.useEffect');
  }

  // Remove duplicate timerRef declarations
  // A simple way is to match all occurrences and replace all but the first one, or carefully remove them
  // We know we injected them via the previous script near `useEffect(`

  const timerRefDecl = 'const timerRef = useRef<number | null>(null);';
  const matches = content.split(timerRefDecl);

  if (matches.length > 2) {
    // There are duplicates. Let's keep the first occurrence and remove the others
    content = matches[0] + timerRefDecl + matches.slice(1).join('').replace(/\n\s*const timerRef = useRef<number \| null>\(null\);/g, '');
  }

  // Double check
  // Actually, wait, some components might have multiple useEffects but should only have ONE timerRef per component.
  // We can just do a regex to replace multiple `const timerRef` inside the same file if there's only one component,
  // OR we can just replace the ones that are right next to `useEffect` if they are already declared at the top of the component.
  // Actually the safest way is to just do a clean pass: remove all `const timerRef = useRef<number | null>(null);`
  // and manually re-add them if we need them? No, we just need to ensure there is only one per component.

  fs.writeFileSync(file, content);
  console.log('Fixed duplicates in', file);
}
