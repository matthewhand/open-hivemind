const fs = require('fs');
let content = fs.readFileSync('docs/USER_GUIDE.md', 'utf8');

const replacement = '![Specifications Page](screenshots/specs-page.png)\n![Specification Details Page](screenshots/specs-detail-page.png)';

const target = '### [Specifications](/admin/specs)\n\n![Specifications Page](screenshots/specs-page.png)\n![Specification Details Page](screenshots/specs-detail-page.png)\n\n![Specifications Page](screenshots/specs-page.png)\n![Specification Details Page](screenshots/specs-detail-page.png)';
const correct = '### [Specifications](/admin/specs)\n\n![Specifications Page](screenshots/specs-page.png)\n![Specification Details Page](screenshots/specs-detail-page.png)';

content = content.replace(target, correct);
fs.writeFileSync('docs/USER_GUIDE.md', content);
