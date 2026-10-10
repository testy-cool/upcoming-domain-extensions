"""Step 1: download IANA's list of every top-level domain and each domain's record page.

Run every day by .github/workflows/update.yml. IANA's root zone database lists every
domain ending that is live or was removed. Each domain's page gives who runs
it, its website and its history with dates. Pages are cached in
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
    site = re.search(r'URL for registration services:</b>\s*<a href="([^"]+)"', main)
    whois = re.search(r"WHOIS Server:</b>\s*([^<\s]+)", main)
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


async def fetch_detail(client, sem, raw: Path, slug: str, force: bool) -> tuple[str, bool]:
    path = raw / f"{slug}.html"
    if not force and path.exists() and time.time() - path.stat().st_mtime < PAGE_MAX_AGE:
        return path.read_text(), False
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
    return r.text, True


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
    out = []
    for row, (detail_page, _) in zip(rows, pages):
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
