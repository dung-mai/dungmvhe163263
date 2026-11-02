#!/usr/bin/env bash
# Create work/<feature>/ from the templates and put the request into brief.md.
#
#   scripts/ai/new-feature.sh <feature-slug> "<request in plain words>"
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

feat="${1:?feature slug required, e.g. rbac-login}"
request="${2:?request text required}"

case "$feat" in
  *[!a-z0-9-]*|"") echo "Use a kebab-case slug: letters, digits, dashes." >&2; exit 1 ;;
esac

dir="work/$feat"
if [ -e "$dir" ]; then
  echo "$dir already exists." >&2
  exit 1
fi
mkdir -p "$dir/evidence" "$dir/logs"

export FEAT="$feat" REQUEST="$request"
for t in brief status; do
  node -e '
    const fs = require("fs");
    const [src, dst] = process.argv.slice(1);
    const out = fs.readFileSync(src, "utf8")
      .replaceAll("{{feature}}", process.env.FEAT)
      .replaceAll("{{request}}", process.env.REQUEST);
    fs.writeFileSync(dst, out);
  ' ".agents/templates/$t.md" "$dir/$t.md"
done

git checkout -b "feat/$feat" 2>/dev/null || echo "(branch feat/$feat exists or not switchable; staying on $(git branch --show-current))"

echo "Created $dir with brief.md and status.md."
echo "Next: run intake  ->  scripts/ai/step.sh intake $feat   (or the interactive prompt in .agents/RUNBOOK.md)"
