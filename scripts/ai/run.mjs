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
// Ctrl+C once: stop running engines, save state, write run-summary.md. Twice: exit at once.

import { spawn, spawnSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
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
const flags = { yes: false, dryRun: false, quiet: false, refreeze: false, profile: null, from: null, only: null };
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--yes' || a === '-y') flags.yes = true;
  else if (a === '--dry-run') flags.dryRun = true;
  else if (a === '--quiet') flags.quiet = true;
  else if (a === '--refreeze') flags.refreeze = true;
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
// Only risks whose flow.yaml turn_on includes security pull in the security lane.
const SECURITY_RISKS = splitList(cfg.SECURITY_RISKS ?? 'auth_or_roles money');
const needSecurity = (state, profile) => profile.name === 'full' || (state.risks || []).some((r) => SECURITY_RISKS.includes(r));

const MAX_FIX_ROUNDS = Number(cfg.MAX_FIX_ROUNDS || 2);
const COOLDOWN_MS = Number(cfg.LIMIT_COOLDOWN_MIN || 60) * 60_000;
const LANE_TIMEOUT_MS = Number(cfg.LANE_TIMEOUT_MIN ?? 25) * 60_000; // 0 = no limit
const AUTO_COMMIT = (cfg.AUTO_COMMIT_ARTIFACTS ?? '1') !== '0';
const AUTO_COMMIT_BUILD = (cfg.AUTO_COMMIT_BUILD ?? '1') !== '0';
const METRICS = (cfg.METRICS ?? '1') !== '0';
const DISABLED = new Set(splitList(cfg.DISABLED_ENGINES));
const VERIFY_PORTS = splitList(cfg.VERIFY_PORTS ?? '3000 4000').map(Number).filter(Boolean);
const BUSY_PORTS = (cfg.BUSY_PORTS || 'ask').toLowerCase(); // ask | kill | ignore
// run budget: counted from the start of THIS invocation (engine time only, not time spent waiting at gates)
const RUN_MAX_MS = Number(cfg.RUN_MAX_MIN ?? 120) * 60_000;          // 0 = no limit
const RUN_MAX_TOKENS = Number(cfg.RUN_MAX_TOKENS_M ?? 5) * 1e6;      // 0 = no limit
const RUN_MAX_COST = Number(cfg.RUN_MAX_COST_USD ?? 0);              // 0 = no limit (Claude-reported API-equivalent $)
const READONLY_GUARD = (cfg.READONLY_GUARD || 'stop').toLowerCase(); // stop | warn | off
const QA_FREEZE = (cfg.QA_FREEZE || 'stop').toLowerCase();          // stop | warn | off
const AC_TRACE = (cfg.AC_TRACE || 'warn').toLowerCase();            // off | warn | gate
const NOTIFY = splitList(cfg.NOTIFY ?? 'bell desktop');             // bell desktop ntfy
const NTFY_TOPIC = cfg.NTFY_TOPIC || '';
const FAST_FAIL_MS = 30_000; // an engine that dies this fast without output did not really try
const GUARDED_LANES = new Set(['intake', 'define', 'design', 'verify', 'security', 'pr']); // only build and test-plan may change code
const LIMIT_RE = /(usage limit|rate.?limit|quota (exceeded|reached)|exceeded your|insufficient (balance|credit)|credit balance is too low|too many requests|\b429\b|limit reached|try again (in|after|later))/i;
// Engine cannot be used at all right now (blocked network, bad key, not logged in, not installed).
const UNAVAILABLE_RE = /(\b40[13]\b|forbidden|unauthori[sz]ed|invalid (api )?key|authentication (failed|error)|not logged in|please (log ?in|run \S+ login)|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|getaddrinfo|fetch failed|unable to connect|socket hang up|command not found|is not recognized as|spawn \S+ ENOENT)/i;
// The configured model does not exist for this engine (typo, or a DeepSeek id on Claude): a config problem, not an outage.
const BAD_MODEL_RE = /(unknown model|invalid model|model .{0,60}(not found|does not exist|is not available)|issue with the selected model|ModelNotFound)/i;

// What the orchestrator does for each kind of engine failure (one place, so the behaviour is predictable):
//   cooldown  – skip this engine for LIMIT_COOLDOWN_MIN minutes
//   next      – try the next engine in the chain (otherwise stop and ask the human)
const FAILURE = {
  timeout:     { cooldown: false, next: false, note: 'quá giờ của lane' },
  quota:       { cooldown: true,  next: true,  note: 'có vẻ hết quota/rate limit' },
  unavailable: { cooldown: true,  next: true,  note: 'không truy cập được (mạng/key/đăng nhập)' },
  'fast-fail': { cooldown: true,  next: true,  note: 'lỗi ngay sau vài giây, không có kết quả (lặp lại nên coi như không dùng được)' },
  'bad-model': { cooldown: false, next: true,  note: 'tên model không hợp lệ cho engine này, kiểm tra MODEL_* trong models.env' },
  error:       { cooldown: false, next: true,  note: '' },
};

// ---------- Ctrl+C: kill running engines (whole process tree), save, summarize ----------
const children = new Set();
let currentState = null;
let interrupted = false;
let budgetBase = { ms: 0, tokens: 0, cost: 0 };
process.on('SIGINT', () => {
  if (interrupted) { for (const ch of children) killTree(ch, true); process.exit(130); }
  interrupted = true;
  process.stdout.write(yellow('\n⏹ Ctrl+C: đang dừng engine và lưu trạng thái… (bấm Ctrl+C lần nữa để thoát ngay)\n'));
  for (const ch of children) killTree(ch);
  if (!currentState || flags.dryRun) process.exit(130);
  try { finish(currentState, 'interrupted'); } catch { process.exit(130); }
});

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

// ---------- main ---------- (started at the bottom of the file, after every const is initialised)

async function main() {
  ensureFeature();
  const state = loadState();
  currentState = state;

  budgetBase = totals(state.history);

  if (flags.from) {
    if (!LANES[flags.from]) die(`Unknown lane for --from: ${flags.from}`);
    const order = Object.keys(LANES);
    const keepUntil = order.indexOf(flags.from);
    state.done = state.done.filter((l) => order.indexOf(l) < keepUntil);
    if (keepUntil <= order.indexOf('verify')) state.fixRounds = 0;
    // a gate belongs to a lane: re-running that lane (or an earlier one) means the human must approve again
    for (const [lane, gate] of Object.entries(PROFILES[state.profile]?.gates || {})) {
      if (order.indexOf(lane) >= keepUntil) delete state.gates[gate];
    }
    if (keepUntil <= order.indexOf('test-plan')) delete state.qaFreeze; // new QA tests, new freeze
    saveState(state);
  }
  if (flags.refreeze) { delete state.qaFreeze; saveState(state); log(dim('  Sẽ chốt lại danh sách test của QA ở lần kiểm tra tới.')); }

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
      const pending = {};
      const results = await Promise.all(jobs.map((l) => runLane(state, l, { parallel: true, pending })));
      // commit build only after test-plan stopped writing, so half-written QA files are not swept in
      if (pending.build) commitBuild(pending.build.engine, pending.build.dirtyBefore);
      if (results.includes(false)) return finish(state, 'stopped');
      maybeFreeze(state);
      i++; // build handled
      continue;
    }

    const ok = lane === 'verify' ? await runVerify(state) : await runLane(state, lane);
    if (!ok) return finish(state, 'stopped');

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
  const over = overBudget(state);
  if (over) { err(`${lane}: ${over}`); log(dim(`  Xem ${dir}/run-summary.md. Muốn chạy tiếp: pnpm ai ${feature} (tính lại từ 0) hoặc nâng RUN_MAX_* trong models.env.`)); return false; }

  const key = laneKey(lane);
  const primary = cfg[`ENGINE_${key}`] || 'claude';
  let chain = unique([primary, ...splitList(cfg[`FALLBACK_${key}`] ?? cfg.FALLBACK_DEFAULT ?? 'claude codex deepseek')]);

  // engines switched off in models.env (e.g. DeepSeek blocked on the office network)
  if (DISABLED.size) {
    chain = chain.filter((e) => !DISABLED.has(e));
    if (!chain.length) { err(`${lane}: mọi engine của lane này đều nằm trong DISABLED_ENGINES.`); return false; }
  }

  // independence rule: reviewers must not be the engine that built
  if ((lane === 'verify' || lane === 'security') && state.builtBy) {
    const filtered = chain.filter((e) => e !== state.builtBy);
    if (filtered.length) chain = filtered;
    else warn(`${lane}: mọi engine đều là ${state.builtBy}, review sẽ không độc lập.`);
  }
  // same for QA: tests written by the engine that writes the code only prove what that engine already believes
  if (lane === 'test-plan' && (cfg.QA_INDEPENDENT ?? '1') !== '0') {
    const builder = cfg.ENGINE_BUILD || 'claude';
    const filtered = chain.filter((e) => e !== builder);
    if (filtered.length && filtered.length < chain.length) {
      log(dim(`  (test-plan tránh ${builder} vì ${builder} đang build; tắt bằng QA_INDEPENDENT=0)`));
      chain = filtered;
    }
  }

  // engines that hit a quota or were unreachable recently are skipped for LIMIT_COOLDOWN_MIN minutes (unless nothing else is left)
  const cooling = (e) => state.cooldown?.[e] && Date.now() - Date.parse(state.cooldown[e]) < COOLDOWN_MS;
  const fresh = chain.filter((e) => !cooling(e));
  if (fresh.length && fresh.length < chain.length) {
    log(dim(`  (bỏ qua tạm ${chain.filter(cooling).join(', ')}: vừa hết quota hoặc không truy cập được)`));
    chain = fresh;
  }

  let previous = null;
  for (const engine of chain) {
    const model = modelFor(lane, engine);
    const prompt = buildPrompt(state, lane, { previous, extra: opts.extra });
    const t0 = Date.now();
    const label = `${lane}·${engine}${model ? `(${model.split('/').pop()})` : ''}`;
    log(`\n${bold('▶')} ${bold(lane)} ${dim('→')} ${(engineColor[engine] || ((s) => s))(engine)}${model ? dim(' ' + model) : ''}`);

    const dirtyBefore = lane === 'build' ? gitChanged() : [];
    const guardBefore = READONLY_GUARD !== 'off' && GUARDED_LANES.has(lane) ? codeSnapshot() : null;
    const { code, tail, logFile, metrics, timedOut } = await spawnEngine(engine, model, prompt, lane, { prefix: opts.parallel ? label : null });
    if (interrupted) return false;
    const ms = Date.now() - t0;
    // Failure = non-zero exit, an error result, or a very short output that is only a quota/limit message.
    // (Long outputs may legitimately mention "rate limit", e.g. when the task is to add login throttling.)
    const failed = timedOut || code !== 0 || metrics.isError || (tail.trim().length < 600 && LIMIT_RE.test(tail));
    state.history.push({ lane, engine, model: model || 'default', ms, ok: !failed, at: new Date().toISOString(), log: logFile, ...metrics });
    saveState(state);

    if (!failed) {
      state.fastFails = { ...(state.fastFails || {}), [engine]: 0 };
      if (guardBefore && !guardOk(lane, guardBefore, logFile)) { saveState(state); return false; }
      if (lane === 'build') {
        state.builtBy = engine;
        if (opts.pending) opts.pending.build = { engine, dirtyBefore };
        else commitBuild(engine, dirtyBefore, opts.round);
      }
      state.done = unique([...state.done, lane]);
      saveState(state);
      log(`${green('✔')} ${lane} ${dim(`(${engine}, ${fmtMs(ms)}${fmtMetrics(metrics)})`)}`);
      return true;
    }

    const kind = classifyFailure(state, engine, { timedOut, tail, ms, metrics });
    const rule = FAILURE[kind];
    if (kind === 'timeout') {
      // a longer run on another engine would only burn more quota: let the human look first
      err(`${lane}: quá ${LANE_TIMEOUT_MS / 60_000} phút nên đã dừng. Xem ${logFile}. Chia nhỏ plan.md hoặc tăng LANE_TIMEOUT_MIN, rồi chạy: pnpm ai ${feature}`);
      return false;
    }
    if (rule.cooldown) { state.cooldown = { ...(state.cooldown || {}), [engine]: new Date().toISOString() }; }
    saveState(state);
    const why = rule.note ? `, ${rule.note}` : '';
    const hint = rule.cooldown ? `. Bỏ qua ${engine} trong ${COOLDOWN_MS / 60_000} phút; tắt hẳn bằng DISABLED_ENGINES=${engine}` : '';
    warn(`${lane}: ${engine} dừng (exit ${code}${why}${hint}). Chuyển engine tiếp theo…`);
    previous = engine;
  }
  err(`${lane}: hết engine dự phòng. Xem log trong ${dir}/logs/ rồi chạy lại: pnpm ai ${feature}`);
  return false;
}

