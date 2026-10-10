#!/usr/bin/env bash
# Run the four daily steps here, against ./data. Only for checking the code; the real runs start in Windmill.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data
for s in windmill/f/upcoming_tlds/daily_update_steps/s*.py; do
  [[ "$s" == *s4_* && "${1:-}" != "--alerts" ]] && { echo "skipping $s (pass --alerts to send)"; continue; }
  echo "== $s"
  uv run python -c "import runpy; runpy.run_path('$s')['main'](data_dir='data')"
done
