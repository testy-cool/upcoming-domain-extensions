"""Step 4: send what changed since the last run to ntfy.

Compares tlds.previous.json with tlds.json. Every change goes to two places:
the topic of that one extension, which the "Alert me" button on its page
subscribes to, and one topic for everything. The first run has nothing to
compare with and sends nothing.
"""

import json
import time
from pathlib import Path

import httpx

ALL_TOPIC = "testycool-domain-extensions"
SITE = "https://testy.cool/upcoming-domain-extensions"


def topic_for(tld: str) -> str:
    return f"testycool-ext-{tld}"


def active(t: dict) -> list[dict]:
    return [a for a in t["applications"] if a["status"] == "Active"]


def describe(old: dict, new: dict) -> list[tuple[str, str]]:
    before = {t["tld"]: t for t in old["tlds"]}
    after = {t["tld"]: t for t in new["tlds"]}
    changes = []
    for tld, t in after.items():
        was = before.get(tld)
        if was is None:
            if t["status"] == "applied":
                changes.append((tld, f".{tld} has a new 2026 application"))
            else:
                changes.append((tld, f".{tld} appeared at IANA ({t['status']})"))
        elif t["status"] != was["status"]:
            if t["status"] == "live":
                changes.append((tld, f".{tld} is now live, run by {t['manager']}"))
            elif t["status"] == "removed":
                changes.append((tld, f".{tld} was removed from the internet"))
            else:
                changes.append((tld, f".{tld} is now {t['status']}"))
        elif len(active(t)) != len(active(was)):
            changes.append((tld, f".{tld} now has {len(active(t))} applications, was {len(active(was))}"))
        elif {a["stage"] for a in active(t)} != {a["stage"] for a in active(was)}:
            stages = ", ".join(sorted({a["stage"] for a in active(t)}))
            changes.append((tld, f".{tld} applications moved to: {stages}"))
        elif t["history"] != was["history"] and t["history"]:
            changes.append((tld, f".{tld}: {t['history'][-1]['title']}"))
    for tld in before.keys() - after.keys():
        changes.append((tld, f".{tld} dropped out of the lists (application withdrawn)"))
    return sorted(changes)


def post(client: httpx.Client, topic: str, title: str, body: str, click: str):
    for attempt in range(5):
        r = client.post(f"https://ntfy.sh/{topic}", content=body.encode(),
                        headers={"Title": title, "Click": click})
        if r.status_code != 429:
            r.raise_for_status()
            return
        time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"ntfy kept refusing {topic} with 429")


def main(data_dir: str = "data"):
    data = Path(data_dir)
    if not (data / "tlds.previous.json").exists():
        print("first run, nothing to compare with")
        return {"changes": 0}
    old = json.loads((data / "tlds.previous.json").read_text())
    new = json.loads((data / "tlds.json").read_text())
    changes = describe(old, new)
    print("\n".join(line for _, line in changes) or "no changes")
    if not changes:
        return {"changes": 0}
    with httpx.Client(timeout=30) as client:
        lines = [line for _, line in changes]
        head = lines if len(lines) <= 25 else lines[:25] + [f"... and {len(lines) - 25} more"]
        post(client, ALL_TOPIC, f"Domain extensions: {len(lines)} change(s)", "\n".join(head), SITE)
        for tld, line in changes:
            post(client, topic_for(tld), f".{tld} changed", line, f"{SITE}/{tld}")
            time.sleep(1)
    return {"changes": len(changes)}


if __name__ == "__main__":
    main()
