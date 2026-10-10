"""Step 3: join the IANA records and the 2026 applications into the file the site reads.

Part of f/upcoming_tlds/daily_update. Each applied-for name gets one entry,
with all its applications. A name that already exists at IANA (live or
removed) keeps its IANA facts and gets its applications added. Backup
strings (ids ending in -R) stay a note on their application. Before writing
<data_dir>/tlds.json, the previous one is kept as tlds.previous.json so
step 4 can tell what changed.
"""

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ICANN_APP_PAGE = "https://newgtldprogram-aps.icann.org/applications"


def merge(iana: list[dict], apps: list[dict], contention: dict[str, int]) -> list[dict]:
    by_tld = {t["tld"]: t | {"applications": []} for t in iana}
    # An "-R" record is the backup string named for the application with the
    # same id. It stays a note on that application unless the applicant
    # switches to it during the Replacement Period.
    backups = {a["applicationHumanReadableId"][:-2]: a["primaryString"]["aLabel"].lower()
               for a in apps if a["applicationHumanReadableId"].endswith("-R") and a["applicationStatus"] == "Active"}
    for a in apps:
        if a["applicationHumanReadableId"].endswith("-R"):
            continue
        label = a["primaryString"]["aLabel"].lower()
        entry = by_tld.setdefault(label, {
            "tld": label,
            "display": a["primaryString"]["uLabel"] or label,
            "type": "applied",
            "manager": None,
            "status": "applied",
            "registered": None, "delegated": None, "removed": None,
            "website": None, "whois": None, "history": [], "iana_url": None,
            "applications": [],
        })
        app_id = a["applicationHumanReadableId"]
        entry["applications"].append({
            "id": app_id,
            "applicant": a["organizationName"],
            "country": a["organizationCountryCode"],
            "region": a["icannRegion"],
            "kinds": a["tldTypes"],
            "stage": a["processingStage"],
            "status": a["applicationStatus"],
            "backup_string": backups.get(app_id),
            "url": f"{ICANN_APP_PAGE}/{app_id}",
        })
    for entry in by_tld.values():
        entry["contention_set"] = contention.get(str(entry["tld"]))
    return sorted(by_tld.values(), key=lambda t: t["tld"])


def main(data_dir: str = "/home/vlad/upcoming-tlds/data"):
    data = Path(data_dir)
    iana = json.loads((data / "iana.json").read_text())
    icann = json.loads((data / "applications.json").read_text())
    tlds = merge(iana, icann["applications"], icann["contention"])
    out = {
        "collected_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "counts": {s: sum(t["status"] == s for t in tlds) for s in ("live", "applied", "removed")},
        "tlds": tlds,
    }
    if (data / "tlds.json").exists():
        shutil.copy(data / "tlds.json", data / "tlds.previous.json")
    tmp = data / "tlds.json.tmp"
    tmp.write_text(json.dumps(out, ensure_ascii=False))
    tmp.replace(data / "tlds.json")
    print(json.dumps(out["counts"]))
    return out["counts"]
