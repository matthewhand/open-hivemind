const { execSync } = require('child_process');

function generateDependencyReport() {
    try {
        const report = execSync('npm ls --json').toString();
        const reportObject = JSON.parse(report);
        return JSON.stringify(reportObject, null, 2);
    } catch (error) {
        console.error('Error generating dependency report:', error.message);
        return null;
    }
}

module.exports = { generateDependencyReport };
