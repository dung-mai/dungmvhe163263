import { spawnSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';
try {
  loadEnvFile('.env');
} catch {
  /* CI can inject variables directly. */
}
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('/flashlab_test'))
  throw new Error('TEST_DATABASE_URL must target a separate flashlab_test database');
const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'test' };
for (const args of [
  ['db:migrate'],
  ['db:seed'],
  ['build'],
  ['exec', 'tsx', '--test', 'test/promotions.test.ts'],
  ['exec', 'node', '--test', 'test/catalog.test.mjs'],
]) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
