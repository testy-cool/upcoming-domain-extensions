"""Collect every top-level domain from IANA and every 2026 application from ICANN.

Writes data/tlds.json, which the site reads. Raw IANA pages are cached in
data/raw so a rerun only refetches pages older than a week, plus every page
whose domain changed in the root list.
"""

import asyncio
import csv
import io
import html
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

ROOT = Path(__file__).parent
DATA = ROOT / "data"
RAW = DATA / "raw" / "iana"

IANA_DB = "https://www.iana.org/domains/root/db"
ICANN_APS = "https://newgtldprogram-aps.icann.org/aps"
ICANN_APP_PAGE = "https://newgtldprogram-aps.icann.org/applications"
PAGE_MAX_AGE = 7 * 24 * 3600
HEADERS = {"User-Agent": "upcoming-tlds directory (personal use)"}


def text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def parse_root_list(page: str) -> list[dict]:
    rows = []
    for row in re.findall(r"<tr>(.*?)</tr>", page, re.S):
        link = re.search(r'href="/domains/root/db/([^"]+)\.html">([^<]+)</a>', row)
        if not link:
            continue
        cells = re.findall(r"<td>(.*?)</td>", row, re.S)
        rows.append({
            "slug": link.group(1),
            "display": link.group(2).lstrip("."),
            "type": text(cells[1]),
            "manager": text(cells[2]),
        })
    return rows


def parse_detail(page: str) -> dict:
    main = page[page.find("<main"):page.find("</main>")]
    reports = [
        {"title": text(t), "date": d, "url": "https://www.iana.org" + u}
        for u, t, d in re.findall(r'<li><a href="(/reports/[^"]+)">(.*?)</a>\s*\((\d{4}-\d{2}-\d{2})\)', main, re.S)
    ]
    site = re.search(r'URL for registration services:\s*<a href="([^"]+)"', main)
    whois = re.search(r"WHOIS Server:\s*([^<\s]+)", main)
    updated = re.search(r"Record last updated (\d{4}-\d{2}-\d{2})", main)
    registered = re.search(r"Registration date (\d{4}-\d{2}-\d{2})", main)
    return {
        "in_root": "not present in the root zone" not in main,
        "website": site.group(1) if site else None,
        "whois": whois.group(1) if whois else None,
        "registered": registered.group(1) if registered else None,
        "updated": updated.group(1) if updated else None,
        "reports": sorted(reports, key=lambda r: r["date"]),
    }


async def fetch_detail(client, sem, slug: str, force: bool) -> str:
    path = RAW / f"{slug}.html"
    if not force and path.exists() and time.time() - path.stat().st_mtime < PAGE_MAX_AGE:
        return path.read_text()
    r = None
    async with sem:
        for attempt in range(4):
            try:
                r = await client.get(f"{IANA_DB}/{slug}.html")
                r.raise_for_status()
                break
            except httpx.HTTPError:
                if attempt == 3:
                    raise
                await asyncio.sleep(2 ** attempt)
    assert r is not None
    path.write_text(r.text)
    return r.text


async def collect_iana(client) -> list[dict]:
    RAW.mkdir(parents=True, exist_ok=True)
    page = (await client.get(IANA_DB)).text
    rows = parse_root_list(page)
    if len(rows) < 1000:
        raise RuntimeError(f"IANA root list returned only {len(rows)} rows")

    previous = {}
    snapshot = DATA / "iana-list.json"
    if snapshot.exists():
        previous = {r["slug"]: r for r in json.loads(snapshot.read_text())}
    snapshot.write_text(json.dumps(rows, ensure_ascii=False, indent=1))

    sem = asyncio.Semaphore(6)
    pages = await asyncio.gather(*[
        fetch_detail(client, sem, r["slug"], force=previous.get(r["slug"]) != r) for r in rows
    ])
    out = []
    for row, detail_page in zip(rows, pages):
        detail = parse_detail(detail_page)
        delegated = next((r["date"] for r in detail["reports"] if r["title"].startswith("Delegation")), None)
        removed = None
        if not detail["in_root"]:
            removed = next((r["date"] for r in reversed(detail["reports"])
                            if re.match(r"(Revocation|Retirement|Removal)", r["title"])), detail["updated"])
        out.append({
            "tld": row["slug"],
            "display": row["display"],
            "type": row["type"],
            "manager": None if row["manager"] == "Not assigned" else row["manager"],
            "status": "live" if detail["in_root"] else "removed",
            "registered": detail["registered"],
            "delegated": delegated or detail["registered"],
            "removed": removed,
            "website": detail["website"],
            "whois": detail["whois"],
            "history": detail["reports"],
            "iana_url": f"{IANA_DB}/{row['slug']}.html",
        })
    return out


async def collect_applications(client) -> list[dict]:
    apps, page_num = [], 0
    while True:
        body = {"searchAndFilter": {}, "sort": {"field": "primaryString", "direction": "ASC"},
                "pagination": {"pageNum": page_num, "pageSize": 100}}
        r = await client.post(f"{ICANN_APS}/applications", json=body)
        r.raise_for_status()
        data = r.json()
        apps += data["applications"]
        page_num += 1
        if page_num * 100 >= data["totalApplications"]:
            break
    if len(apps) != data["totalApplications"]:
        raise RuntimeError(f"got {len(apps)} of {data['totalApplications']} applications")
    return apps


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


async def collect_contention(client) -> dict[str, int]:
    r = await client.get("https://newgtldprogram.icann.org/en/application-rounds/round2/reveal-day-contention-sets.csv")
    r.raise_for_status()
    sets = {}
    for row in list(csv.reader(io.StringIO(r.text.lstrip("\ufeff"))))[1:]:
        if len(row) >= 4:
            for label in row[3].split(","):
                sets[label.strip().lower()] = int(row[0])
    return sets


async def main():
    async with httpx.AsyncClient(headers=HEADERS, timeout=60, follow_redirects=True) as client:
        iana = await collect_iana(client)
        apps = await collect_applications(client)
        contention = await collect_contention(client)
    tlds = merge(iana, apps, contention)
    DATA.mkdir(exist_ok=True)
    out = {
        "collected_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "counts": {s: sum(t["status"] == s for t in tlds) for s in ("live", "applied", "removed")},
        "applications_total": len(apps),
        "tlds": tlds,
    }
    (DATA / "tlds.json").write_text(json.dumps(out, ensure_ascii=False))
    print(json.dumps(out["counts"]), "applications:", len(apps))


if __name__ == "__main__":
    asyncio.run(main())
