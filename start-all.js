import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[32m%s\x1b[0m', ' ⚡ Meta Chat is Starting (Server + Client)...');
console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[33m%s\x1b[0m', ' 📱 Frontend App   : http://localhost:5173');
console.log('\x1b[34m%s\x1b[0m', ' ⚙️  Backend Server : http://localhost:5000');
console.log('\x1b[35m%s\x1b[0m', ' 📡 WebSocket Path : ws://localhost:5000/ws');
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

const server = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: isWin ? 'cmd.exe' : false,
});

const client = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  shell: isWin ? 'cmd.exe' : false,
});

server.on('error', (err) => {
  console.error('\x1b[31m[Server Error]:\x1b[0m', err);
});

client.on('error', (err) => {
  console.error('\x1b[31m[Client Error]:\x1b[0m', err);
});

process.on('SIGINT', () => {
  console.log('\nStopping OromoChat services...');
  server.kill();
  client.kill();
  process.exit();
});
