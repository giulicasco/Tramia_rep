#!/usr/bin/env node

// Startup script that ensures tsx is available and runs the development server
import { spawn } from 'child_process';

// Set environment
process.env.NODE_ENV = 'development';

console.log('🔄 Starting Tramia development server...');
console.log('📦 Using npx to ensure dependencies are available...');

// Run the server using npx tsx to ensure tsx is available
const child = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
  }
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});