// Decide what kind of failure this was (see FAILURE). Repeated instant failures count as "unavailable":
// one can be a fluke, two in a row means the engine is not really usable right now.
function classifyFailure(state, engine, { timedOut, tail, ms, metrics }) {
  if (timedOut) return 'timeout';
  const end = tail.slice(-1500);
  if (LIMIT_RE.test(end)) return 'quota';
  if (UNAVAILABLE_RE.test(end)) return 'unavailable';
  if (BAD_MODEL_RE.test(end)) return 'bad-model';
  if (ms < FAST_FAIL_MS && !tokensOf(metrics)) {
    const n = ((state.fastFails ||= {})[engine] || 0) + 1;
    state.fastFails[engine] = n;
    if (n >= 2) return 'fast-fail';
  }
  return 'error';
}

// Run budget for this invocation: engine time, tokens and (optionally) Claude-reported cost.
function overBudget(state) {
  const t = totals(state.history);
  const ms = t.ms - budgetBase.ms, tokens = t.tokens - budgetBase.tokens, cost = t.cost - budgetBase.cost;
  const why = [];
  if (RUN_MAX_MS && ms > RUN_MAX_MS) why.push(`${fmtMs(ms)} > ${fmtMs(RUN_MAX_MS)} (RUN_MAX_MIN)`);
  if (RUN_MAX_TOKENS && tokens > RUN_MAX_TOKENS) why.push(`${fmtK(tokens)} token > ${fmtK(RUN_MAX_TOKENS)} (RUN_MAX_TOKENS_M)`);
  if (RUN_MAX_COST && cost > RUN_MAX_COST) why.push(`~$${cost.toFixed(2)} > $${RUN_MAX_COST} (RUN_MAX_COST_USD)`);
  return why.length ? `vượt trần ngân sách của lần chạy này: ${why.join('; ')}.` : '';
}

