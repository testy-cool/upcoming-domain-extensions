import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ALL_TOPIC, ntfyUrl, topicFor } from "@/alerts"

export function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-1">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-muted-foreground">
          The list is checked once a day. Alerts arrive through ntfy, a free
          app for phones and browsers. No account and no email needed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Every change</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            One message a day when anything changed: a new extension going
            live, one being removed, applications added or withdrawn.
            Subscribe to this topic:
          </p>
          <code className="bg-muted block w-fit rounded-md px-3 py-2 text-base">
            {ALL_TOPIC}
          </code>
          <Button variant="outline" asChild>
            <a href={ntfyUrl(ALL_TOPIC)} target="_blank" rel="noreferrer">
              Open it in the browser <ExternalLinkIcon />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>One extension</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            Every extension has its own topic. Open it in the list and press
            “Alert me when this changes”. For .agent, the topic is{" "}
            <code>{topicFor("agent")}</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
