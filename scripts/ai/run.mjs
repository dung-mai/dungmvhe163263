#!/usr/bin/env node
// AI delivery flow orchestrator — one command runs the whole feature pipeline.
//
//   pnpm ai <feature> "<request>"     start a new feature
//   pnpm ai <feature>                 resume where it stopped
//
// Options
//   --yes            auto-approve every human gate (good for vibe tasks / demos)
//   --dry-run        print the plan (lanes, engines, models, fallbacks) and exit
//   --profile <p>    force vibe | standard | full instead of what intake decides
//   --from <lane>    re-run from this lane (forgets later lanes)
//   --only <lane>    run a single lane and stop
//   --quiet          hide agent output, show only progress lines
//
// Routing, fallbacks and limits live in .agents/models.env. No dependencies, Node >= 20.

import { spawn, spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

// ---------- setup ----------
const root = execSync('git rev-parse --show-toplevel').toString().trim();
process.chdir(root);

const tty = process.stdout.isTTY;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const bold = c('1'), dim = c('2'), red = c('31'), green = c('32'), yellow = c('33'), blue = c('34'), magenta = c('35'), cyan = c('36');
const engineColor = { claude: magenta, codex: cyan, deepseek: blue, 'deepseek-cc': blue };

const args = process.argv.slice(2);
const flags = { yes: false, dryRun: false, quiet: false, profile: null, from: null, only: null };
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--yes' || a === '-y') flags.yes = true;
  else if (a === '--dry-run') flags.dryRun = true;
  else if (a === '--quiet') flags.quiet = true;
  else if (a === '--profile') flags.profile = args[++i];
  else if (a === '--from') flags.from = args[++i];
  else if (a === '--only') flags.only = args[++i];
  else if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
  else positional.push(a);
}
const [feature, request] = positional;
if (!feature) { printHelp(); process.exit(1); }
if (!/^[a-z0-9-]+$/.test(feature)) die('Feature must be a kebab-case slug, e.g. product-sort');

const cfg = loadEnv('.agents/models.env');
const dir = path.join('work', feature);
const statePath = path.join(dir, '.run-state.json');

const LANES = {
  intake:      { skill: 'intake',          out: 'brief.md' },
  define:      { skill: 'define',          out: 'spec.md' },
  design:      { skill: 'design',          out: 'design.md' },
  'test-plan': { skill: 'test-plan',       out: 'test-plan.md' },
  build:       { skill: 'build',           out: 'plan.md' },
  verify:      { skill: 'verify',          out: 'review.md' },
  security:    { skill: 'security-review', out: 'security.md' },
  pr:          { skill: 'create-pr',       out: 'pr.md' },
};

// gates: which lane ends with which human approval, per profile.
// security runs right after verify when the profile is full OR intake flagged a risk (risk beats profile).
const PROFILES = {
  vibe:     { lanes: ['intake', 'design', 'build', 'verify', 'security'],                              gates: { design: 'G2' } },
  standard: { lanes: ['intake', 'define', 'design', 'test-plan', 'build', 'verify', 'security', 'pr'], gates: { design: 'G1+G2', pr: 'G3' } },
  full:     { lanes: ['intake', 'define', 'design', 'test-plan', 'build', 'verify', 'security', 'pr'], gates: { define: 'G1', design: 'G2', pr: 'G3' } },
};
const needSecurity = (state, profile) => profile.name === 'full' || (state.risks || []).length > 0;

const MAX_FIX_ROUNDS = Number(cfg.MAX_FIX_ROUNDS || 2);
const COOLDOWN_MS = Number(cfg.LIMIT_COOLDOWN_MIN || 60) * 60_000;
const AUTO_COMMIT = (cfg.AUTO_COMMIT_ARTIFACTS ?? '1') !== '0';
const LIMIT_RE = /(usage limit|rate.?limit|quota (exceeded|reached)|exceeded your|insufficient (balance|credit)|credit balance is too low|too many requests|\b429\b|limit reached|try again (in|after|later))/i;

// ---------- input from the human (works for TTY and piped stdin) ----------
let lineIter = null;
async function ask(question) {
  if (!lineIter) {
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    lineIter = rl[Symbol.asyncIterator]();
    process.on('exit', () => rl.close());
  }
  process.stdout.write(question);
  const { value, done } = await lineIter.next();
  if (!tty) process.stdout.write((done ? '' : value) + '\n');
  return done ? 'q' : String(value).trim();
}

// ---------- main ----------
await main();

