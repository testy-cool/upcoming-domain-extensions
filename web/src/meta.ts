import { activeApplications, formatDate, type Directory } from "@/data"

export const SITE = "https://testy.cool/upcoming-domain-extensions"

// The title and description of every page. The prerender step writes them into
// each page's <head>, and the app sets the title again after each navigation.
export function pageMeta(path: string, data: Directory): { title: string; description: string } {
  const name = path.replace(/^\/|\/$/g, "")
  if (!name)
    return {
      title: "Upcoming domain extensions: every new TLD applied for in 2026",
      description:
        "Every new domain extension companies applied for in ICANN's 2026 round, plus every live and removed one. Search by name or company. Updated daily.",
    }
  if (name === "how-it-works")
    return {
      title: "How a new domain extension is made: ICANN's 2026 round",
      description:
        "How organisations apply to ICANN for a new domain extension: the steps, the USD 227,000 fee and the 2026 round's dates, with official sources.",
    }
  if (name === "alerts")
    return {
      title: "Alerts for new domain extensions",
      description:
        "Get a phone or browser alert when a domain extension goes live, is removed, or its 2026 applications change.",
    }
  const t = data.tlds.find((x) => x.tld === name)
  if (!t) return { title: "Not found: upcoming domain extensions", description: "" }
  const ext = `.${t.display}`
  const apps = activeApplications(t)
  if (t.status === "applied")
    return {
      title: `${ext} domain extension: ${
        apps.length === 1
          ? `applied for by ${apps[0].applicant} in 2026`
          : `${apps.length} applicants in ICANN's 2026 round`
      }`,
      description: `Who applied for the ${ext} domain extension in ICANN's 2026 round, where the application stands and the official sources.`,
    }
  if (t.status === "live")
    return {
      title: `${ext} domain extension: live since ${t.delegated?.slice(0, 4) ?? "?"}`,
      description: `The ${ext} domain extension: who runs it (${t.manager}), when it went live, its history and the official IANA record.`,
    }
  return {
    title: `${ext} domain extension: removed in ${t.removed?.slice(0, 4) ?? "?"}`,
    description: `The ${ext} domain extension was removed from the internet on ${formatDate(t.removed)}. Its history and the official IANA record.`,
  }
}
