#!/usr/bin/env bash
# Run a Windmill script on the zenbook and follow it: progress and new log lines until it ends, then the result.
#   windmill/run.sh f/upcoming_tlds/daily_update '{}'                  a flow or a script, found by its path
#   windmill/run.sh f/upcoming_tlds/daily_update_steps/s1_download_iana_domain_records @/path/on/the/zenbook/args.json     big arguments from a file
# Everything prints as it comes and is also written to windmill/.logs/run-<time>.log. While the job waits for a
# worker, it says every 30 s which jobs hold the workers.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$here/.logs"
log="$here/.logs/run-$(date +%Y%m%d-%H%M%S)-$(basename "$1").log"
exec > >(tee -a "$log") 2>&1
echo "run.sh: this run is also written to $log"
ssh zenbook "set -a && . ~/.config/jobs/windmill.env && set +a && python3 -u - '$1' '${2:-{\}}'" <<'PY'
import json, os, sys, time, urllib.request
path, args = sys.argv[1], sys.argv[2]
if args.startswith("@"):
    args = open(args[1:]).read()
root, token = os.environ["WINDMILL_URL"] + "/api", os.environ["WINDMILL_TOKEN"]
base = root + "/w/jobdex"
def call(p, body=None, at=None):
    r = urllib.request.Request((at or base) + p, data=None if body is None else body.encode(),
                               headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        text = resp.read().decode()
    try: return json.loads(text)
    except ValueError: return text
def busy():
    alive = call("/workers/list?ping_since=120", at=root)
    running = [j for j in call("/jobs/list?running=true&per_page=20") if j["id"] != job]
    return "%d worker(s) alive, busy with: %s" % (len(alive), ", ".join(
        "%s (%s)" % (j.get("script_path"), j["id"][:8]) for j in running) or "nothing")
try:
    call("/flows/get/" + path)
    kind = "f"
except Exception:
    kind = "p"
job = call("/jobs/run/%s/" % kind + path, args)
print("job", job, "http://windmill.local:8000/run/%s?workspace=jobdex" % job, flush=True)
shown, started, said = 0, time.time(), 0
while True:
    time.sleep(3)
    j = call("/jobs_u/get/" + job)
    logs = j.get("logs") or ""
    for line in logs[shown:].splitlines():
        if line.strip(): print("   ", line, flush=True)
    shown = len(logs)
    if j["type"] == "CompletedJob":
        print("success" if j["success"] else "FAILED", "after %d s" % (time.time() - started), flush=True)
        print(json.dumps(j.get("result"), ensure_ascii=False, indent=1)[:4000], flush=True)
        break
    if not j.get("running"):
        if time.time() - said >= 30:
            print("  waiting for a worker (%d s): %s" % (time.time() - started, busy()), flush=True)
            said = time.time()
        continue
    p = call("/job_metrics/get_progress/" + job)
    print("  progress", p, flush=True)
PY
