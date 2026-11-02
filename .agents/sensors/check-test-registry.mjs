#!/usr/bin/env node
// Sensor: every API test file must be registered in apps/api/scripts/test.mjs.
// That runner lists test files explicitly, so an unregistered file would never run
// and `pnpm test` would stay green while the new tests are silently skipped.
// Exit 0 = ok (silent). Exit 1 = lists the unregistered files.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const testDir = path.join(root, 'apps/api/test');
const runner = path.join(root, 'apps/api/scripts/test.mjs');

if (!fs.existsSync(testDir) || !fs.existsSync(runner)) process.exit(0);

const runnerSrc = fs.readFileSync(runner, 'utf8');
const files = fs
  .readdirSync(testDir, { recursive: true })
  .map(String)
  .filter((f) => /\.test\.(m?[jt]s)$/.test(f))
  .map((f) => `test/${f.split(path.sep).join('/')}`);

const missing = files.filter((f) => !runnerSrc.includes(f));
if (missing.length) {
  console.error('Unregistered API test files (they would never run):');
  for (const f of missing) console.error(`  - apps/api/${f}`);
  console.error('Add each one to the list in apps/api/scripts/test.mjs:');
  console.error("  ['exec', 'tsx', '--test', 'test/<name>.test.ts']   // unit, TypeScript");
  console.error("  ['exec', 'node', '--test', 'test/<name>.test.mjs'] // HTTP/DB integration, runs after build");
  process.exit(1);
}
