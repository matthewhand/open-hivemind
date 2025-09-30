#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');

const killPort = require('kill-port');
const treeKill = require('tree-kill');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PID_FILE = path.join(PROJECT_ROOT, '.dev-backend.pid');
const DEFAULT_PORT = Number(process.env.PORT || 3028);

const COLORS = {
  info: '\u001b[0;34m',
  success: '\u001b[0;32m',
  warning: '\u001b[1;33m',
  error: '\u001b[0;31m',
  reset: '\u001b[0m',
};

let activeChild = null;
let shuttingDown = false;

const log = {
  info: (message) => console.log(`${COLORS.info}[INFO]${COLORS.reset} ${message}`),
  success: (message) => console.log(`${COLORS.success}[SUCCESS]${COLORS.reset} ${message}`),
  warning: (message) => console.log(`${COLORS.warning}[WARNING]${COLORS.reset} ${message}`),
  error: (message) => console.error(`${COLORS.error}[ERROR]${COLORS.reset} ${message}`),
};

function readPidFile() {
  try {
    const contents = fs.readFileSync(PID_FILE, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    return null;
  }
}

function writePidFile(data) {
  fs.writeFileSync(PID_FILE, JSON.stringify(data), 'utf8');
}

function removePidFile() {
  if (fs.existsSync(PID_FILE)) {
    fs.unlinkSync(PID_FILE);
  }
}

function resolveBin(binName) {
  const extension = process.platform === 'win32' ? '.cmd' : '';
  return path.join(PROJECT_ROOT, 'node_modules', '.bin', `${binName}${extension}`);
}

function npmBinary() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
      shell: options.shell || false,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'EPERM') {
      return true; // Process exists but we lack permissions
    }
    return false;
  }
}

function killProcessTree(pid) {
  return new Promise((resolve) => {
    treeKill(pid, 'SIGTERM', (err) => {
      if (err && err.code !== 'ESRCH') {
        log.warning(`Unable to terminate process ${pid}: ${err.message}`);
        return resolve(false);
      }
      resolve(true);
    });
  });
}

async function cleanupProcesses({ silent = false } = {}) {
  const pidInfo = readPidFile();

  if (!pidInfo || !pidInfo.backendPid) {
    if (!silent) {
      log.info('No backend processes recorded.');
    }
    return;
  }

  const { backendPid } = pidInfo;

  if (!silent) {
    log.info(`Stopping backend process (pid ${backendPid})...`);
  }

  if (processExists(backendPid)) {
    await killProcessTree(backendPid);
  }

  removePidFile();

  if (!silent) {
    log.success('Cleanup complete.');
  }
}

async function ensurePortAvailable(port) {
  try {
    await killPort(port, 'tcp');
    log.info(`Freed port ${port} from previous processes.`);
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (message.includes('No process found on port') || message.includes('No process running on port')) {
      log.info(`Port ${port} is already free.`);
    } else {
      log.warning(`Could not automatically free port ${port}: ${error.message}`);
    }
  }
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 30000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(500);

      const onError = () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}.`));
        } else {
          setTimeout(attempt, 500);
        }
      };

      socket.once('error', onError);
      socket.once('timeout', onError);
      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.connect(port, host);
    };

    attempt();
  });
}

async function isPortInUse(port) {
  try {
    await waitForPort(port, '127.0.0.1', 1000);
    return true;
  } catch (error) {
    return false;
  }
}

async function startBackend() {
  log.info('Starting backend development server...');
  await cleanupProcesses({ silent: true });
  await ensurePortAvailable(DEFAULT_PORT);

  log.info('Building backend...');
  await runCommand(npmBinary(), ['run', 'build']);

  const nodemonPath = resolveBin('nodemon');
  if (!fs.existsSync(nodemonPath)) {
    throw new Error('Could not find local nodemon binary. Run `npm install` first.');
  }

  const runnerScript = path.join(__dirname, 'dev-runner.js');

  log.info(`Launching nodemon with ${runnerScript}...`);
  const child = spawn(nodemonPath, ['--watch', 'src', '--watch', 'config', '--ext', 'ts,tsx,js,json', runnerScript], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development', PORT: String(DEFAULT_PORT) },
    stdio: 'inherit',
  });

  activeChild = child;
  writePidFile({ backendPid: child.pid, startedAt: Date.now() });

  child.on('error', (err) => {
    log.error(`Backend process failed: ${err.message}`);
    removePidFile();
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    removePidFile();
    if (shuttingDown) {
      return;
    }

    if (signal) {
      log.warning(`Backend exited due to signal ${signal}.`);
      process.exit(1);
    }

    if (code !== 0) {
      log.error(`Backend exited with code ${code}.`);
      process.exit(code || 1);
    }

    process.exit(0);
  });

  try {
    await waitForPort(DEFAULT_PORT, '127.0.0.1', 30000);
    log.success(`Backend server started on http://localhost:${DEFAULT_PORT}`);
    log.info('Press Ctrl+C to stop.');
  } catch (error) {
    log.warning(`Backend did not bind to port ${DEFAULT_PORT} within 30s. Check logs for details.`);
  }

  return new Promise(() => {});
}

async function showStatus() {
  const pidInfo = readPidFile();
  if (!pidInfo || !pidInfo.backendPid) {
    log.info('No recorded backend process.');
  } else {
    const alive = processExists(pidInfo.backendPid);
    const status = alive ? 'running' : 'stopped';
    log.info(`Backend process (pid ${pidInfo.backendPid}) is ${status}.`);
  }

  const portUsed = await isPortInUse(DEFAULT_PORT);
  if (portUsed) {
    log.info(`Port ${DEFAULT_PORT} appears to be in use.`);
  } else {
    log.info(`Port ${DEFAULT_PORT} is free.`);
  }
}

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log.info('Shutting down development services...');

  if (activeChild && processExists(activeChild.pid)) {
    await killProcessTree(activeChild.pid);
  }

  await cleanupProcesses({ silent: true });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGUSR2', shutdown);

async function main() {
  const command = process.argv[2] || 'dev';

  try {
    switch (command) {
      case 'dev':
      case 'backend':
        await startBackend();
        break;
      case 'clean':
        await cleanupProcesses();
        await ensurePortAvailable(DEFAULT_PORT);
        break;
      case 'status':
        await showStatus();
        break;
      default:
        console.error('Usage: npm run dev [dev|backend|clean|status]');
        process.exit(1);
    }
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

main();
