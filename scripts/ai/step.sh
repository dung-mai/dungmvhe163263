#!/usr/bin/env bash
# Run one lane of the AI delivery flow on the engine routed in .agents/models.env.
#
#   scripts/ai/step.sh <lane> <feature> [engine]
#
# lane:    intake | define | design | test-plan | build | verify | security | pr | retro
# feature: folder name under work/, e.g. rbac-login
# engine:  optional override: claude | codex | deepseek | deepseek-cc
#
# Examples
#   scripts/ai/step.sh define rbac-login
#   scripts/ai/step.sh build rbac-login codex
#   scripts/ai/step.sh verify rbac-login claude
#
# Headless runs cannot ask you questions; skills write open questions into the artifacts instead.
# For lanes with a human gate (define, design) the interactive mode in RUNBOOK.md is usually better.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

lane="${1:?lane required: intake|define|design|test-plan|build|verify|security|pr|retro}"
feat="${2:?feature required, e.g. rbac-login}"

# shellcheck disable=SC1091
set -a; source .agents/models.env; set +a

case "$lane" in
  intake)    skill=intake ;;
  define)    skill=define ;;
  design)    skill=design ;;
  test-plan) skill=test-plan ;;
  build)     skill=build ;;
  verify)    skill=verify ;;
  security)  skill=security-review ;;
  pr)        skill=create-pr ;;
  retro)     skill=retro ;;
  *) echo "Unknown lane: $lane" >&2; exit 1 ;;
esac

key="$(printf '%s' "$lane" | tr '[:lower:]-' '[:upper:]_')"
engine_var="ENGINE_${key}"
model_var="MODEL_${key}"
engine="${3:-${!engine_var:-claude}}"
model="${!model_var:-}"

dir="work/$feat"
if [ ! -d "$dir" ]; then
  echo "Missing $dir. Create it first: scripts/ai/new-feature.sh $feat \"<request>\"" >&2
  exit 1
fi
mkdir -p "$dir/logs"

prompt="Feature: ${feat}. Lane: ${lane}.
Read AGENTS.md, then ${dir}/status.md and ${dir}/brief.md.
Follow .agents/skills/${skill}/SKILL.md exactly. All inputs and outputs for this feature live in ${dir}/.
You are running non-interactively: do not wait for answers; write open questions into the artifact.
When finished, follow .agents/skills/handoff/SKILL.md to update ${dir}/status.md.
Stop at the gate this skill defines. Do not start the next lane."

stamp="$(date +%Y%m%d-%H%M%S)"
log="${dir}/logs/${stamp}-${lane}-${engine}.log"
echo "▶ lane=${lane} skill=${skill} engine=${engine} model=${model:-default} feature=${feat}"
echo "  log: ${log}"

run_engine() {
  case "$engine" in
    claude)
      claude -p "$prompt" --permission-mode acceptEdits ${model:+--model "$model"}
      ;;
    codex)
      codex exec --sandbox "${CODEX_SANDBOX:-workspace-write}" ${model:+-m "$model"} "$prompt"
      ;;
    deepseek)
      opencode run -m "${model:-${DEEPSEEK_MODEL:-deepseek/deepseek-v4-flash}}" "$prompt"
      ;;
    deepseek-cc)
      settings="${DEEPSEEK_CC_SETTINGS:?set DEEPSEEK_CC_SETTINGS in .agents/models.env}"
      claude --settings "$settings" -p "$prompt" --permission-mode acceptEdits
      ;;
    *)
      echo "Unknown engine: $engine" >&2; return 1
      ;;
  esac
}

run_engine 2>&1 | tee "$log"
echo "✔ done. Next: read ${dir}/status.md"
