import { createContext, useContext } from "react"

export type Status = "live" | "applied" | "removed"

export interface Application {
  id: string
  applicant: string
  country: string
  region: string
  kinds: string[]
  stage: string
  status: string
  backup_string: string | null
  url: string
  // Added by the prerender step, so the server and the browser show the same name.
  country_name?: string
}

export interface Report {
  title: string
  date: string
  url: string
}

export interface Tld {
  tld: string
  display: string
  type: string
  manager: string | null
  status: Status
  registered: string | null
  delegated: string | null
  removed: string | null
  website: string | null
  whois: string | null
  history: Report[]
  iana_url: string | null
  applications: Application[]
  contention_set: number | null
}

export interface Directory {
  collected_at: string
  counts: Record<Status, number>
  tlds: Tld[]
}

// The whole list is loaded once, before the first render, on the server and in
// the browser alike, so every page renders the same HTML in both places.
const DirectoryContext = createContext<Directory | null>(null)
export const DirectoryProvider = DirectoryContext.Provider

export function useDirectory() {
  const data = useContext(DirectoryContext)
  if (!data) throw new Error("useDirectory needs a DirectoryProvider")
  return { data }
}

export async function loadDirectory(): Promise<Directory> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/tlds.json`)
  if (!r.ok) throw new Error(`Could not load the list (${r.status})`)
  return r.json()
}

export const statusLabel: Record<Status, string> = {
  live: "Live",
  applied: "Applied for in 2026",
  removed: "Removed",
}

export const typeLabel: Record<string, string> = {
  generic: "Generic",
  "country-code": "Country code",
  sponsored: "Sponsored",
  "generic-restricted": "Generic, restricted",
  infrastructure: "Infrastructure",
  test: "Test",
  applied: "Applied for",
}

export function activeApplications(t: Tld) {
  return t.applications.filter((a) => a.status === "Active")
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")

// Written out by hand: browsers and Node disagree on short month names ("Sep" or "Sept").
export function formatDate(d: string | null) {
  if (!d) return ""
  const [y, m, day] = d.slice(0, 10).split("-")
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`
}

export function formatUpdated(iso: string) {
  return `${formatDate(iso)}, ${iso.slice(11, 16)} UTC`
}

export function countryName(a: Application) {
  return a.country_name ?? a.country
}
