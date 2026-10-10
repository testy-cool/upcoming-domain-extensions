import { BellIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ntfyUrl, topicFor } from "@/alerts"

export function WatchButton({ tld }: { tld: string }) {
  const topic = topicFor(tld)
  return (
    <div className="space-y-1">
      <Button asChild>
        <a href={ntfyUrl(topic)} target="_blank" rel="noreferrer">
          <BellIcon />
          Alert me when this changes
        </a>
      </Button>
      <p className="text-muted-foreground">
        Or subscribe to <code>{topic}</code> in the ntfy app
      </p>
    </div>
  )
}