// Model for an engine in a lane: the lane's MODEL_* only applies to its primary engine;
// fallbacks use the engine default, so a fallback never silently lands on the most expensive model.
// A model id that cannot belong to the engine (DeepSeek "provider/model" on Claude, or the reverse) is ignored with a warning.
const warnedModels = new Set();
function modelFor(lane, engine) {
  const key = laneKey(lane);
  const primary = cfg[`ENGINE_${key}`] || 'claude';
  const defaults = { claude: cfg.DEFAULT_MODEL_CLAUDE, codex: cfg.DEFAULT_MODEL_CODEX, deepseek: cfg.DEEPSEEK_MODEL, 'deepseek-cc': '' };
  let model = engine === primary && cfg[`MODEL_${key}`] ? cfg[`MODEL_${key}`] : defaults[engine] || '';
  const slashModel = model.includes('/');
  const wantsSlash = engine === 'deepseek'; // OpenCode ids look like provider/model; the others never contain "/"
  if (model && slashModel !== wantsSlash) {
    const k = `${lane}:${engine}:${model}`;
    if (!warnedModels.has(k)) { warnedModels.add(k); warn(`MODEL_${key}=${model} không hợp lệ cho engine ${engine}, dùng model mặc định của engine. Sửa .agents/models.env (đổi cả ENGINE_${key} và MODEL_${key} cùng lúc).`); }
    model = defaults[engine] || '';
  }
  return model;
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
  const json = METRICS && (engine === 'claude' || engine === 'deepseek-cc'); // stream-json gives tokens, cost and turns
  let [cmd, argv] = engineCommand(engine, model, prompt, { json });
  if (win) argv = argv.map((a) => (/\s/.test(a) ? `"${a}"` : a));

  const out = fs.createWriteStream(logFile); // human-readable log
  const raw = json ? fs.createWriteStream(`${base}.jsonl`) : null; // raw events, for debugging
  out.write(`$ ${cmd} ${argv.map((a) => (a.includes(' ') ? JSON.stringify(a.slice(0, 80) + (a.length > 80 ? '…' : '')) : a)).join(' ')}\n\n`);

  return new Promise((resolve) => {
    let tail = '';
    let buf = '';
    let timedOut = false;
    const metrics = {};
    const emit = (s) => {
      if (!s) return;
      out.write(s);
      tail = (tail + s).slice(-4000);
      if (flags.quiet) return;
      process.stdout.write(prefix ? s.replace(/^(?=.)/gm, dim(`[${prefix}] `)) : s);
    };
    const onJsonLine = (line) => {
      if (!line.trim()) return;
      let ev;
      try { ev = JSON.parse(line); } catch { return emit(line + '\n'); }
      emit(renderClaudeEvent(ev, metrics));
    };

    let child;
    try {
      // own process group on Linux/macOS so Ctrl+C / timeout can stop the whole tree (dev servers included)
      child = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env, shell: win, detached: !win });
    } catch (e) {
      out.end(String(e));
      return resolve({ code: 127, tail: String(e), logFile, metrics, timedOut });
    }
    children.add(child);
    const timer = LANE_TIMEOUT_MS
      ? setTimeout(() => { timedOut = true; emit(`\n[orchestrator] quá ${LANE_TIMEOUT_MS / 60_000} phút, dừng engine.\n`); killTree(child); }, LANE_TIMEOUT_MS)
      : null;

    child.stdout.on('data', (b) => {
      if (!json) return emit(b.toString());
      raw.write(b);
      buf += b.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { onJsonLine(buf.slice(0, i)); buf = buf.slice(i + 1); }
    });
    child.stderr.on('data', (b) => emit(b.toString()));
    child.on('error', (e) => { tail += String(e); });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      children.delete(child);
      if (buf) onJsonLine(buf);
      if (!json) Object.assign(metrics, textMetrics(tail));
      out.end();
      raw?.end();
      resolve({ code: code ?? 1, tail, logFile, metrics, timedOut });
    });
  });
}

// Claude Code --output-format stream-json: show text and tool calls, collect usage from the final result event.
function renderClaudeEvent(ev, m) {
  if (ev.type === 'assistant' && Array.isArray(ev.message?.content)) {
    return ev.message.content.map((b) => {
      if (b.type === 'text' && b.text?.trim()) return b.text.trim() + '\n';
      if (b.type === 'tool_use') return `  · ${b.name} ${toolHint(b.input)}\n`;
      return '';
    }).join('');
  }
  if (ev.type === 'result') {
    const u = ev.usage || {};
    m.tokensIn = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    m.tokensOut = u.output_tokens || 0;
    if (typeof ev.total_cost_usd === 'number') m.costUsd = ev.total_cost_usd;
    if (ev.num_turns) m.turns = ev.num_turns;
    m.isError = Boolean(ev.is_error);
    return ev.is_error ? `${ev.result || ev.subtype || 'error'}\n` : '';
  }
  return '';
}
function toolHint(input = {}) {
  const v = input.command || input.file_path || input.path || input.pattern || input.description || input.prompt || '';
  const one = String(v).replace(/\s+/g, ' ').trim();
  return one.length > 100 ? one.slice(0, 100) + '…' : one;
}
// Codex prints "tokens used <n>" at the end of `codex exec`.
function textMetrics(text) {
  const m = text.match(/tokens used\W*([\d][\d,.]*)/i);
  return m ? { tokensTotal: Number(m[1].replace(/[,.]/g, '')) } : {};
}

function killTree(child, force = false) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try { process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
  if (!force) setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 4000).unref();
}

function engineCommand(engine, model, prompt, { json } = {}) {
  const claudeOut = json ? ['--output-format', 'stream-json', '--verbose'] : [];
  switch (engine) {
    case 'claude':
      return ['claude', ['-p', prompt, '--permission-mode', 'acceptEdits', ...claudeOut, ...(model ? ['--model', model] : [])]];
    case 'codex':
      return ['codex', ['exec', '--sandbox', cfg.CODEX_SANDBOX || 'workspace-write', ...(model ? ['-m', model] : []), prompt]];
    case 'deepseek':
      return ['opencode', ['run', '-m', model || cfg.DEEPSEEK_MODEL || 'deepseek/deepseek-v4-flash', prompt]];
    case 'deepseek-cc':
      if (!cfg.DEEPSEEK_CC_SETTINGS) die('Set DEEPSEEK_CC_SETTINGS in .agents/models.env to use engine deepseek-cc');
      return ['claude', ['--settings', cfg.DEEPSEEK_CC_SETTINGS, '-p', prompt, '--permission-mode', 'acceptEdits', ...claudeOut]];
    default:
      die(`Unknown engine: ${engine}`);
  }
}

