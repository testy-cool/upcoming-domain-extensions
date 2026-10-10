// Give every page of the built site its own HTML, so search engines and
// visitors see it before any JavaScript runs.
//
// Renders each page with React (dist-server/entry-server.js), puts it inside
// #root of dist/index.html with that page's own title, description and
// canonical link, and the browser then takes it over (hydration). Also writes
// the sitemap, the 404 page GitHub Pages falls back to, and the data file the
// app loads, with country names added so both sides show the same names.
//
//     node scripts/prerender.mjs [data dir]
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const dist = resolve("dist")
const dataDir = resolve(process.argv[2] ?? "../data")
const { render, pageMeta } = await import(resolve("dist-server/entry-server.js"))
const SITE = "https://testy.cool/upcoming-domain-extensions"

const data = JSON.parse(readFileSync(join(dataDir, "tlds.json"), "utf8"))
const countries = new Intl.DisplayNames(["en"], { type: "region" })
for (const t of data.tlds)
  for (const a of t.applications) {
    try {
      // Node says "Hong Kong SAR China", browsers say "Hong Kong".
      a.country_name = (countries.of(a.country) ?? a.country).replace(/ SAR China$/, "")
    } catch {
      a.country_name = a.country
    }
  }
mkdirSync(join(dist, "data"), { recursive: true })
writeFileSync(join(dist, "data", "tlds.json"), JSON.stringify(data))

const template = readFileSync(join(dist, "index.html"), "utf8")
if (!template.includes('<div id="root"></div>'))
  throw new Error("dist/index.html was already prerendered; run the web build again first")
copyFileSync(join(dist, "index.html"), join(dist, "404.html"))

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

function page(path, html) {
  const { title, description } = pageMeta(path, data)
  const url = `${SITE}${path}`
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
  ].join("\n    ")
  return template
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace(/\n\s*<meta name="description"[^>]*>/, "")
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
}

const paths = ["/", "/how-it-works/", "/alerts/", ...data.tlds.map((t) => `/${t.tld}/`)]
for (const path of paths) {
  const html = await render(path, data)
  mkdirSync(join(dist, path), { recursive: true })
  writeFileSync(join(dist, path, "index.html"), page(path, html))
}

writeFileSync(
  join(dist, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map((p) => `  <url><loc>${esc(SITE + p)}</loc></url>\n`).join("") +
    "</urlset>\n"
)
console.log(`wrote ${paths.length} pages and a sitemap`)
