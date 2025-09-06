#!/usr/bin/env node

// Temporary workaround to run TypeScript files without tsx
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

process.env.NODE_ENV = 'development';

const serverPath = join(__dirname, 'server', 'index.ts');
const sucrasePath = join(__dirname, 'node_modules', '.bin', 'sucrase-node');

console.log('🔄 Starting development server...');

const child = spawn(process.execPath, [sucrasePath, serverPath], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--experimental-modules' }
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});