import { BellIcon, BellOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAlerts } from "@/alerts"

export function WatchButton({ tld }: { tld: string }) {
  const { alerts, setWatch } = useAlerts()
  if (!alerts) return null
  const on = alerts.watching.includes(tld)
  return (
    <Button variant={on ? "secondary" : "default"} onClick={() => setWatch(tld, !on)}>
      {on ? <BellOffIcon /> : <BellIcon />}
      {on ? "Stop alerts for this one" : "Alert me when this changes"}
    </Button>
  )
}
