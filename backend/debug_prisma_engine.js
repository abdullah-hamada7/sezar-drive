const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function debug() {
  console.log('--- Prisma Diagnostic ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PRISMA_CLIENT_ENGINE_TYPE:', process.env.PRISMA_CLIENT_ENGINE_TYPE);
  
  try {
    const { getRuntime } = require('@prisma/client/runtime/library');
    const runtime = getRuntime();
    console.log('getRuntime().type:', runtime.type);
    console.log('getRuntime().wasm:', !!runtime.wasm);
  } catch (e) {
    console.log('Could not call getRuntime:', e.message);
  }

  try {
    const prisma = new PrismaClient();
    console.log('PrismaClient initialized successfully (unexpectedly?).');
  } catch (e) {
    console.log('Caught expected/unexpected error:', e.message);
    if (e.stack) {
      console.log('Stack Trace Snippet:', e.stack.split('\n').slice(0, 5).join('\n'));
    }
  }

  const generatedPath = path.resolve('node_modules/.prisma/client/index.js');
  if (fs.existsSync(generatedPath)) {
    const content = fs.readFileSync(generatedPath, 'utf8');
    const engineTypeMatch = content.match(/"engineType":\s*"([^"]+)"/);
    console.log('Engine Type in generated index.js:', engineTypeMatch ? engineTypeMatch[1] : 'NOT FOUND');
  } else {
    console.log('Generated index.js NOT FOUND at:', generatedPath);
  }

  console.log('--- End Diagnostic ---');
}

debug();
