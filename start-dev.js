const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting NexTask Backend and Frontend...');

// Start Express Server
const server = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true,
});

// Start Vite Client Dev Server
const client = spawn('cmd.exe', ['/c', 'npm run dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