async function main() {
  ensureFeature();
  const state = loadState();

  if (flags.from) {
    if (!LANES[flags.from]) die(`Unknown lane for --from: ${flags.from}`);
    const keepUntil = Object.keys(LANES).indexOf(flags.from);
    state.done = state.done.filter((l) => Object.keys(LANES).indexOf(l) < keepUntil);
    if (Object.keys(LANES).indexOf(flags.from) <= Object.keys(LANES).indexOf('verify')) state.fixRounds = 0;
    saveState(state);
  }

  if (flags.only) {
    if (!LANES[flags.only]) die(`Unknown lane for --only: ${flags.only}`);
    const ok = await runLane(state, flags.only);
    finish(state, ok ? 'done' : 'stopped');
    return;
  }

  banner(state);

  if (flags.dryRun) { printPlan(state, resolveProfile(state)); process.exit(0); }

  // lane 0 decides the profile, so it runs before the plan is final
  if (!state.done.includes('intake')) {
    if (!(await runLane(state, 'intake'))) return finish(state, 'stopped');
  }
  const profile = resolveProfile(state);
  state.profile = profile.name;
  saveState(state);
  printPlan(state, profile);

  const lanes = profile.lanes;
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    if (lane === 'intake' || lane === 'security') continue; // security is driven by the quality loop
    if (state.done.includes(lane)) {
      const pending = profile.gates[lane];
      if (pending && !state.gates[pending]) { // resumed after pausing at a gate: ask again, never skip it
        if ((await humanGate(state, lane, pending)) === 'quit') return finish(state, 'paused at ' + pending);
      }
      if (lane === 'verify') { // resumed after verify: make sure the quality loop finished
        if ((await qualityLoop(state, profile)) === 'stop') return finish(state, 'needs human');
      }
      continue;
    }

    // build ‖ test-plan in parallel
    if (lane === 'test-plan' && lanes[i + 1] === 'build') {
      const jobs = ['test-plan', 'build'].filter((l) => !state.done.includes(l));
      log(bold(`\n⇉ Song song: ${jobs.join(' ‖ ')}`));
      const results = await Promise.all(jobs.map((l) => runLane(state, l, { parallel: true })));
      if (results.includes(false)) return finish(state, 'stopped');
      i++; // build handled
      continue;
    }

    if (!(await runLane(state, lane))) return finish(state, 'stopped');

    const gate = profile.gates[lane];
    if (gate && !state.gates[gate]) {
      const verdict = await humanGate(state, lane, gate);
      if (verdict === 'quit') return finish(state, 'paused at ' + gate);
    }

    if (lane === 'verify') {
      if ((await qualityLoop(state, profile)) === 'stop') return finish(state, 'needs human');
    }
  }
  finish(state, 'done');
}

// ---------- lanes ----------
async function runLane(state, lane, opts = {}) {
  const key = laneKey(lane);
  const primary = cfg[`ENGINE_${key}`] || 'claude';
  let chain = unique([primary, ...splitList(cfg[`FALLBACK_${key}`] ?? cfg.FALLBACK_DEFAULT ?? 'claude codex deepseek')]);

  // independence rule: reviewers must not be the engine that built
  if ((lane === 'verify' || lane === 'security') && state.builtBy) {
    const filtered = chain.filter((e) => e !== state.builtBy);
    if (filtered.length) chain = filtered;
    else warn(`${lane}: mọi engine đều là ${state.builtBy}, review sẽ không độc lập.`);
  }

  // engines that hit a quota recently are skipped for LIMIT_COOLDOWN_MIN minutes (unless nothing else is left)
  const cooling = (e) => state.cooldown?.[e] && Date.now() - Date.parse(state.cooldown[e]) < COOLDOWN_MS;
  const fresh = chain.filter((e) => !cooling(e));
  if (fresh.length && fresh.length < chain.length) {
    log(dim(`  (bỏ qua tạm ${chain.filter(cooling).join(', ')}: vừa hết quota)`));
    chain = fresh;
  }

  let previous = null;
  for (const engine of chain) {
    const model = engine === primary ? cfg[`MODEL_${key}`] || '' : engine === 'deepseek' ? cfg.DEEPSEEK_MODEL || '' : '';
    const prompt = buildPrompt(state, lane, { previous, extra: opts.extra });
    const t0 = Date.now();
    const label = `${lane}·${engine}${model ? `(${model.split('/').pop()})` : ''}`;
    log(`\n${bold('▶')} ${bold(lane)} ${dim('→')} ${(engineColor[engine] || ((s) => s))(engine)}${model ? dim(' ' + model) : ''}`);

    const { code, tail, logFile } = await spawnEngine(engine, model, prompt, lane, { prefix: opts.parallel ? label : null });
    const ms = Date.now() - t0;
    // Failure = non-zero exit, or a very short output that is only a quota/limit message.
    // (Long outputs may legitimately mention "rate limit", e.g. when the task is to add login throttling.)
    const limited = code !== 0 || (tail.trim().length < 600 && LIMIT_RE.test(tail));
    state.history.push({ lane, engine, model: model || 'default', ms, ok: !limited, at: new Date().toISOString(), log: logFile });
    saveState(state);

    if (!limited) {
      if (lane === 'build') state.builtBy = engine;
      state.done = unique([...state.done, lane]);
      saveState(state);
      log(`${green('✔')} ${lane} ${dim(`(${engine}, ${fmtMs(ms)})`)}`);
      return true;
    }
    const quota = LIMIT_RE.test(tail.slice(-1500));
    if (quota) { state.cooldown = { ...(state.cooldown || {}), [engine]: new Date().toISOString() }; saveState(state); }
    warn(`${lane}: ${engine} dừng (exit ${code}${quota ? ', có vẻ hết quota/rate limit' : ''}). Chuyển engine tiếp theo…`);
    previous = engine;
  }
  err(`${lane}: hết engine dự phòng. Xem log trong ${dir}/logs/ rồi chạy lại: pnpm ai ${feature}`);
  return false;
}

