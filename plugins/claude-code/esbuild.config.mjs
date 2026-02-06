import { build } from 'esbuild';
import fs from 'fs';

const COMMON_OPTIONS = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  minify: true,
  banner: {
    js: '#!/usr/bin/env node'
  },
  logLevel: 'info'
};

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync('plugin/scripts')) {
    fs.mkdirSync('plugin/scripts', { recursive: true });
  }

  console.log('Building hook.cjs...');
  await build({
    ...COMMON_OPTIONS,
    entryPoints: ['src/hook/index.ts'],
    outfile: 'plugin/scripts/hook.cjs',
  });

  console.log('Building mcp-server.cjs...');
  await build({
    ...COMMON_OPTIONS,
    entryPoints: ['src/mcp/index.ts'],
    outfile: 'plugin/scripts/mcp-server.cjs',
  });

  // Make scripts executable
  fs.chmodSync('plugin/scripts/hook.cjs', 0o755);
  fs.chmodSync('plugin/scripts/mcp-server.cjs', 0o755);

  console.log('Build complete!');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
