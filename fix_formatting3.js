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
    let regex = /\.json\(ApiResponse\.success\(\{\n    ([\s\S]*?)  \}\)\)/g;
    content = content.replace(regex, (match, inner) => {
        return `.json(ApiResponse.success({\n    ${inner}  }))`;
    });

    // We can also let standard prettier or eslint fix it if available, or just leave it since the code is valid.

    fs.writeFileSync(file, content);
    console.log(`Processed ${file}`);
}
