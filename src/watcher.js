const { exec } = require('child_process');

let restartDelay = 1000; // Initial delay in milliseconds (1 second)

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
        console.log(`Restarting app in ${restartDelay / 1000} seconds...`);

        setTimeout(() => {
            startApp(); // Restart the app after the delay
            increaseDelay(); // Increase delay for next restart
        }, restartDelay);
    });
}

function increaseDelay() {
    const randomFactor = Math.random() * 1000; // Random factor up to 1 second
    restartDelay = Math.min(restartDelay * 2 + randomFactor, 60000); // Cap maximum delay at 1 minute
}

startApp();
