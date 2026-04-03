const fs = require('fs');
let content = fs.readFileSync('src/server/routes/activity.ts', 'utf8');

let idx = content.indexOf('asyncErrorHandler(');
let pCount = 0, bCount = 0, inArrowBody = false;

let i = idx;
while (content[i] !== '(') i++;

for (; i < content.length; i++) {
   const char = content[i];
   if (char === '(') pCount++;
   else if (char === ')') pCount--;
   else if (char === '{') { bCount++; inArrowBody = true; }
   else if (char === '}') bCount--;
   
   if (char === "'" || char === '"' || char === '`') {
      const quote = char;
      i++;
      while (i < content.length) {
         if (content[i] === '\\') i += 2;
         else if (content[i] === quote) break;
         else i++;
      }
   }
   if (char === '/' && content[i+1] === '/') {
      while (i < content.length && content[i] !== '\n') i++;
   }
   if (char === '/' && content[i+1] === '*') {
      while (i < content.length && !(content[i] === '*' && content[i+1] === '/')) i++;
      i++;
   }
   
   if (inArrowBody && bCount === 0) {
       console.log("End of body found! pCount:", pCount, "char:", content[i]);
       break;
   }
}