function buildPrompt(state, lane, { previous, extra }) {
  const L = LANES[lane];
  const profileNote = state.profile === 'vibe' && lane === 'design'
    ? 'Profile is vibe: there is no define lane. Put a short "Acceptance criteria" list (AC-1..n) at the top of design.md, then design and plan as usual.\n'
    : '';
  const gateNote = state.profile === 'standard' && lane === 'design'
    ? 'Profile is standard: gates G1 and G2 are reviewed together after this lane, so make sure spec.md is final too.\n'
    : '';
  return [
    `Feature: ${feature}. Lane: ${lane}. Profile: ${state.profile || 'not decided yet'}.`,
    `Read AGENTS.md, then ${dir}/status.md and ${dir}/brief.md.`,
    `Follow .agents/skills/${L.skill}/SKILL.md exactly. All inputs and outputs for this feature live in ${dir}/.`,
    profileNote + gateNote,
    previous ? `A previous engine (${previous}) stopped before finishing this lane. Read ${dir}/status.md and git log, continue from where it stopped, do not redo finished work.` : '',
    extra || '',
    'You run non-interactively inside an orchestrator: never wait for answers; write open questions into the artifact.',
    `When finished, follow .agents/skills/handoff/SKILL.md to update ${dir}/status.md. Do not start the next lane.`,
  ].filter(Boolean).join('\n');
}

function spawnEngine(engine, model, fullPrompt, lane, { prefix }) {
  const logDir = path.join(dir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const base = path.join(logDir, `${stamp()}-${lane}-${engine}`);
  const logFile = `${base}.log`;
  fs.writeFileSync(`${base}.prompt.md`, fullPrompt);

  // Windows shells mangle long multi-line arguments: hand the agent a one-line pointer to the prompt file instead.
  const win = process.platform === 'win32';
  const prompt = win ? `Read the file ${base.replace(/\\/g, '/')}.prompt.md and follow its instructions exactly.` : fullPrompt;
  let [cmd, argv] = engineCommand(engine, model, prompt);
  if (win) argv = argv.map((a) => (/\s/.test(a) ? `"${a}"` : a));

  const out = fs.createWriteStream(logFile);
  out.write(`$ ${cmd} ${argv.map((a) => (a.includes(' ') ? JSON.stringify(a.slice(0, 80) + (a.length > 80 ? '…' : '')) : a)).join(' ')}\n\n`);

  return new Promise((resolve) => {
    let tail = '';
    let child;
    try {
      child = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env, shell: win });
    } catch (e) {
      out.end(String(e));
      return resolve({ code: 127, tail: String(e), logFile });
    }
    const onData = (buf) => {
      const s = buf.toString();
      out.write(s);
      tail = (tail + s).slice(-4000);
      if (flags.quiet) return;
      const text = prefix ? s.replace(/^(?=.)/gm, dim(`[${prefix}] `)) : s;
      process.stdout.write(text);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (e) => { tail += String(e); });
    child.on('close', (code) => { out.end(); resolve({ code: code ?? 1, tail, logFile }); });
  });
}

