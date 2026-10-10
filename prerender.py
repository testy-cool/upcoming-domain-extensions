"""Give every page of the built site its own HTML, so search engines can read it.

The site is a React app that draws each page in the browser. This writes a
real index.html for every extension, for "how it works" and for "alerts",
each with its own title, description, canonical link and the page's facts
as plain HTML inside #root. React replaces that HTML when it starts. Also
writes the sitemap, the 404 page GitHub Pages falls back to, and a copy of
data/tlds.json for the app to load.

    python prerender.py [dist dir] [data dir]
"""

import html
import json
import shutil
import sys
from pathlib import Path

SITE = "https://testy.cool/upcoming-domain-extensions"


def esc(s) -> str:
    return html.escape(str(s or ""), quote=True)


def date(d: str | None) -> str:
    if not d:
        return ""
    y, m, day = d.split("-")
    months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
    return f"{int(day)} {months[int(m) - 1]} {y}"


def active(t: dict) -> list[dict]:
    return [a for a in t["applications"] if a["status"] == "Active"]


def title_and_description(t: dict) -> tuple[str, str]:
    name = f".{t['display']}"
    apps = active(t)
    if t["status"] == "applied":
        status = (f"applied for by {apps[0]['applicant']} in 2026" if len(apps) == 1
                  else f"{len(apps)} applicants in ICANN's 2026 round")
        return (f"{name} domain extension: {status}",
                f"Who applied for the {name} domain extension in ICANN's 2026 round, "
                f"where the application stands and the official sources.")
    if t["status"] == "live":
        return (f"{name} domain extension: live since {t['delegated'][:4] if t['delegated'] else '?'}",
                f"The {name} domain extension: who runs it ({t['manager']}), when it went live, "
                f"its history and the official IANA record.")
    return (f"{name} domain extension: removed in {(t['removed'] or '?')[:4]}",
            f"The {name} domain extension was removed from the internet on {date(t['removed'])}. "
            f"Its history and the official IANA record.")


def page(template: str, path: str, title: str, description: str, body: str) -> str:
    url = f"{SITE}/{path}/" if path else f"{SITE}/"
    head = (f"<title>{esc(title)}</title>\n"
            f'    <meta name="description" content="{esc(description)}" />\n'
            f'    <link rel="canonical" href="{esc(url)}" />\n'
            f'    <meta property="og:title" content="{esc(title)}" />\n'
            f'    <meta property="og:description" content="{esc(description)}" />\n'
            f'    <meta property="og:url" content="{esc(url)}" />')
    start, end = template.index("<title>"), template.index("</head>")
    head_rest = template[start:end]
    head_rest = head_rest[head_rest.index("</title>") + len("</title>"):]
    head_rest = "\n".join(line for line in head_rest.splitlines() if 'name="description"' not in line)
    out = template[:start] + head + head_rest + template[end:]
    return out.replace('<div id="root"></div>', f'<div id="root">{body}</div>')


def detail_body(t: dict) -> str:
    apps = active(t)
    _, description = title_and_description(t)
    parts = [f"<h1>.{esc(t['display'])}</h1>", f"<p>{esc(description)}</p>"]
    facts = [("Kind", t["type"]), ("Run by", t["manager"]), ("Went live", date(t["delegated"])),
             ("Removed on", date(t["removed"])), ("Registry website", t["website"])]
    if t["status"] != "applied":
        parts.append("<dl>" + "".join(f"<dt>{k}</dt><dd>{esc(v)}</dd>" for k, v in facts if v) + "</dl>")
    if apps:
        parts.append(f"<h2>2026 applications ({len(apps)})</h2><ul>" + "".join(
            f'<li><a href="{esc(a["url"])}">{esc(a["applicant"])}</a>, {esc(a["country"])}, '
            f'{esc(", ".join(a["kinds"]) or "standard")}</li>' for a in apps) + "</ul>")
    if t["history"]:
        parts.append("<h2>History</h2><ul>" + "".join(
            f'<li>{date(h["date"])}: <a href="{esc(h["url"])}">{esc(h["title"])}</a></li>'
            for h in t["history"]) + "</ul>")
    if t["iana_url"]:
        parts.append(f'<p><a href="{esc(t["iana_url"])}">IANA record for .{esc(t["tld"])}</a></p>')
    parts.append(f'<p><a href="{SITE}/">All domain extensions</a></p>')
    return "".join(parts)


def main(dist: Path, data: Path):
    directory = json.loads((data / "tlds.json").read_text())
    template = (dist / "index.html").read_text()
    if '<div id="root"></div>' not in template:
        raise SystemExit("dist/index.html was already prerendered; run the web build again first")
    (dist / "data").mkdir(exist_ok=True)
    shutil.copy(data / "tlds.json", dist / "data" / "tlds.json")

    tlds = directory["tlds"]
    for t in tlds:
        title, description = title_and_description(t)
        (dist / t["tld"]).mkdir(exist_ok=True)
        (dist / t["tld"] / "index.html").write_text(page(template, t["tld"], title, description, detail_body(t)))

    groups = [("applied", "Applied for in 2026"), ("live", "Live"), ("removed", "Removed")]
    index_body = ("<h1>Upcoming domain extensions</h1><p>Every domain extension companies applied for in "
                  "ICANN's 2026 round, plus every live and removed one.</p>" + "".join(
                      f"<h2>{label}</h2><ul>" + "".join(
                          f'<li><a href="{SITE}/{esc(t["tld"])}/">.{esc(t["display"])}</a></li>'
                          for t in tlds if t["status"] == status) + "</ul>"
                      for status, label in groups))
    (dist / "index.html").write_text(page(
        template, "", "Upcoming domain extensions: every new TLD applied for in 2026",
        "Every new domain extension companies applied for in ICANN's 2026 round, plus every live "
        "and removed one. Search by name or company. Updated daily.", index_body))
    (dist / "how-it-works").mkdir(exist_ok=True)
    (dist / "how-it-works" / "index.html").write_text(page(
        template, "how-it-works", "How a new domain extension is made: ICANN's 2026 round",
        "How organisations apply to ICANN for a new domain extension: the steps, the USD 227,000 fee "
        "and the 2026 round's dates, with official sources.",
        "<h1>How a new domain extension is made</h1>"))
    (dist / "alerts").mkdir(exist_ok=True)
    (dist / "alerts" / "index.html").write_text(page(
        template, "alerts", "Alerts for new domain extensions",
        "Get a phone or browser alert when a domain extension goes live, is removed, or its "
        "2026 applications change.", "<h1>Alerts</h1>"))
    shutil.copy(dist / "index.html", dist / "404.html")

    urls = [f"{SITE}/", f"{SITE}/how-it-works/", f"{SITE}/alerts/"] + [f"{SITE}/{t['tld']}/" for t in tlds]
    (dist / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{esc(u)}</loc></url>\n" for u in urls) + "</urlset>\n")
    print(f"wrote {len(tlds)} extension pages and a sitemap of {len(urls)} urls")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "web/dist"),
         Path(sys.argv[2] if len(sys.argv) > 2 else "data"))
