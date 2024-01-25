const { exec } = require('child_process');

function startApp() {
    const process = exec('node index.js');

    process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    process.on('exit', (code, signal) => {
        console.log(`App process exited with code ${code}, signal ${signal}`);
        console.log('Restarting app...');
        startApp(); // Restart the app
    });
}

startApp();
