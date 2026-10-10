"""Step 2: download every 2026-round application from ICANN.

Part of f/upcoming_tlds/daily_update. Reads the same JSON service that
ICANN's application search page uses, 100 applications per request, and
the contention sets file ICANN published on Reveal Day. Writes
<data_dir>/applications.json. Downloads everything again on every run.
"""

import csv
import io
import json
from pathlib import Path

import httpx

ICANN_APS = "https://newgtldprogram-aps.icann.org/aps"
CONTENTION_CSV = "https://newgtldprogram.icann.org/en/application-rounds/round2/reveal-day-contention-sets.csv"
HEADERS = {"User-Agent": "upcoming-tlds directory (personal use)"}


def main(data_dir: str = "/home/vlad/upcoming-tlds/data"):
    apps, page_num, total = [], 0, None
    with httpx.Client(headers=HEADERS, timeout=60, follow_redirects=True) as client:
        while total is None or len(apps) < total:
            body = {"searchAndFilter": {}, "sort": {"field": "primaryString", "direction": "ASC"},
                    "pagination": {"pageNum": page_num, "pageSize": 100}}
            r = client.post(f"{ICANN_APS}/applications", json=body)
            r.raise_for_status()
            data = r.json()
            total = data["totalApplications"]
            if not data["applications"]:
                break
            apps += data["applications"]
            page_num += 1
        if len(apps) != total:
            raise RuntimeError(f"got {len(apps)} of {total} applications")
        r = client.get(CONTENTION_CSV)
        r.raise_for_status()
    contention = {}
    for row in list(csv.reader(io.StringIO(r.text.lstrip("\ufeff"))))[1:]:
        if len(row) >= 4:
            for label in row[3].split(","):
                contention[label.strip().lower()] = int(row[0])
    Path(data_dir, "applications.json").write_text(
        json.dumps({"applications": apps, "contention": contention}, ensure_ascii=False))
    result = {"applications": len(apps), "backup_strings": sum(a["applicationHumanReadableId"].endswith("-R") for a in apps),
              "names_in_contention": len(contention)}
    print(json.dumps(result))
    return result