function engineCommand(engine, model, prompt) {
  switch (engine) {
    case 'claude':
      return ['claude', ['-p', prompt, '--permission-mode', 'acceptEdits', ...(model ? ['--model', model] : [])]];
    case 'codex':
      return ['codex', ['exec', '--sandbox', cfg.CODEX_SANDBOX || 'workspace-write', ...(model ? ['-m', model] : []), prompt]];
    case 'deepseek':
      return ['opencode', ['run', '-m', model || cfg.DEEPSEEK_MODEL || 'deepseek/deepseek-v4-flash', prompt]];
    case 'deepseek-cc':
      if (!cfg.DEEPSEEK_CC_SETTINGS) die('Set DEEPSEEK_CC_SETTINGS in .agents/models.env to use engine deepseek-cc');
      return ['claude', ['--settings', cfg.DEEPSEEK_CC_SETTINGS, '-p', prompt, '--permission-mode', 'acceptEdits']];
    default:
      die(`Unknown engine: ${engine}`);
  }
}

// ---------- gates ----------
async function humanGate(state, lane, gate) {
  const files = gate === 'G1+G2' ? ['spec.md', 'design.md', 'plan.md'] : gate === 'G1' ? ['spec.md'] : gate === 'G2' ? ['design.md', 'plan.md'] : ['pr.md', 'review.md', 'security.md'];
  const existing = files.map((f) => path.join(dir, f)).filter((f) => fs.existsSync(f));

  log('\n' + yellow(bold(`━━━ ${gate} · cần bạn duyệt ━━━`)));
  for (const f of existing) log(`  📄 ${f}  ${dim(`(${countLines(f)} dòng)`)}`);
  const last = [...state.history].reverse().find((h) => h.lane === lane && h.ok);
  if (last) {
    const summary = tailLines(last.log, 12);
    if (summary.trim()) log(dim('  ── tóm tắt từ agent ──\n') + summary.replace(/^/gm, '  '));
  }

  if (flags.yes) { log(green(`  ✔ ${gate} tự duyệt (--yes)`)); return approve(state, gate); }

  for (;;) {
    const a = (await ask(`\n  [a] duyệt   [e] mở file để sửa   [r] yêu cầu làm lại kèm góp ý   [q] dừng, chạy tiếp sau\n  ${gate} > `)).toLowerCase();
    if (a === 'a' || a === 'y') return approve(state, gate);
    if (a === 'q' || a === '') { log(dim(`  Đã lưu. Chạy tiếp: pnpm ai ${feature}`)); return 'quit'; }
    if (a === 'e') {
      const editor = process.env.VISUAL || process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'nano');
      for (const f of existing) spawnSync(editor, [f], { stdio: 'inherit', shell: process.platform === 'win32' });
      continue;
    }
    if (a === 'r') {
      const fb = await ask('  Góp ý (một dòng): ');
      if (!fb) continue;
      state.done = state.done.filter((l) => l !== lane);
      saveState(state);
      const ok = await runLane(state, lane, { extra: `Human feedback at gate ${gate}, apply it and update the artifacts: "${fb}"` });
      if (!ok) return 'quit';
      return humanGate(state, lane, gate); // show the revised artifacts and ask again
    }
  }
}

function approve(state, gate) {
  state.gates[gate] = new Date().toISOString();
  saveState(state);
  appendStatus(`- ${gate} duyệt lúc ${new Date().toLocaleString('vi-VN')}${flags.yes ? ' (tự động --yes)' : ''}`);
  commitArtifacts(`docs(${feature}): ${gate} approved`);
  return 'approved';
}

