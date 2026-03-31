const fs = require('fs');

const files = [
    'src/server/routes/dashboard.ts',
    'src/server/routes/health.ts',
    'src/server/routes/bots.ts',
    'src/server/routes/enterprise.ts'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // This regex catches the specific bad formatting
    let regex = /\.json\(ApiResponse\.success\(\{([\s\S]*?)\}\)\)/g;
    content = content.replace(regex, (match, inner) => {
        if (inner.includes('\n')) {
             if (!inner.startsWith('\n')) inner = '\n    ' + inner;
             if (!inner.endsWith('\n  ')) {
                if (inner.endsWith('\n')) inner += '  ';
                else inner += '\n  ';
             }
        }
        return `.json(ApiResponse.success({${inner}}))`;
    });

    fs.writeFileSync(file, content);
    console.log(`Processed ${file}`);
}
