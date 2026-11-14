"""Step 1: download IANA's list of every top-level domain and each domain's record page.

Run every day by .github/workflows/update.yml. IANA's root zone database lists every
domain ending that is live or was removed. Each domain's page gives who runs
it, its website and its history with dates. IANA redesigned both pages in
October 2026; cached pages in the old layout are downloaded again. Pages are cached in
<data_dir>/raw, so a run only downloads pages older than a week, plus the
pages of domains whose line in the list changed. A rerun after a crash
skips everything already downloaded. Writes <data_dir>/iana.json.
"""

import asyncio
import html
import json
import re
import time
from pathlib import Path

import httpx

IANA_DB = "https://www.iana.org/domains/root/db"
PAGE_MAX_AGE = 7 * 24 * 3600
HEADERS = {"User-Agent": "upcoming-tlds directory (personal use)"}


def text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


# IANA's list page says "Country Code" and "Special Use". The site and its saved data use
# the older lowercase names, so the two kinds that changed name are spelled out here.
TYPE_NAMES = {"special use": "infrastructure"}
# The list page now calls these two kinds "Generic". Their old name is kept from the last run.
FINER_GENERIC_TYPES = {"sponsored", "generic-restricted"}
MARKS = "\u200e\u200f .\n\t"


def parse_root_list(page: str) -> list[dict]:
    """One dict per row of IANA's table. Reserved names (.test, .example) are left out: they are
    not part of the root zone and never were in this directory."""
    rows = []
    for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", page, re.S):
        link = re.search(r'<a\s+href="/domains/root/db/([^"/]+?)(?:\.html)?"[^>]*>(.*?)</a>', row, re.S)
        cells = re.findall(r"<td\b[^>]*>(.*?)</td>", row, re.S)
        if not link or len(cells) < 7:
            continue
        # The name is the anchor's first text. Icons and the A-label of foreign names follow in spans.
        name = html.unescape(re.split(r"<", link.group(2), maxsplit=1)[0])
        status, kind, manager, script, script_name, sort_key = (text(c) for c in cells[1:7])
        if status == "Reserved":
            continue
        rows.append({
            "slug": link.group(1),
            # IANA wraps right-to-left names in direction marks (&#x200f;اتصالات.&#x200e;)
            "display": name.strip(MARKS),
            "status": status,
            "type": TYPE_NAMES.get(kind.lower(), re.sub(r"\s+", "-", kind.lower())),
            "manager": manager,
            "script": script,
            "script_name": script_name,
            # The last column is a sort key, language||label, such as en||aaa.
            "language": sort_key.split("|", 1)[0],
        })
    return rows


def first_date(fragment: str | None) -> str | None:
    found = re.search(r"\d{4}-\d{2}-\d{2}", fragment or "")
    return found.group(0) if found else None


def parse_detail(page: str) -> dict:
    """Reads one record page in the layout IANA launched in autumn 2026."""
    if not is_new_layout(page):
        raise ValueError("not a record page in IANA's current layout")
    body = page[:page.find("<footer")] if "<footer" in page else page
    reports = [
        {"title": text(t), "date": d, "url": "https://www.iana.org" + u}
        for u, t, d in re.findall(
            r'<a\b[^>]*href="(/reports/[^"]+)"[^>]*>(.*?)</a>\s*\((\d{4}-\d{2}-\d{2})\)', body, re.S)
    ]
    status = re.search(r'tooltip muted">Status</span>.*?<span class="index-label[^"]*">(.*?)</span>\s*</div>', body, re.S)
    status = text(status.group(1)) if status else None
    if status is None:
        raise ValueError("record page has no Status")
    site = re.search(r'muted push-right-1">Website</div>\s*<div class="col">\s*<a href="([^"]+)"', body)
    whois = re.search(r'muted push-right-1">WHOIS Server</div>\s*<div class="col-4">\s*([^<\s]+)', body)
    updated = re.search(r'tld-label muted">Last Updated</div>\s*<div[^>]*>\s*(\d{4}-\d{2}-\d{2})', body)
    delegation = re.search(r"<span>(Delegated|Not delegated)</span>(?:\s*<span[^>]*>([^<]*)</span>)?", body)
    return {
        "status": status,
        "in_root": status == "Active",
        "website": html.unescape(site.group(1)) if site else None,
        # A domain with no WHOIS server shows a dash.
        "whois": whois.group(1) if whois and whois.group(1) != "-" else None,
        # The old pages gave a registration date. The new ones do not.
        "registered": None,
        "updated": updated.group(1) if updated else None,
        "delegated_since": first_date(delegation.group(2)) if delegation and delegation.group(1) == "Delegated" else None,
        "undelegated_since": first_date(delegation.group(2)) if delegation and delegation.group(1) == "Not delegated" else None,
        "reports": sorted(reports, key=lambda r: r["date"]),
    }


