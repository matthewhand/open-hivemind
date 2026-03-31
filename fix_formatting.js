const fs = require('fs');

const files = [
    'src/server/routes/dashboard.ts',
    'src/server/routes/health.ts',
    'src/server/routes/bots.ts',
    'src/server/routes/enterprise.ts'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // we might have created some lines like: `.json(ApiResponse.success({status: status,`
    // Let's format it nicer: `.json(ApiResponse.success({\n    status: status,`

    let regex = /\.json\(ApiResponse\.success\(\{(.*?)\}\)\)/g;
    content = content.replace(regex, (match, inner) => {
        // if inner has newlines but doesn't start with one
        if (inner.includes('\n')) {
             if (!inner.startsWith('\n')) inner = '\n  ' + inner;
             if (!inner.endsWith('\n')) inner = inner + '\n';
        }
        return `.json(ApiResponse.success({${inner}}))`;
    });

    fs.writeFileSync(file, content);
    console.log(`Processed ${file}`);
}
