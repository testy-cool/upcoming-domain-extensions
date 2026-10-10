#!/usr/bin/env bash
# Run the daily pipeline here and build the site into web/dist, the same steps the GitHub Action runs.
# Alerts are skipped unless --alerts is given, because they post to the public ntfy topics.
set -euo pipefail
cd "$(dirname "$0")"
for s in pipeline/s1_*.py pipeline/s2_*.py pipeline/s3_*.py; do echo "== $s"; uv run python "$s"; done
if [ "${1:-}" = "--alerts" ]; then uv run python pipeline/s4_send_alerts_to_ntfy.py; fi
(cd web && pnpm build)
(cd web && pnpm prerender)
