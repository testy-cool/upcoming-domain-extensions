#!/usr/bin/env bash
# Push Windmill scripts from this folder to the zenbook's Windmill (workspace jobdex), then pull f/upcoming_tlds back
# so git holds what Windmill holds. Windmill is the source of truth; this folder is its copy.
#
#   windmill/push.sh f/upcoming_tlds/daily_update_steps/s1_download_iana_domain_records.py [more script files...]
#   windmill/push.sh                                   only pull
#
# Every step prints as it goes and the whole run is also written to windmill/.logs/push-<time>.log. Each Windmill
# CLI step stops after STEP_TIMEOUT seconds (default 600) and says so: generate-metadata waits for a Windmill
# worker to run its dependency job, and when every worker is busy it used to wait for hours without a word.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
remote=".cache/upcoming-tlds-wmill"
STEP_TIMEOUT="${STEP_TIMEOUT:-600}"
mkdir -p "$here/.logs"
log="$here/.logs/push-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$log") 2>&1
say() { printf '%s  %s\n' "$(date +%H:%M:%S)" "$*"; }
say "push.sh: this run is also written to $log"

# One Windmill CLI step on the zenbook, with the token from its env file (never printed) and a time limit.
wm() {
  local dir="$1"; shift
  ssh zenbook "cd ~/$dir && set -a && . ~/.config/jobs/windmill.env && set +a && \
    timeout $STEP_TIMEOUT /home/vlad/.local/bin/wmill --workspace jobdex --token \"\$WINDMILL_TOKEN\" \
    --base-url http://127.0.0.1:8000 $*"
}
step() {
  local what="$1"; shift
  say "$what"
  local rc=0
  "$@" || rc=$?
  if [ "$rc" != 0 ]; then
    if [ "$rc" = 124 ]; then
      say "FAILED: $what took more than $STEP_TIMEOUT s and was stopped. A busy Windmill worker is the usual cause:"
      workers
    else
      say "FAILED: $what exited with $rc"
    fi
    exit 1
  fi
}
# The workers and what they run, so a wait for a worker shows up here instead of as silence.
workers() {
  ssh zenbook "set -a && . ~/.config/jobs/windmill.env && set +a && python3 -" <<'PY'
import json, os, urllib.request
def get(path):
    r = urllib.request.Request(os.environ["WINDMILL_URL"] + "/api" + path,
                               headers={"Authorization": "Bearer " + os.environ["WINDMILL_TOKEN"]})
    with urllib.request.urlopen(r, timeout=20) as reply:
        return json.load(reply)
alive = get("/workers/list?ping_since=120")
running = get("/w/jobdex/jobs/list?running=true&per_page=20")
print("   Windmill workers alive: %d; jobs running: %d" % (len(alive), len(running)))
for j in running:
    print("     %s  %s (started %s)" % (j["id"], j.get("script_path"), (j.get("started_at") or "")[:19]))
if len(running) >= len(alive):
    print("   every worker is busy: a generate-metadata waits until one is free")
PY
}

step "copying this folder to the zenbook" rsync -a --delete --exclude '.git' --exclude '.logs' "$here/" "zenbook:$remote/"
if [ $# -gt 0 ]; then
  workers
fi
for f in "$@"; do
  step "generate-metadata $f (its dependency job needs a free worker)" wm "$remote" generate-metadata --yes "$f"
  step "script push $f" wm "$remote" script push "$f"
done
step "pulling f/upcoming_tlds back from Windmill" ssh zenbook "rm -rf ~/$remote-pull && mkdir -p ~/$remote-pull && \
  cp ~/$remote/wmill.yaml ~/$remote-pull/"
step "sync pull" wm "$remote-pull" sync pull --yes --include-schedules --skip-variables
# Copied back without --delete: a script removed from Windmill is removed here by hand, and a file not pushed yet
# is never lost. When scripts were pushed, the code files are not copied back at all (only the metadata and locks):
# a push waits behind a busy Windmill worker, and copying back then overwrote local edits made in the meantime to
# other scripts with Windmill's older code (2026-10-08). Run with no arguments to copy everything back.
if [ $# -gt 0 ]; then
  step "copying the metadata back" rsync -a --exclude '.git' --exclude '*.py' "zenbook:$remote-pull/" "$here/"
else
  step "copying everything back" rsync -a --exclude '.git' "zenbook:$remote-pull/" "$here/"
fi
say "done"
