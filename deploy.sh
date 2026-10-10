#!/usr/bin/env bash
# Build the site and copy the app to the zenbook, then restart its service.
# The zenbook's data/ belongs to Windmill and the watch list; it is only seeded when missing.
set -euo pipefail
cd "$(dirname "$0")"
(cd web && pnpm build)
rsync -a --delete --exclude .git --exclude .venv --exclude data --exclude web/node_modules --exclude windmill/.logs ./ zenbook:upcoming-tlds/
ssh zenbook 'test -f upcoming-tlds/data/tlds.json' || rsync -a --exclude raw data/ zenbook:upcoming-tlds/data/
ssh zenbook 'mkdir -p ~/.config/systemd/user && cp upcoming-tlds/upcoming-tlds.service ~/.config/systemd/user/ &&
  systemctl --user daemon-reload && systemctl --user enable --now upcoming-tlds.service && systemctl --user restart upcoming-tlds.service'
sleep 1
curl -sf -o /dev/null -w "site %{http_code}\n" http://100.124.28.119:8977/