// ---------- build commits (Codex's sandbox cannot write .git, so the orchestrator commits for it) ----------
function commitBuild(engine, dirtyBefore, round) {
  if (!AUTO_COMMIT_BUILD) return;
  const planned = planPaths();
  const inPlan = (f) => planned.some((p) => f === p || (p.endsWith('/') && f.startsWith(p)) || (p.includes('*') && f.startsWith(p.slice(0, p.indexOf('*')))));
  // files that were already dirty before the lane belong to someone else, unless the plan names them
  const files = gitChanged().filter((f) => !dirtyBefore.includes(f) || inPlan(f));
  if (!files.length) return;
  const outside = planned.length ? files.filter((f) => !inPlan(f)) : [];
  spawnSync('git', ['add', '--', ...files], { stdio: 'ignore' });
  const msg = `feat(${feature}): ${round ? `fix round ${round}` : 'build'} by ${engine}`;
  const body = outside.length ? `\n\nFiles outside plan.md: ${outside.join(', ')}` : '';
  const r = spawnSync('git', ['commit', '-q', '-m', msg + body, '--', ...files], { encoding: 'utf8' });
  if (r.status === 0) log(dim(`  git commit: ${msg} (${files.length} file)`));
  else warn(`Không commit được thay đổi của build: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' ')}`);
  if (outside.length) warn(`Build sửa file ngoài plan.md: ${outside.join(', ')}. Verify sẽ xem xét.`);
  commitArtifacts(`docs(${feature}): build notes`);
}