// ---------- verify / security loop ----------
async function qualityLoop(state, profile) {
  const sec = needSecurity(state, profile);
  if (sec && !state.done.includes('security')) {
    if (!(await runLane(state, 'security'))) return 'stop';
  }

  const review = verdictOf('review.md');
  const security = sec ? verdictOf('security.md') : 'pass';
  const blocked = review === 'back-to-build' || security === 'blockers';
  const unknown = review === null || (sec && security === null);

  if (unknown && !blocked) {
    warn('Không tìm thấy dòng VERDICT trong review.md/security.md.');
    if (!flags.yes) {
      const a = (await ask('  Coi như đạt và đi tiếp? [y/n] ')).toLowerCase();
      if (a !== 'y') return 'stop';
    }
  }
  if (!blocked) { log(green('✔ Review đạt') + dim(` (review: ${review ?? '?'}${sec ? `, security: ${security ?? '?'}` : ''})`)); return 'continue'; }

  if (state.fixRounds >= MAX_FIX_ROUNDS) {
    err(`Vẫn còn blocker sau ${MAX_FIX_ROUNDS} vòng sửa. Đọc ${dir}/review.md${sec ? ` và ${dir}/security.md` : ''}, quyết định rồi chạy: pnpm ai ${feature} --from build`);
    return 'stop';
  }
  state.fixRounds += 1;
  log(yellow(bold(`\n↺ Vòng sửa ${state.fixRounds}/${MAX_FIX_ROUNDS}: quay lại build`)));
  state.done = state.done.filter((l) => !['build', 'verify', 'security'].includes(l));
  saveState(state);
  const fix = `Fix round ${state.fixRounds}: fix every blocker and major finding in ${dir}/review.md${sec ? ` and ${dir}/security.md` : ''}. Only those, then stop.`;
  if (!(await runLane(state, 'build', { extra: fix }))) return 'stop';
  if (!(await runLane(state, 'verify'))) return 'stop';
  return qualityLoop(state, profile);
}

function verdictOf(file) {
  const f = path.join(dir, file);
  if (!fs.existsSync(f)) return null;
  const all = [...fs.readFileSync(f, 'utf8').matchAll(/^\s*VERDICT:\s*([a-z-]+)\s*$/gim)];
  return all.length ? all.at(-1)[1].toLowerCase() : null; // last one wins
}

// ---------- profile ----------
function resolveProfile(state) {
  const brief = readIf(path.join(dir, 'brief.md'));
  const last = (re) => [...brief.matchAll(re)].at(-1)?.[1];
  const fromBrief = last(/^\s*PROFILE:\s*(vibe|standard|full)\s*$/gim)?.toLowerCase();
  const risks = (last(/^\s*RISKS:\s*(.*)$/gim) || '').split(/[,\s]+/).map((r) => r.trim().toLowerCase()).filter((r) => r && r !== 'none');
  state.risks = risks;
  const name = flags.profile || state.profileOverride || fromBrief || 'standard';
  if (flags.profile) state.profileOverride = flags.profile;
  if (!PROFILES[name]) die(`Unknown profile: ${name}`);
  return { name, ...PROFILES[name] };
}

// ---------- display ----------
function banner(state) {
  log(bold(`\n◆ AI delivery flow · ${feature}`) + dim(`  (${dir})`));
  if (state.done.length) log(dim(`  Đã xong: ${state.done.join(', ')} · chạy tiếp từ lane kế`));
}

function printPlan(state, profile) {
  const rows = profile.lanes
    .map((lane) => {
      const key = laneKey(lane);
      const engine = cfg[`ENGINE_${key}`] || 'claude';
      const model = cfg[`MODEL_${key}`] || 'default';
      const fb = unique(splitList(cfg[`FALLBACK_${key}`] ?? cfg.FALLBACK_DEFAULT ?? 'claude codex deepseek')).filter((e) => e !== engine);
      const gate = profile.gates[lane] ? yellow(` ⏸ ${profile.gates[lane]}`) : '';
      const skipSec = lane === 'security' && !needSecurity(state, profile);
      const cond = skipSec ? dim(state.done.includes('intake') ? ' (bỏ qua: không có rủi ro)' : ' (chỉ chạy nếu intake gắn cờ rủi ro)') : '';
      const done = state.done.includes(lane) ? green(' ✔') : '';
      return `  ${lane.padEnd(10)} ${(engineColor[engine] || ((s) => s))(engine.padEnd(9))} ${dim(model.padEnd(28))} ${dim('fallback: ' + (fb.join(' → ') || '-'))}${gate}${cond}${done}`;
    });
  log(bold(`\n  Profile: ${profile.name}`) + (state.risks?.length ? yellow(`  · rủi ro: ${state.risks.join(', ')}`) : '') + dim(`  · tối đa ${MAX_FIX_ROUNDS} vòng sửa`));
  log(rows.join('\n'));
}

