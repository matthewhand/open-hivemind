const fs = require('fs');

const files = [
    'src/server/routes/dashboard.ts',
    'src/server/routes/health.ts',
    'src/server/routes/bots.ts',
    'src/server/routes/enterprise.ts'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Handle `res.status(...).json(ApiResponse.success({ message: ... }))` and replace with `ApiResponse.error({ message: ... })` where appropriate,
    // wait no, standard error envelope has `error: string`. Let's check `dashboard.ts:460`
    // If it's a 4xx or 5xx status, it should likely be an error.

    let lines = content.split('\n');
    let outLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.includes('res.status(') && line.includes('ApiResponse.success(')) {
            let match = line.match(/res\.status\(([^)]+)\)/);
            if (match) {
                let status = match[1];
                if (status.includes('NOT_FOUND') || status.includes('BAD_REQUEST') || status.includes('UNAUTHORIZED') || status.includes('FORBIDDEN') || status.includes('INTERNAL_SERVER_ERROR')) {
                    // It's an error status, but wrapped in success
                    // Try to extract the message
                    let msgMatch = line.match(/message\s*:\s*([^,}]+)/);
                    if (msgMatch) {
                        let msg = msgMatch[1].trim();
                        // Change it to ApiResponse.error
                        let newCall = `ApiResponse.error(${msg})`;
                        line = line.replace(/ApiResponse\.success\(\{[^}]+\}\)/, newCall);
                    }
                }
            }
        }

        outLines.push(line);
    }

    fs.writeFileSync(file, outLines.join('\n'));
    console.log(`Processed ${file}`);
}