def is_new_layout(page: str) -> bool:
    """Record pages saved before IANA's redesign lack these markers and must be downloaded again."""
    return 'class="tld-name"' in page and "Technical Status" in page


async def fetch_detail(client, sem, raw: Path, slug: str, force: bool) -> tuple[str, bool]:
    path = raw / f"{slug}.html"
    if not force and path.exists() and time.time() - path.stat().st_mtime < PAGE_MAX_AGE:
        cached = path.read_text()
        if is_new_layout(cached):
            return cached, False
    r = None
    async with sem:
        for attempt in range(4):
            try:
                r = await client.get(f"{IANA_DB}/{slug}")
                r.raise_for_status()
                break
            except httpx.HTTPError:
                if attempt == 3:
                    raise
                await asyncio.sleep(2 ** attempt)
    assert r is not None
    path.write_text(r.text)
    return r.text, True


def earlier_facts(data: Path) -> dict[str, dict]:
    """Facts the old pages gave and the new ones do not, read from the last published file."""
    path = data / "tlds.json"
    return {t["tld"]: t for t in json.loads(path.read_text())["tlds"]} if path.exists() else {}


async def collect(data: Path) -> dict:
    raw = data / "raw" / "iana"
    raw.mkdir(parents=True, exist_ok=True)
    async with httpx.AsyncClient(headers=HEADERS, timeout=60, follow_redirects=True) as client:
        rows = parse_root_list((await client.get(IANA_DB)).text)
        if len(rows) < 1000:
            raise RuntimeError(f"IANA root list returned only {len(rows)} rows")
        snapshot = data / "iana-list.json"
        previous = {r["slug"]: r for r in json.loads(snapshot.read_text())} if snapshot.exists() else {}
        sem = asyncio.Semaphore(6)
        pages = await asyncio.gather(*[
            fetch_detail(client, sem, raw, r["slug"], force=previous.get(r["slug"]) != r) for r in rows
        ])
    snapshot.write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    earlier = earlier_facts(data)
    out = []
    for row, (detail_page, _) in zip(rows, pages):
        detail = parse_detail(detail_page)
        before = earlier.get(row["slug"], {})
        delegated = next((r["date"] for r in detail["reports"] if r["title"].startswith("Delegation")), None)
        removed = None
        if not detail["in_root"]:
            removed = next((r["date"] for r in reversed(detail["reports"])
                            if re.match(r"(Revocation|Retirement|Removal)", r["title"])),
                           detail["undelegated_since"] or detail["updated"])
        registered = detail["registered"] or before.get("registered")
        kind = row["type"]
        if kind == "generic" and before.get("type") in FINER_GENERIC_TYPES:
            kind = before["type"]
        out.append({
            "tld": row["slug"],
            "display": row["display"],
            "type": kind,
            "manager": None if row["manager"] in ("", "Not assigned") else row["manager"],
            "status": "live" if detail["in_root"] else "removed",
            "registered": registered,
            "delegated": delegated or detail["delegated_since"] or registered,
            "removed": removed,
            "website": detail["website"],
            "whois": detail["whois"],
            "script": row["script"],
            "script_name": row["script_name"],
            "language": row["language"],
            "history": detail["reports"],
            "iana_url": f"{IANA_DB}/{row['slug']}",
        })
    (data / "iana.json").write_text(json.dumps(out, ensure_ascii=False))
    return {
        "domains": len(out),
        "live": sum(t["status"] == "live" for t in out),
        "removed": sum(t["status"] == "removed" for t in out),
        "pages_downloaded": sum(fresh for _, fresh in pages),
    }


def main(data_dir: str = "data"):
    result = asyncio.run(collect(Path(data_dir)))
    print(json.dumps(result))
    return result


if __name__ == "__main__":
    main()
