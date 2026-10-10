import { Link } from "react-router"
import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAlerts } from "@/alerts"

export function AlertsPage() {
  const { alerts, setWatch } = useAlerts()
  if (!alerts) return <p className="text-muted-foreground">Loading…</p>
  const url = `https://ntfy.sh/${alerts.topic}`

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-muted-foreground">
          The list is checked once a day. Alerts arrive on your phone through
          the free ntfy app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get them on your phone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Install ntfy, tap “+”, and subscribe to this topic:
          </p>
          <code className="bg-muted block w-fit rounded-md px-3 py-2 text-base">
            {alerts.topic}
          </code>
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              Open the topic in the browser <ExternalLinkIcon />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you get told about</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5">
            <li>A domain goes live on the internet.</li>
            <li>A domain is removed.</li>
            <li>New 2026 applications appear, or applications are withdrawn.</li>
            <li>Anything changes on a domain you watch.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domains you watch ({alerts.watching.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.watching.length === 0 ? (
            <p className="text-muted-foreground">
              None yet. Open any domain in the list and press “Alert me when
              this changes”.
            </p>
          ) : (
            <ul className="divide-y">
              {alerts.watching.map((t) => (
                <li key={t} className="flex items-center justify-between py-2">
                  <Link to={`/tld/${t}`} className="font-medium hover:underline">
                    .{t}
                  </Link>
                  <Button variant="ghost" onClick={() => setWatch(t, false)}>
                    Stop watching
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
