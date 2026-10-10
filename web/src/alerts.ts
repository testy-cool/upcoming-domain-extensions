import { useCallback, useEffect, useState } from "react"

export interface Alerts {
  topic: string
  watching: string[]
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alerts | null>(null)
  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then(setAlerts)
  }, [])
  const setWatch = useCallback(async (tld: string, on: boolean) => {
    const r = await fetch("/api/watch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tld, on }),
    })
    setAlerts(await r.json())
  }, [])
  return { alerts, setWatch }
}
