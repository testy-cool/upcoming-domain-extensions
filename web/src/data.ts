import { useEffect, useState } from "react"

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

let cache: Promise<Directory> | null = null

export function useDirectory() {
  const [data, setData] = useState<Directory | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    cache ??= fetch(`${import.meta.env.BASE_URL}data/tlds.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load the list (${r.status})`)
      return r.json()
    })
    cache.then(setData, (e: Error) => setError(e.message))
  }, [])
  return { data, error }
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

export function formatDate(d: string | null) {
  if (!d) return ""
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}
