#!/usr/bin/env node
// Sensor: every acceptance criterion in work/<feature>/spec.md must be mentioned (as "AC-n") in at least one test file.
// Convention: put the AC id in the test or describe name, e.g.  test('AC-3 sorts by price ascending', ...)
//
//   node .agents/sensors/check-ac-trace.mjs <feature> [--json]
//
// AC marked [manual] or [semi] in the spec are listed but not required to have an automated test.
// Exit 0 = every automated AC has a test, 1 = at least one is missing, 2 = nothing to check (no spec / no AC).
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
process.chdir(root);

const args = process.argv.slice(2);
const json = args.includes('--json');
let feature = args.find((a) => !a.startsWith('--'));
if (!feature) {
  const branch = (spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout || '').trim();
  feature = branch.replace(/^feat\//, '');
}
if (!feature) { console.error('Usage: check-ac-trace.mjs <feature> [--json]'); process.exit(2); }

const dir = path.join('work', feature);
const source = ['spec.md', 'design.md'].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f) && /\bAC-\d+\b/.test(fs.readFileSync(f, 'utf8')));
if (!source) {
  const msg = `Không tìm thấy AC-n trong ${dir}/spec.md hoặc design.md`;
  if (json) console.log(JSON.stringify({ source: null, ac: [], missing: [], manual: [], unknown: [], note: msg }));
  else console.error(msg);
  process.exit(2);
}

// AC definitions: "- **AC-1** ..." bullets or "| AC-1 | ..." table rows
const defs = new Map();
for (const line of fs.readFileSync(source, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*(?:[-*]\s*|\|\s*)\**AC-(\d+)\b/);
  if (!m) continue;
  const id = `AC-${m[1]}`;
  const mode = /\[(manual|semi)\]/i.exec(line)?.[1]?.toLowerCase() || 'auto';
  if (!defs.has(id)) defs.set(id, mode);
}

// test files: tracked or untracked, never ignored (so node_modules, build output and reports are skipped)
const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'apps', 'packages'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout || '';
const testFiles = listed.split(/\r?\n/).filter((f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) && fs.existsSync(f));

const found = new Map([...defs.keys()].map((id) => [id, []]));
const unknown = new Set();
for (const f of testFiles) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\bAC-(\d+)\b/g)) {
    const id = `AC-${m[1]}`;
    if (!defs.has(id)) { unknown.add(id); continue; }
    if (!found.get(id).includes(f)) found.get(id).push(f);
  }
}

const ac = [...defs].map(([id, mode]) => ({ id, mode, files: found.get(id) }));
const missing = ac.filter((a) => a.mode === 'auto' && !a.files.length).map((a) => a.id);
const manual = ac.filter((a) => a.mode !== 'auto').map((a) => a.id);

if (json) {
  console.log(JSON.stringify({ source, ac, missing, manual, unknown: [...unknown] }));
} else {
  for (const a of ac) console.log(`${a.id.padEnd(6)} ${a.mode.padEnd(6)} ${a.files.length ? `${a.files.length} file: ${a.files.slice(0, 2).join(', ')}` : a.mode === 'auto' ? 'KHÔNG CÓ TEST' : '(không bắt buộc)'}`);
  if (unknown.size) console.log(`\nTest nhắc tới AC không có trong spec: ${[...unknown].join(', ')}`);
  if (missing.length) console.error(`\nThiếu test cho ${missing.join(', ')}. Đặt mã AC vào tên test, ví dụ test('AC-1 …').`);
}
process.exit(missing.length ? 1 : 0);