function planPaths() {
  const plan = readIf(path.join(dir, 'plan.md'));
  return unique([...plan.matchAll(/`([^`\s]+\/[^`\s]*)`/g)].map((m) => m[1].replace(/^\.\//, '')));
}

// changed + untracked files under apps/ and packages/ (feature code), as repo-relative paths
function gitChanged() {
  const r = spawnSync('git', ['status', '--porcelain', '-z', '--untracked-files=all', '--', 'apps', 'packages'], { encoding: 'utf8' });
  const parts = (r.stdout || '').split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const st = parts[i].slice(0, 2);
    files.push(parts[i].slice(3));
    if (st[0] === 'R' || st[0] === 'C') i++; // skip the "from" path of a rename/copy
  }
  return files;
}

// HEAD + working-tree diff of feature code: if a fix round leaves this unchanged, looping again is pointless
function codeFingerprint() {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout || '';
  const diff = spawnSync('git', ['diff', 'HEAD', '--', 'apps', 'packages'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout || '';
  return createHash('sha1').update(head + diff + gitChanged().join('\n')).digest('hex');
}

// ---------- sensors: read-only lanes, frozen QA tests, AC traceability ----------
const sha1 = (x) => createHash('sha1').update(x).digest('hex');
const headSha = () => (spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout || '').trim();

// per-file hash of the uncommitted diff under apps/ and packages/, plus untracked files and HEAD
function codeSnapshot() {
  const diff = spawnSync('git', ['diff', 'HEAD', '-U0', '--', 'apps', 'packages'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout || '';
  const files = {};
  for (const block of diff.split(/^diff --git /m).slice(1)) {
    const f = block.match(/^a\/(.+?) b\//)?.[1];
    if (f) files[f] = sha1(block);
  }
  const un = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'apps', 'packages'], { encoding: 'utf8' }).stdout || '';
  return { head: headSha(), files, untracked: new Set(un.split(/\r?\n/).filter(Boolean)) };
}

// Lanes other than build/test-plan must not change code. Modified tracked files stop the run; new untracked files only warn
// (screenshots and reports are normal for verify).
function guardOk(lane, before, logFile) {
  const after = codeSnapshot();
  const changed = Object.keys({ ...before.files, ...after.files }).filter((f) => before.files[f] !== after.files[f]);
  if (after.head !== before.head) changed.push('(HEAD đổi: lane đã tạo commit)');
  const created = [...after.untracked].filter((f) => !before.untracked.has(f));
  if (created.length) warn(`${lane} tạo file mới ngoài ${dir}/: ${created.slice(0, 5).join(', ')}${created.length > 5 ? '…' : ''}. Kiểm tra xem có phải bằng chứng hoặc báo cáo không.`);
  if (!changed.length) return true;
  const list = changed.slice(0, 8).join(', ') + (changed.length > 8 ? ` (+${changed.length - 8})` : '');
  if (READONLY_GUARD === 'warn') { warn(`${lane} đã sửa code: ${list}. Lane này chỉ nên ghi vào ${dir}/.`); return true; }
  err(`${lane} đã sửa code: ${list}. Lane này chỉ được ghi vào ${dir}/.`);
  log(dim(`  Xem log ${logFile} và git diff. Nếu thay đổi chấp nhận được thì commit nó, rồi chạy: pnpm ai ${feature} --from ${lane}`));
  log(dim('  (READONLY_GUARD=warn trong models.env nếu chỉ muốn cảnh báo)'));
  return false;
}

// QA freeze: after test-plan and build both finished, remember the QA-owned test files listed in plan.md.
// A later fix round that removes assertions, adds skip/only or deletes them is gaming the gate, not fixing code.
const ASSERT_RE = /\b(assert\w*(\.\w+)?\(|expect\(|\.should\b|t\.(ok|equal|deepEqual|strictEqual|notEqual|throws|rejects|match)\()/;
const SKIP_RE = /\b(it|test|describe)\.(skip|only|todo|fixme)\b|\bx(it|describe)\(/;
const freezeDir = () => path.join(dir, '.qa-freeze');
const freezeName = (f) => f.replace(/[\\/]/g, '__');

function qaFiles() {
  const sec = section(path.join(dir, 'plan.md'), 'Tests do QA sở hữu');
  return unique([...sec.matchAll(/`([^`\s]+\.(?:test|spec)\.[cm]?[jt]sx?)`/g)].map((m) => m[1].replace(/^\.\//, ''))).filter((f) => fs.existsSync(f));
}

function maybeFreeze(state) {
  if (QA_FREEZE === 'off' || state.qaFreeze || !state.done.includes('test-plan') || !state.done.includes('build')) return;
  const files = qaFiles();
  state.qaFreeze = { at: new Date().toISOString(), files };
  if (!files.length) { log(dim('  (plan.md không liệt kê file test của QA nên không có gì để đóng băng)')); return saveState(state); }
  fs.rmSync(freezeDir(), { recursive: true, force: true });
  fs.mkdirSync(freezeDir(), { recursive: true });
  for (const f of files) fs.copyFileSync(f, path.join(freezeDir(), freezeName(f)));
  saveState(state);
  log(dim(`  Đã chốt ${files.length} file test của QA: build không được làm yếu chúng (bản gốc ở ${freezeDir()}).`));
}

function lineCounts(text) {
  const m = new Map();
  for (const l of text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) m.set(l, (m.get(l) || 0) + 1);
  return m;
}
function qaViolations(state) {
  const out = [];
  for (const f of state.qaFreeze?.files || []) {
    const frozen = path.join(freezeDir(), freezeName(f));
    if (!fs.existsSync(frozen)) continue;
    if (!fs.existsSync(f)) { out.push({ file: f, kind: 'deleted', detail: 'file đã bị xóa' }); continue; }
    const a = fs.readFileSync(frozen, 'utf8'), b = fs.readFileSync(f, 'utf8');
    if (a === b) continue;
    const ca = lineCounts(a), cb = lineCounts(b);
    let removedAssert = 0, addedAssert = 0, skipped = 0;
    for (const [l, n] of ca) if (ASSERT_RE.test(l)) removedAssert += Math.max(0, n - (cb.get(l) || 0));
    for (const [l, n] of cb) {
      const extra = Math.max(0, n - (ca.get(l) || 0));
      if (ASSERT_RE.test(l)) addedAssert += extra;
      if (SKIP_RE.test(l)) skipped += extra;
    }
    const weak = [];
    if (removedAssert > addedAssert) weak.push(`bớt ${removedAssert - addedAssert} assertion`);
    if (skipped) weak.push(`thêm ${skipped} skip/only/todo`);
    out.push(weak.length ? { file: f, kind: 'weakened', detail: weak.join(', ') } : { file: f, kind: 'changed', detail: 'có đổi nhưng không bớt assertion' });
  }
  return out;
}
// returns 'stop' when the run must pause; otherwise remembers notes for the verify prompt
function qaCheck(state) {
  if (QA_FREEZE === 'off' || !state.qaFreeze?.files?.length) return 'ok';
  const v = qaViolations(state);
  state.qaNotes = v.map((x) => `${x.file}: ${x.kind} (${x.detail})`);
  saveState(state);
  if (!v.length) return 'ok';
  for (const x of v) warn(`Build đã sửa test do QA sở hữu: ${x.file} (${x.detail})`);
  if (v.some((x) => x.kind !== 'changed') && QA_FREEZE === 'stop') {
    err('Có dấu hiệu build làm yếu test để qua gate (bớt assertion, thêm skip/only hoặc xóa file). Dừng để bạn xem.');
    log(dim(`  Bản gốc: ${freezeDir()}. Hoàn tác bằng cách chép đè lại file test, hoặc chấp nhận thay đổi rồi chạy: pnpm ai ${feature} --refreeze --from verify`));
    return 'stop';
  }
  return 'ok';
}

// AC traceability (deterministic): every AC-n in spec.md must appear in at least one test file.
function acTrace(state) {
  if (AC_TRACE === 'off') return null;
  const sensor = '.agents/sensors/check-ac-trace.mjs';
  if (!fs.existsSync(sensor)) return null;
  const r = spawnSync(process.execPath, [sensor, feature, '--json'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  let t;
  try { t = JSON.parse(r.stdout); } catch { return null; }
  const rows = t.ac.map((a) => `| ${a.id} | ${a.mode} | ${a.files.length ? a.files.slice(0, 3).join(', ') + (a.files.length > 3 ? '…' : '') : a.mode === 'auto' ? '**không có test**' : '(không bắt buộc)'} |`);
  fs.writeFileSync(path.join(dir, 'ac-trace.md'), ['# AC → test (sensor tự động)', '', `Nguồn: ${t.source}. AC \`manual\`/\`semi\` không bắt buộc có test tự động.`, '', '| AC | Kiểm chứng | Test chứa mã AC |', '| --- | --- | --- |', ...rows, '', t.unknown.length ? `Test nhắc tới AC không có trong spec: ${t.unknown.join(', ')}` : '', ''].join('\n'));
  return t;
}

// ---------- plan tasks: mode ai | human ----------
function planTasks() {
  const tasks = [];
  let cur = null;
  for (const line of readIf(path.join(dir, 'plan.md')).split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s*\[([ xX])\]\s*\**\s*(T\d+)\**\s*[—–:-]*\s*(.*)$/);
    if (m) { cur = { id: m[2], done: m[1] !== ' ', mode: 'ai', title: m[3].replace(/\*+/g, '').trim() }; tasks.push(cur); continue; }
    const md = cur && line.match(/^\s*[-*]?\s*\**Mode\**\s*:\s*\**(ai|human)\b/i);
    if (md) cur.mode = md[1].toLowerCase();
  }
  return tasks;
}
function tickTasks(ids) {
  const f = path.join(dir, 'plan.md');
  let text = readIf(f);
  for (const id of ids) text = text.replace(new RegExp(`^(\\s*[-*]\\s*\\[) (\\]\\s*\\**${id}\\b)`, 'm'), '$1x$2');
  fs.writeFileSync(f, text);
}
// Tasks marked "Mode: human" (real DB, real secrets, judgement calls) are never done by an agent: ask before verify.
async function checkHumanTasks(state) {
  const skipped = state.humanSkipped || [];
  const pending = planTasks().filter((t) => t.mode === 'human' && !t.done && !skipped.includes(t.id));
  if (!pending.length) return true;
  log('\n' + yellow(bold('━━━ Việc dành cho người (Mode: human) ━━━')));
  for (const t of pending) log(`  ☐ ${t.id} ${t.title}`);
  if (flags.yes) { warn('--yes: tiếp tục, verify sẽ ghi nhận các việc này chưa làm.'); state.humanSkipped = unique([...skipped, ...pending.map((t) => t.id)]); saveState(state); return true; }
  notify(`${feature}: có việc cần người`, pending.map((t) => t.id).join(', '));
  for (;;) {
    const a = (await ask('\n  [d] mình đã làm xong (tick vào plan.md)   [s] chưa làm, vẫn chạy verify   [q] dừng\n  > ')).toLowerCase();
    if (a === 'd') { tickTasks(pending.map((t) => t.id)); appendStatus(`- Người đã làm: ${pending.map((t) => t.id).join(', ')} (${new Date().toLocaleString('vi-VN')})`); return true; }
    if (a === 's') { state.humanSkipped = unique([...skipped, ...pending.map((t) => t.id)]); saveState(state); return true; }
    if (a === 'q' || a === '') return false;
  }
}

// extra instructions for the verify lane, built from what the sensors found
function verifyExtra(state, trace) {
  const parts = [`You are a read-only lane: write only inside ${dir}/. The orchestrator checks for code changes and will stop the run.`];
  if (trace) {
    const miss = trace.missing;
    parts.push(miss.length
      ? `Sensor (deterministic, see ${dir}/ac-trace.md): no test mentions ${miss.join(', ')}. Treat each as a major finding unless the AC is manual/semi.`
      : `Sensor: every automated AC has at least one test mentioning it (${dir}/ac-trace.md).`);
  }
  if (state.qaNotes?.length) parts.push(`Sensor: build changed QA-owned tests after the freeze: ${state.qaNotes.join('; ')}. Originals are in ${freezeDir()}. Removed assertions, new skip/only or weaker expectations are blockers.`);
  const open = planTasks().filter((t) => t.mode === 'human' && !t.done).map((t) => t.id);
  if (open.length) parts.push(`Tasks marked Mode: human and not done: ${open.join(', ')}. List them under "Cần người xử lý" and do not count them as code defects.`);
  return parts.join('\n');
}

// ---------- notifications (so you can leave the terminal while a lane runs) ----------
function notify(title, body = '') {
  if (!NOTIFY.length) return;
  try {
    if (NOTIFY.includes('bell')) process.stdout.write('\x07');
    if (NOTIFY.includes('desktop')) {
      const env = { ...process.env, AI_N_TITLE: title, AI_N_BODY: body };
      const o = { env, stdio: 'ignore', timeout: 8000 };
      if (process.platform === 'win32') {
        const ps = "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $x = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $t = $x.GetElementsByTagName('text'); $t.Item(0).AppendChild($x.CreateTextNode($env:AI_N_TITLE)) | Out-Null; $t.Item(1).AppendChild($x.CreateTextNode($env:AI_N_BODY)) | Out-Null; [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($x))";
        spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], o);
      } else if (process.platform === 'darwin') {
        spawnSync('osascript', ['-e', 'display notification (system attribute "AI_N_BODY") with title (system attribute "AI_N_TITLE")'], o);
      } else {
        spawnSync('notify-send', [title, body], o);
      }
    }
    // only the feature name and a status word leave the machine; the topic acts like a password, keep it unguessable
    if (NOTIFY.includes('ntfy') && NTFY_TOPIC) spawnSync('curl', ['-s', '-m', '5', '-H', 'Title: flashlab ai', '-d', `${title} ${body}`.trim(), `https://ntfy.sh/${encodeURIComponent(NTFY_TOPIC)}`], { stdio: 'ignore', timeout: 8000 });
  } catch { /* notifications are best effort */ }
}

// ---------- gate review page: everything you need to decide, in one file ----------
const GATE_CHECKS = {
  G1: ['Phạm vi đúng ý bạn; phần "ngoài phạm vi" ghi rõ', 'Mỗi AC là Given/When/Then, kiểm được bằng test (hoặc gắn nhãn manual/semi)', 'Câu hỏi mở đã có câu trả lời hoặc đã chấp nhận giả định'],
  G2: ['Có AC âm (sai quyền, dữ liệu xấu, rỗng) và ranh giới', 'Thiết kế đi đúng hướng phụ thuộc (domain không import Nest/Prisma)', 'Task nhỏ, có test trước; việc cần hệ thống thật hoặc quyết định của người đã gắn Mode: human', 'Phần rủi ro (tiền, auth, contract) nêu rõ cách xử lý'],
  'G1+G2': ['Phạm vi đúng ý bạn; AC kiểm được bằng test', 'Có AC âm và ranh giới', 'Task nhỏ, có test trước; việc cần người đã gắn Mode: human', 'Phần rủi ro nêu rõ cách xử lý'],
  G3: ['review.md và security.md không còn blocker/major', 'Mỗi AC có test hoặc bằng chứng; xem ảnh trong evidence/', 'Diff nằm trong phạm vi plan.md, không có file lạ', 'Việc Mode: human đã làm xong'],
};
function writeGatePage(state, gate, files) {
  const t = totals(state.history);
  const specFile = fs.existsSync(path.join(dir, 'spec.md')) ? 'spec.md' : 'design.md';
  const spec = readIf(path.join(dir, specFile));
  const acs = spec.split(/\r?\n/).filter((l) => /^\s*[-*]\s*\**AC-\d+/.test(l)).map((l) => l.trim());
  const tasks = planTasks();
  const questions = section(path.join(dir, 'spec.md'), 'Câu hỏi mở');
  const out = [
    `# Duyệt ${gate} — ${feature}`,
    '',
    `Profile **${state.profile || '?'}** · Rủi ro: ${(state.risks || []).join(', ') || 'không'} · Đã dùng ${fmtMs(t.ms)}, ${fmtK(t.tokens)} token${t.cost ? `, ~$${t.cost.toFixed(2)}` : ''} · Vòng sửa: ${state.fixRounds}`,
    '',
    '## Việc của bạn ở cổng này',
    ...(GATE_CHECKS[gate] || []).map((x) => `- [ ] ${x}`),
    '',
    '## File cần đọc',
    ...files.map((f) => `- \`${f}\` (${countLines(f)} dòng)`),
    '',
    `## Acceptance criteria (${acs.length})`,
    ...(acs.length ? acs : ['(chưa tìm thấy dòng AC-n)']),
  ];
  if (tasks.length) {
    out.push('', `## Task trong plan.md (${tasks.length})`, '| Task | Ai làm | Xong |', '| --- | --- | --- |', ...tasks.map((x) => `| ${x.id} ${x.title.slice(0, 70)} | ${x.mode} | ${x.done ? 'x' : ''} |`));
  }
  if (questions) out.push('', '## Câu hỏi mở (từ spec.md)', questions);
  if (gate === 'G3') {
    const trace = acTrace(state);
    const review = verdictOf('review.md'), security = verdictOf('security.md');
    out.push('', '## Bằng chứng tự động', `- review: ${review ?? '?'} · security: ${security ?? (needSecurity(state, resolveProfile(state)) ? '?' : 'không chạy')}`);
    if (trace) out.push(`- AC có test: ${trace.ac.length - trace.missing.length - trace.manual.length}/${trace.ac.length - trace.manual.length} (chi tiết ${dir}/ac-trace.md)${trace.missing.length ? `. Thiếu: ${trace.missing.join(', ')}` : ''}`);
    if (state.qaFreeze) out.push(`- Test QA đã chốt: ${state.qaFreeze.files.length} file${state.qaNotes?.length ? `. Có thay đổi: ${state.qaNotes.join('; ')}` : ', không bị sửa'}`);
    const ev = fs.existsSync(path.join(dir, 'evidence')) ? fs.readdirSync(path.join(dir, 'evidence')) : [];
    out.push(`- Ảnh/bằng chứng: ${ev.length ? ev.slice(0, 12).join(', ') : 'chưa có'}`);
    const base = ['main', 'origin/main'].map((b) => spawnSync('git', ['merge-base', 'HEAD', b], { encoding: 'utf8' })).find((r) => r.status === 0)?.stdout.trim();
    if (base) out.push('', '## Diff so với main', '```', (spawnSync('git', ['diff', '--stat', `${base}...HEAD`], { encoding: 'utf8' }).stdout || '').trim().split('\n').slice(-30).join('\n'), '```');
  }
  const f = path.join(dir, `gate-${gate.replace('+', '-')}.md`);
  fs.writeFileSync(f, out.join('\n') + '\n');
  return f;
}

// ---------- verify pre-check: stale dev servers make Playwright reuse old code ----------
async function runVerify(state) {
  const busy = [];
  for (const port of VERIFY_PORTS) if (await portBusy(port)) busy.push(port);
  if (busy.length && BUSY_PORTS !== 'ignore') {
    const pids = unique(busy.flatMap(pidsOnPort));
    warn(`Cổng ${busy.join(', ')} đang có server chạy${pids.length ? ` (PID ${pids.join(', ')})` : ''}. Playwright sẽ dùng lại server cũ, kết quả e2e có thể sai.`);
    let choice = BUSY_PORTS === 'kill' ? 'k' : flags.yes ? 'c' : '';
    if (!choice) notify(`${feature}: cổng ${busy.join(', ')} đang bận`, 'cần bạn chọn dừng hay chạy tiếp');
    while (!['k', 'c', 'q'].includes(choice)) choice = (await ask('  [k] dừng các server này   [c] vẫn chạy verify   [q] dừng orchestrator\n  > ')).toLowerCase() || 'q';
    if (choice === 'q') return false;
    if (choice === 'k') {
      for (const pid of pids) {
        if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
        else { try { process.kill(pid, 'SIGTERM'); } catch {} }
      }
      log(dim(`  đã dừng PID ${pids.join(', ') || '(không tìm thấy PID, hãy tự dừng)'}`));
    }
  }
  if (!(await checkHumanTasks(state))) return false;

  // AC with no test at all is decided by a script, no need to pay an LLM to discover it
  let trace = acTrace(state);
  while (trace?.missing.length) {
    warn(`Sensor: ${trace.missing.length} AC chưa có test nhắc tới mã AC-n: ${trace.missing.join(', ')} (xem ${dir}/ac-trace.md)`);
    if (AC_TRACE !== 'gate') break;
    if (state.fixRounds >= MAX_FIX_ROUNDS) { err(`Vẫn thiếu test cho ${trace.missing.join(', ')} sau ${MAX_FIX_ROUNDS} vòng sửa.`); return false; }
    const r = await fixRound(state, `${dir}/ac-trace.md`, `these acceptance criteria have no test that mentions them: ${trace.missing.join(', ')}. Add tests whose name contains the AC id (e.g. "AC-3 ..."), register new API test files in apps/api/scripts/test.mjs, and do not weaken existing tests. Then stop.`);
    if (r === 'stop') return false;
    trace = acTrace(state);
  }
  return runLane(state, 'verify', { extra: verifyExtra(state, trace) });
}

function portBusy(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    const done = (v) => { s.destroy(); resolve(v); };
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
    s.setTimeout(800, () => done(false));
  });
}

function pidsOnPort(port) {
  if (process.platform === 'win32') {
    const out = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' }).stdout || '';
    return out.split(/\r?\n/).filter((l) => /LISTENING/i.test(l) && new RegExp(`:${port}\\s`).test(l)).map((l) => Number(l.trim().split(/\s+/).pop())).filter(Boolean);
  }
  const out = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout || '';
  return out.split(/\s+/).map(Number).filter(Boolean);
}

// ---------- gates ----------
async function humanGate(state, lane, gate) {
  const files = gate === 'G1+G2' ? ['spec.md', 'design.md', 'plan.md'] : gate === 'G1' ? ['spec.md'] : gate === 'G2' ? ['design.md', 'plan.md'] : ['pr.md', 'review.md', 'security.md'];
  const existing = files.map((f) => path.join(dir, f)).filter((f) => fs.existsSync(f));

  log('\n' + yellow(bold(`━━━ ${gate} · cần bạn duyệt ━━━`)));
  for (const f of existing) log(`  📄 ${f}  ${dim(`(${countLines(f)} dòng)`)}`);
  const page = writeGatePage(state, gate, existing);
  log(`  📋 ${page}  ${dim('(AC, task, rủi ro, checklist: đọc file này trước)')}`);
  const last = [...state.history].reverse().find((h) => h.lane === lane && h.ok);
  if (last) {
    const summary = tailLines(last.log, 12);
    if (summary.trim()) log(dim('  ── tóm tắt từ agent ──\n') + summary.replace(/^/gm, '  '));
  }

  if (flags.yes) { log(green(`  ✔ ${gate} tự duyệt (--yes)`)); return approve(state, gate); }
  notify(`${feature}: cần duyệt ${gate}`, `Mở ${page}`);

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
  maybeFreeze(state);
  const sec = needSecurity(state, profile);
  const review = verdictOf('review.md');

  // environment problems (permissions, busy ports, DB down, network) cannot be fixed by the build agent
  if (review === 'blocked-env') {
    err('Verify bị chặn bởi môi trường, không phải lỗi code. Không quay lại build.');
    const todo = section(path.join(dir, 'review.md'), 'Cần người xử lý');
    if (todo) log(todo.replace(/^/gm, '  '));
    log(dim(`  Xử lý xong rồi chạy: pnpm ai ${feature} --from verify`));
    return 'stop';
  }
  // the spec or design is wrong or untestable: build cannot fix that, a human has to decide
  if (review === 'back-to-design') {
    err('Verify kết luận spec hoặc design có vấn đề, không phải code. Không quay lại build.');
    const todo = section(path.join(dir, 'review.md'), 'Cần sửa spec hoặc design');
    if (todo) log(todo.replace(/^/gm, '  '));
    log(dim(`  Spec sai: pnpm ai ${feature} --from define · design/plan sai: pnpm ai ${feature} --from design (bạn duyệt lại cổng tương ứng)`));
    return 'stop';
  }
  if (review === null && !(await acceptUnknown('review.md'))) return 'stop';

  // security only reviews code that verify already accepted: no point reviewing code that goes back to build
  if (review !== 'back-to-build') {
    if (sec && !state.done.includes('security')) {
      if (!(await runLane(state, 'security'))) return 'stop';
    }
    const security = sec ? verdictOf('security.md') : 'pass';
    if (sec && security === null && !(await acceptUnknown('security.md'))) return 'stop';
    if (security !== 'blockers') {
      log(green('✔ Review đạt') + dim(` (review: ${review ?? '?'}${sec ? `, security: ${security ?? '?'}` : ''})`));
      return 'continue';
    }
  }

  const fromSec = review !== 'back-to-build';
  if (state.fixRounds >= MAX_FIX_ROUNDS) {
    err(`Vẫn còn blocker sau ${MAX_FIX_ROUNDS} vòng sửa. Đọc ${dir}/${fromSec ? 'security.md' : 'review.md'}, quyết định rồi chạy: pnpm ai ${feature} --from build`);
    return 'stop';
  }
  const src = fromSec ? `${dir}/security.md` : `${dir}/review.md`;
  if ((await fixRound(state, src, `fix every blocker and major finding in ${src}. Only those, then stop.`)) === 'stop') return 'stop';
  if (!(await runVerify(state))) return 'stop';
  return qualityLoop(state, profile);
}

// One fix round: back to build with a precise instruction. Stops when nothing changed or QA tests were weakened.
async function fixRound(state, src, what) {
  state.fixRounds += 1;
  log(yellow(bold(`\n↺ Vòng sửa ${state.fixRounds}/${MAX_FIX_ROUNDS}: quay lại build`)));
  state.done = state.done.filter((l) => !['build', 'verify', 'security'].includes(l));
  saveState(state);
  const before = codeFingerprint();
  if (!(await runLane(state, 'build', { extra: `Fix round ${state.fixRounds}: ${what}`, round: state.fixRounds }))) return 'stop';
  if (codeFingerprint() === before) {
    err(`Vòng sửa ${state.fixRounds} không thay đổi code nào. Lặp lại chỉ tốn quota.`);
    log(dim(`  Đọc ${src} và ${dir}/status.md: thường là việc cần người (quyền, môi trường, quyết định). Xong rồi chạy: pnpm ai ${feature} --from verify`));
    return 'stop';
  }
  return qaCheck(state) === 'stop' ? 'stop' : 'ok';
}

async function acceptUnknown(file) {
  warn(`Không tìm thấy dòng VERDICT trong ${file}.`);
  if (flags.yes) return true;
  return (await ask('  Coi như đạt và đi tiếp? [y/n] ')).toLowerCase() === 'y';
}

// text of a "## <title>" section, up to the next heading
function section(file, title) {
  const m = readIf(file).match(new RegExp(`^##\\s+${title}[^\\n]*\\n([\\s\\S]*?)(?=^#|^\\s*VERDICT:|(?![\\s\\S]))`, 'm'));
  return m ? m[1].trim() : '';
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
      const model = modelFor(lane, engine) || 'default';
      const fb = unique(splitList(cfg[`FALLBACK_${key}`] ?? cfg.FALLBACK_DEFAULT ?? 'claude codex deepseek')).filter((e) => e !== engine && !DISABLED.has(e));
      const gate = profile.gates[lane] ? yellow(` ⏸ ${profile.gates[lane]}`) : '';
      const skipSec = lane === 'security' && !needSecurity(state, profile);
      const cond = skipSec ? dim(state.done.includes('intake') ? ' (bỏ qua: không có rủi ro)' : ' (chỉ chạy nếu intake gắn cờ rủi ro)') : '';
      const done = state.done.includes(lane) ? green(' ✔') : '';
      const off = DISABLED.has(engine) ? red(' (tắt → dùng fallback)') : '';
      return `  ${lane.padEnd(10)} ${(engineColor[engine] || ((s) => s))(engine.padEnd(9))}${off} ${dim(model.padEnd(28))} ${dim('fallback: ' + (fb.join(' → ') || '-'))}${gate}${cond}${done}`;
    });
  log(bold(`\n  Profile: ${profile.name}`) + (state.risks?.length ? yellow(`  · rủi ro: ${state.risks.join(', ')}`) : '') + dim(`  · tối đa ${MAX_FIX_ROUNDS} vòng sửa`));
  log(rows.join('\n'));
  log(dim(`  Giới hạn mỗi lane: ${LANE_TIMEOUT_MS ? LANE_TIMEOUT_MS / 60_000 + ' phút' : 'không'}${DISABLED.size ? ` · tắt: ${[...DISABLED].join(', ')}` : ''}`));
  const cap = [RUN_MAX_MS && `${RUN_MAX_MS / 60_000} phút`, RUN_MAX_TOKENS && `${fmtK(RUN_MAX_TOKENS)} token`, RUN_MAX_COST && `$${RUN_MAX_COST}`].filter(Boolean).join(' / ');
  log(dim(`  Trần mỗi lần chạy: ${cap || 'không'} · guard lane chỉ-đọc: ${READONLY_GUARD} · test QA: ${QA_FREEZE} · AC trace: ${AC_TRACE}`));
}

function finish(state, outcome) {
  const rows = state.history.map((h) => `| ${h.lane} | ${h.engine} | ${h.model} | ${fmtMs(h.ms)} | ${fmtTokens(h) || '-'} | ${h.costUsd != null ? '$' + h.costUsd.toFixed(2) : '-'} | ${h.ok ? 'ok' : 'chuyển engine / dừng'} |`);
  const tot = totals(state.history);
  const md = [
    `# Run summary — ${feature}`,
    '',
    `- Kết quả: **${outcome}**`,
    `- Profile: ${state.profile || '?'} · Rủi ro: ${(state.risks || []).join(', ') || 'không'}`,
    `- Gate đã duyệt: ${Object.keys(state.gates).join(', ') || 'chưa'}`,
    `- Vòng sửa: ${state.fixRounds}`,
    `- Engine build: ${state.builtBy || '-'}`,
    `- Tổng: ${fmtMs(tot.ms)} · ${fmtK(tot.tokens)} token${tot.cost ? ` · ~$${tot.cost.toFixed(2)} (giá API tương đương do Claude Code báo; gói Pro không tính tiền nhưng con số này phản ánh mức tiêu quota)` : ''}`,
    '',
    '| Lane | Engine | Model | Thời gian | Token | Chi phí API ước tính | Kết quả |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    'Token = input (kể cả cache) + output. Codex chỉ báo tổng; OpenCode/DeepSeek chưa có số.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'run-summary.md'), md);
  commitArtifacts(`docs(${feature}): run ${outcome}`);

  if (outcome !== 'interrupted') notify(`${feature}: ${outcome === 'done' ? 'xong' : 'dừng'}`, outcome === 'done' ? 'mở pr.md để tạo PR' : outcome);
  log('\n' + bold(outcome === 'done' ? green('◆ Xong') : yellow(`◆ Dừng: ${outcome}`)));
  for (const h of state.history) log(`  ${h.ok ? green('✔') : yellow('↷')} ${h.lane.padEnd(10)} ${h.engine.padEnd(9)} ${dim(fmtMs(h.ms) + fmtMetrics(h))}`);
  log(bold(`  Tổng: ${fmtMs(tot.ms)} · ${fmtK(tot.tokens)} token${tot.cost ? ` · ~$${tot.cost.toFixed(2)}` : ''}`));
  log(dim(`  Tóm tắt: ${dir}/run-summary.md`));
  if (outcome !== 'done') log(dim(`  Chạy tiếp: pnpm ai ${feature}`));
  else if (fs.existsSync(path.join(dir, 'pr.md'))) log(dim(`  Tạo PR: gh pr create --body-file ${dir}/pr.md`));
  process.exit(outcome === 'done' ? 0 : outcome === 'interrupted' ? 130 : 2);
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
function fmtK(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n || 0); }
function tokensOf(h) { return h.tokensTotal ?? ((h.tokensIn || 0) + (h.tokensOut || 0)); }
function fmtTokens(h) { const t = tokensOf(h); return t ? fmtK(t) : ''; }
function fmtMetrics(m) {
  const parts = [fmtTokens(m) && `${fmtTokens(m)} tok`, m.costUsd != null && `~$${m.costUsd.toFixed(2)}`, m.turns && `${m.turns} lượt`].filter(Boolean);
  return parts.length ? ', ' + parts.join(', ') : '';
}
function totals(hist) {
  return hist.reduce((a, h) => ({ ms: a.ms + (h.ms || 0), tokens: a.tokens + tokensOf(h), cost: a.cost + (h.costUsd || 0) }), { ms: 0, tokens: 0, cost: 0 });
}
function fmtMs(ms) { const s = Math.round(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`; }
function log(s) { process.stdout.write(s + '\n'); }
function warn(s) { process.stdout.write(yellow('⚠ ' + s) + '\n'); }
function err(s) { process.stdout.write(red('✘ ' + s) + '\n'); }
function die(s) { err(s); process.exit(1); }

function printHelp() {
  log(`Usage:
  pnpm ai <feature> "<request>"   start a feature (creates work/<feature>/ and branch feat/<feature>)
  pnpm ai <feature>               resume

Options: --yes  --dry-run  --profile vibe|standard|full  --from <lane>  --only <lane>  --quiet  --refreeze
Lanes:   ${Object.keys(LANES).join(', ')}`);
}

await main();
