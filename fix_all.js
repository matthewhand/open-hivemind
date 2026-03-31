const fs = require('fs');

const files = [
    'src/server/routes/dashboard.ts',
    'src/server/routes/health.ts',
    'src/server/routes/bots.ts',
    'src/server/routes/enterprise.ts'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // add import
    if (!content.includes('import { ApiResponse }')) {
        let lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                lastImportIndex = i;
            }
        }
        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, "import { ApiResponse } from '../../utils/apiResponse';");
            content = lines.join('\n');
        } else {
            content = "import { ApiResponse } from '../../utils/apiResponse';\n" + content;
        }
    }

    // Since regex/AST have failed to preserve formatting properly in previous attempts without breaking things, let's use a very basic regex replacement

    // We can do this: replace `.json({` with `.json(ApiResponse.success({` and append `))`
    // But we need to handle errors differently.

    let regex = /res\.status\(([^)]+)\)\.json\(\s*\{\s*([\s\S]*?)\s*\}\s*\)/g;

    let newContent = content.replace(regex, (match, status, inner) => {
        // match could be spanning multiple lines. We capture `status` and `inner`.

        let trimmed = inner.trim();

        // Error case: contains "error: " and no "success: "
        if ((trimmed.startsWith('error:') || trimmed.includes('\n  error:') || trimmed.includes('\n      error:')) && !trimmed.includes('success:')) {
            // Find the error value
            let errMatch = trimmed.match(/error:\s*([^,}\n]+)/);
            let codeMatch = trimmed.match(/code:\s*([^,}\n]+)/);
            let detailsMatch = trimmed.match(/details:\s*([^,}\n]+)/);

            let errMsg = errMatch ? errMatch[1].trim() : 'Unknown Error';
            if (errMsg.endsWith(',')) errMsg = errMsg.slice(0, -1);

            let codeMsg = 'undefined';
            if (codeMatch) {
                codeMsg = codeMatch[1].trim();
                if (codeMsg.endsWith(',')) codeMsg = codeMsg.slice(0, -1);
            }

            let detailsMsg = null;
            if (detailsMatch) {
                detailsMsg = detailsMatch[1].trim();
                if (detailsMsg.endsWith(',')) detailsMsg = detailsMsg.slice(0, -1);
            }

            if (detailsMsg) {
                return `res.status(${status}).json(ApiResponse.error(${errMsg}, ${codeMsg}, ${detailsMsg}))`;
            } else if (codeMsg !== 'undefined') {
                return `res.status(${status}).json(ApiResponse.error(${errMsg}, ${codeMsg}))`;
            } else {
                return `res.status(${status}).json(ApiResponse.error(${errMsg}))`;
            }
        }

        // Success case:
        // remove `success: true` or `success: false`
        let noSuccess = trimmed.replace(/(?:^|[\n\s,])success\s*:\s*(true|false)\s*,?/g, '');
        noSuccess = noSuccess.trim();

        if (noSuccess.startsWith(',')) noSuccess = noSuccess.substring(1).trim();
        if (noSuccess.endsWith(',')) noSuccess = noSuccess.substring(0, noSuccess.length - 1).trim();

        if (noSuccess === '') {
            return `res.status(${status}).json(ApiResponse.success())`;
        } else {
            // we want to preserve inner formatting. `inner` might have `success: true` in it.
            // Let's just do a naive replace on inner for success:true/false
            let cleanedInner = inner.replace(/\n*\s*success\s*:\s*(true|false)\s*,?/g, '');
            // trim empty lines if any? no let's just leave them
            return `res.status(${status}).json(ApiResponse.success({${cleanedInner}}))`;
        }
    });

    fs.writeFileSync(file, newContent);
    console.log(`Processed ${file}`);
}