function finish(state, outcome) {
  const rows = state.history.map((h) => `| ${h.lane} | ${h.engine} | ${h.model} | ${fmtMs(h.ms)} | ${h.ok ? 'ok' : 'chuyển engine'} |`);
  const md = [
    `# Run summary — ${feature}`,
    '',
    `- Kết quả: **${outcome}**`,
    `- Profile: ${state.profile || '?'} · Rủi ro: ${(state.risks || []).join(', ') || 'không'}`,
    `- Gate đã duyệt: ${Object.keys(state.gates).join(', ') || 'chưa'}`,
    `- Vòng sửa: ${state.fixRounds}`,
    `- Engine build: ${state.builtBy || '-'}`,
    '',
    '| Lane | Engine | Model | Thời gian | Kết quả |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'run-summary.md'), md);
  commitArtifacts(`docs(${feature}): run ${outcome}`);

  log('\n' + bold(outcome === 'done' ? green('◆ Xong') : yellow(`◆ Dừng: ${outcome}`)));
  for (const h of state.history) log(`  ${h.ok ? green('✔') : yellow('↷')} ${h.lane.padEnd(10)} ${h.engine.padEnd(9)} ${dim(fmtMs(h.ms))}`);
  log(dim(`  Tóm tắt: ${dir}/run-summary.md`));
  if (outcome !== 'done') log(dim(`  Chạy tiếp: pnpm ai ${feature}`));
  else if (fs.existsSync(path.join(dir, 'pr.md'))) log(dim(`  Tạo PR: gh pr create --body-file ${dir}/pr.md`));
  process.exit(outcome === 'done' ? 0 : 2);
}

// ---------- state & files ----------
function ensureFeature() {
  if (fs.existsSync(dir)) {
    if (request) warn(`${dir} đã tồn tại, bỏ qua yêu cầu mới và chạy tiếp.`);
    return;
  }
  if (!request) die(`Chưa có ${dir}. Bắt đầu bằng: pnpm ai ${feature} "<mô tả yêu cầu>"`);
  if (flags.dryRun) { log(dim(`(dry-run: sẽ tạo ${dir} và branch feat/${feature})`)); return; }
  const r = spawnSync('bash', ['scripts/ai/new-feature.sh', feature, request], { stdio: 'inherit' });
  if (r.status !== 0) die('new-feature.sh failed');
}

function loadState() {
  const base = { done: [], gates: {}, history: [], fixRounds: 0, builtBy: null, profile: null, risks: [], cooldown: {} };
  try { return { ...base, ...JSON.parse(fs.readFileSync(statePath, 'utf8')) }; } catch { return base; }
}
function saveState(s) { if (!flags.dryRun) fs.writeFileSync(statePath, JSON.stringify(s, null, 2)); }

function appendStatus(line) {
  const f = path.join(dir, 'status.md');
  if (fs.existsSync(f)) fs.appendFileSync(f, `\n${line}\n`);
}

function commitArtifacts(message) {
  if (!AUTO_COMMIT) return;
  spawnSync('git', ['add', '--', dir], { stdio: 'ignore' });
  const staged = spawnSync('git', ['diff', '--cached', '--quiet', '--', dir]);
  if (staged.status === 1) {
    spawnSync('git', ['commit', '-q', '-m', message, '--', dir], { stdio: 'ignore' });
    log(dim(`  git commit: ${message}`));
  }
}

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
    v = v.replace(/\$HOME|\$\{HOME\}/g, process.env.HOME || process.env.USERPROFILE || '~');
    out[m[1]] = v;
  }
  for (const k of Object.keys(out)) if (process.env[k] !== undefined) out[k] = process.env[k]; // env wins
  return out;
}

// ---------- utils ----------
function laneKey(l) { return l.toUpperCase().replace(/-/g, '_'); }
function splitList(s) { return String(s || '').split(/[\s,]+/).filter(Boolean); }
function unique(a) { return [...new Set(a)]; }
function readIf(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }
function countLines(f) { return readIf(f).split('\n').length; }
function tailLines(f, n) { return readIf(f).trimEnd().split('\n').filter((l) => !l.startsWith('$ ')).slice(-n).join('\n').replace(/^\s*\n/, ''); }
function stamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-'); }
function fmtMs(ms) { const s = Math.round(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`; }
function log(s) { process.stdout.write(s + '\n'); }
function warn(s) { process.stdout.write(yellow('⚠ ' + s) + '\n'); }
function err(s) { process.stdout.write(red('✘ ' + s) + '\n'); }
function die(s) { err(s); process.exit(1); }

function printHelp() {
  log(`Usage:
  pnpm ai <feature> "<request>"   start a feature (creates work/<feature>/ and branch feat/<feature>)
  pnpm ai <feature>               resume

Options: --yes  --dry-run  --profile vibe|standard|full  --from <lane>  --only <lane>  --quiet
Lanes:   ${Object.keys(LANES).join(', ')}`);
}
