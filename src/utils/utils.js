const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');

const executePythonCodeBlocks = async (codeBlocks) => {
    const code = codeBlocks.join('\n');
    return new Promise((resolve, reject) => {
        const process = exec('python3 -c  + code + ', (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
};

module.exports = {
    executePythonCodeBlocks,
};
