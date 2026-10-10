import { Link, useLocation, useParams } from "react-router"
import { ArrowLeftIcon } from "lucide-react"

import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Sources, type Source } from "@/components/sources"
import { GoLiveNote } from "@/components/go-live-note"
import { StatusBadge } from "@/components/status-badge"
import { Applications, Facts, summary } from "@/components/tld-details"
import { WatchButton } from "@/components/watch-button"
import { activeApplications, formatDate, useDirectory, type Tld } from "@/data"
import { ROUND_ANNOUNCEMENT } from "@/timeline"

function History({ t }: { t: Tld }) {
  return (
    <Timeline defaultValue={t.history.length}>
      {t.history.map((h, i) => (
        <TimelineItem key={h.url} step={i + 1}>
          <TimelineHeader>
            <TimelineSeparator />
            <TimelineDate dateTime={h.date}>{formatDate(h.date)}</TimelineDate>
            <TimelineTitle>
              <ExternalLink href={h.url}>{h.title}</ExternalLink>
            </TimelineTitle>
            <TimelineIndicator />
          </TimelineHeader>
        </TimelineItem>
      ))}
    </Timeline>
  )
}

export function TldPage() {
  const { name } = useParams()
  const { data } = useDirectory()
  const back = (useLocation().state as { back?: string } | null)?.back ?? "/"
  const t = data.tlds.find((x) => x.tld === name)
  if (!t) return <p>No domain called .{name} in the list.</p>
  const apps = activeApplications(t)
  const sources: Source[] = [
    ...(t.iana_url ? [{ title: `IANA root zone record for .${t.tld}`, href: t.iana_url }] : []),
    ...(apps.length
      ? [
          { title: "ICANN 2026 application search", href: "https://newgtldprogram-aps.icann.org/applications" },
          { title: "ICANN reveal-day announcement, 7 Oct 2026", href: ROUND_ANNOUNCEMENT },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="-ml-3">
        <Link to={back} viewTransition>
          <ArrowLeftIcon /> Back to the list
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-semibold">
            .{t.display}
            {t.display !== t.tld && (
              <span className="text-muted-foreground ml-3 text-lg font-normal">.{t.tld}</span>
            )}
          </h1>
          <StatusBadge status={t.status} />
          <p className="text-muted-foreground">{summary(t)}</p>
        </div>
        <WatchButton tld={t.tld} />
      </div>

      {t.status !== "applied" && (
        <Card>
          <CardHeader>
            <CardTitle>Facts</CardTitle>
          </CardHeader>
          <CardContent>
            <Facts t={t} />
          </CardContent>
        </Card>
      )}

      {apps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2026 applications ({apps.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground max-w-3xl">
              Every application is still in ICANN's first stage, {apps[0].stage.toLowerCase()}. The
              final list of names comes out on 17 November 2026.
              {t.contention_set &&
                ` This name is in contention set ${t.contention_set}: several applicants want it, or names close to it.`}
            </p>
            <GoLiveNote />
            <Applications apps={apps} />
          </CardContent>
        </Card>
      )}

      {t.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <History t={t} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Official sources</CardTitle>
        </CardHeader>
        <CardContent>
          <Sources sources={sources} />
        </CardContent>
      </Card>
    </div>
  )
}
