#!/usr/bin/env node

/**
 * Cross-platform startup script for VCP Stock Viewer
 * Automatically detects OS and uses appropriate commands
 * Works on macOS, Linux, and Windows
 */

const { exec, spawn } = require('child_process');
const os = require('os');
const path = require('path');

const platform = os.platform();
const BACKEND_PORT = 5001;
const FRONTEND_PORT = 3000;

console.log('🧹 Cleaning up existing processes...');
console.log(`   Platform: ${platform}`);

/**
 * Kill process on a specific port
 */
function killPort(port) {
  return new Promise((resolve) => {
    let command;

    if (platform === 'win32') {
      // Windows
      command = `netstat -ano | findstr :${port}`;
    } else {
      // macOS and Linux
      command = `lsof -ti:${port}`;
    }

    exec(command, (error, stdout) => {
      if (error || !stdout.trim()) {
        // No process found on this port
        resolve();
        return;
      }

      const pids = stdout.trim().split('\n');

      if (platform === 'win32') {
        // Windows: Extract PID from netstat output and kill
        const pidMatches = stdout.match(/\d+$/gm);
        if (pidMatches) {
          pidMatches.forEach(pid => {
            exec(`taskkill /F /PID ${pid}`, () => {});
          });
        }
      } else {
        // macOS and Linux
        pids.forEach(pid => {
          if (pid) {
            exec(`kill -9 ${pid}`, () => {});
          }
        });
      }

      console.log(`  ✓ Killed process(es) on port ${port}`);
      setTimeout(resolve, 500); // Wait a bit for processes to die
    });
  });
}

/**
 * Start the backend server
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('\n📡 Starting Backend API Server (port 5001)...');

    const backendProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Log backend output to file
    const fs = require('fs');
    const logStream = fs.createWriteStream('backend.log', { flags: 'w' });

    backendProcess.stdout.pipe(logStream);
    backendProcess.stderr.pipe(logStream);

    // Also show some output in console
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running on')) {
        console.log(`  ✓ Backend started (PID: ${backendProcess.pid})`);
      }
    });

    backendProcess.on('error', (err) => {
      console.error('❌ Backend failed to start:', err.message);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(`⚠️  Backend exited with code ${code}`);
      }
    });

    // Wait a bit for backend to start
    setTimeout(() => {
      if (backendProcess.exitCode === null) {
        resolve(backendProcess);
      } else {
        reject(new Error('Backend failed to start. Check backend.log for details.'));
      }
    }, 2000);
  });
}

/**
 * Start the frontend React app
 */
function startFrontend() {
  console.log('\n⚛️  Starting React Frontend (port 3000)...');
  console.log('  (This will open in your browser automatically)\n');

  const frontendPath = path.join(__dirname, 'web', 'vcp-viewer');

  // Use npm.cmd on Windows, npm on Unix
  const npmCommand = platform === 'win32' ? 'npm.cmd' : 'npm';

  const frontendProcess = spawn(npmCommand, ['start'], {
    cwd: frontendPath,
    stdio: 'inherit',
    shell: true
  });

  return frontendProcess;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Kill existing processes
    await killPort(BACKEND_PORT);
    await killPort(FRONTEND_PORT);

    console.log('\n🚀 Starting VCP Stock Viewer...');

    // Start backend
    const backendProcess = await startBackend();

    // Start frontend
    const frontendProcess = startFrontend();

    // Handle cleanup on exit
    const cleanup = () => {
      console.log('\n\n🛑 Shutting down servers...');

      try {
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill();
        }
        if (frontendProcess && !frontendProcess.killed) {
          frontendProcess.kill();
        }
      } catch (err) {
        // Ignore errors during cleanup
      }

      console.log('✅ All processes stopped');
      process.exit(0);
    };

    // Listen for termination signals
    process.on('SIGINT', cleanup);  // Ctrl+C
    process.on('SIGTERM', cleanup); // Kill command

    // If frontend exits, kill backend too
    frontendProcess.on('exit', () => {
      cleanup();
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Check backend.log for more details.');
    process.exit(1);
  }
}

// Run the script
main();
