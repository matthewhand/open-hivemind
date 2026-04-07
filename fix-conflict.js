const fs = require('fs');
let file = 'src/client/src/pages/MarketplacePage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<<<<<<< Updated upstream\n          <><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n=======\n          <>\n            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n>>>>>>> Stashed changes/,
  '          <>\n            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">'
);

content = content.replace(
  /<<<<<<< Updated upstream\n          <\/div><\/>\n=======\n          <\/div>\n          <\/>\n>>>>>>> Stashed changes/,
  '          </div>\n          </>'
);

fs.writeFileSync(file, content);
