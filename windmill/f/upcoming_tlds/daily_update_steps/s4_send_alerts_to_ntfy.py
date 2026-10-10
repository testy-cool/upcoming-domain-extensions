"""Step 4: send what changed since the last run to the ntfy topic on the Alerts page.

Part of f/upcoming_tlds/daily_update. Compares tlds.previous.json with
tlds.json. Always reported: a domain going live, a live domain removed, a
new 2026 application name, a name dropping out. For domains on the watch
list (<data_dir>/alerts.json, set from the site), any change at all. The
first run has nothing to compare with and sends nothing.
"""

import json
from pathlib import Path

import httpx


def describe(old: dict, new: dict, watching: set[str]) -> list[str]:
    before = {t["tld"]: t for t in old["tlds"]}
    after = {t["tld"]: t for t in new["tlds"]}
    lines = []
    for tld, t in after.items():
        was = before.get(tld)
        active = [a for a in t["applications"] if a["status"] == "Active"]
        if t["status"] == "live" and (not was or was["status"] != "live"):
            lines.append(f".{tld} is now live, run by {t['manager']}")
        elif t["status"] == "removed" and was and was["status"] == "live":
            lines.append(f".{tld} was removed from the internet")
        elif not was and t["status"] == "applied":
            lines.append(f".{tld} has a new 2026 application")
        elif was and tld in watching and json.dumps(was, sort_keys=True) != json.dumps(t, sort_keys=True):
            was_active = [a for a in was["applications"] if a["status"] == "Active"]
            stages = sorted({a["stage"] for a in active})
            lines.append(f".{tld} changed: {len(was_active)} -> {len(active)} applications, stage {', '.join(stages) or 'none'}")
    for tld in before.keys() - after.keys():
        lines.append(f".{tld} dropped out of the lists (application withdrawn)")
    return lines


def send(topic: str, lines: list[str], link: str):
    if not lines:
        return
    head = lines if len(lines) <= 25 else lines[:25] + [f"... and {len(lines) - 25} more"]
    httpx.post(
        f"https://ntfy.sh/{topic}",
        content="\n".join(head).encode(),
        headers={"Title": f"Top-level domains: {len(lines)} change(s)", "Click": link},
        timeout=30,
    ).raise_for_status()


def main(data_dir: str = "/home/vlad/upcoming-tlds/data", site_url: str = "http://100.124.28.119:8977"):
    data = Path(data_dir)
    if not (data / "tlds.previous.json").exists():
        print("first run, nothing to compare with")
        return {"changes": 0}
    old = json.loads((data / "tlds.previous.json").read_text())
    new = json.loads((data / "tlds.json").read_text())
    alerts = json.loads((data / "alerts.json").read_text())
    lines = describe(old, new, set(alerts["watching"]))
    print("\n".join(lines) or "no changes")
    send(alerts["topic"], lines, site_url)
    return {"changes": len(lines), "topic": alerts["topic"], "lines": lines[:50]}
