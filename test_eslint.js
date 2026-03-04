const fs = require('fs');
let content = fs.readFileSync('src/client/src/components/SearchFilterBar.tsx', 'utf8');
if (content.includes("console.log") || content.includes("any") || content.includes("@ts-ignore")) {
  console.log("Found bad things in SearchFilterBar.tsx");
}
content = fs.readFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', 'utf8');
if (content.includes("console.log") || content.includes("any") || content.includes("@ts-ignore")) {
  console.log("Found bad things in SearchFilterBar.test.tsx");
}
