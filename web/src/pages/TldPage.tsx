import { useMemo } from "react"
import { Link, useLocation, useParams } from "react-router"
import { type ColumnDef, useTable } from "@tanstack/react-table"
import { ArrowLeftIcon } from "lucide-react"

import { Badge } from "@/components/reui/badge"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
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
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { ExternalLink, Sources, type Source } from "@/components/sources"
import { StatusBadge } from "@/components/status-badge"
import { WatchButton } from "@/components/watch-button"
import {
  activeApplications,
  countryName,
  formatDate,
  typeLabel,
  useDirectory,
  type Application,
  type Tld,
} from "@/data"
import { ROUND_ANNOUNCEMENT } from "@/timeline"

function summary(t: Tld) {
  const apps = activeApplications(t)
  if (t.status === "live")
    return `In use since ${formatDate(t.delegated)}. Anyone can look up who runs it in the IANA record.`
  if (t.status === "removed")
    return `Taken out of the internet's root on ${formatDate(t.removed)}. Addresses ending in .${t.display} no longer work.`
  if (apps.length > 1)
    return `${apps.length} organisations applied for it in 2026. Only one can get it, so ICANN will settle the contest after evaluation.`
  return "One organisation applied for it in 2026. It is waiting on ICANN's review."
}

function Facts({ t }: { t: Tld }) {
  const facts: [string, React.ReactNode][] = [
    ["Kind", typeLabel[t.type] ?? t.type],
    ["Run by", t.manager],
    ["Went live", formatDate(t.delegated)],
    ["Removed on", formatDate(t.removed)],
    ["Registry website", t.website && <ExternalLink href={t.website}>{t.website}</ExternalLink>],
    ["WHOIS server", t.whois],
  ]
  return (
    <ItemGroup className="gap-0 sm:grid sm:grid-cols-2">
      {facts
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <Item key={label} size="sm" className="px-0">
            <ItemContent>
              <ItemDescription>{label}</ItemDescription>
              <ItemTitle className="break-all">{value}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
    </ItemGroup>
  )
}

function Applications({ apps }: { apps: Application[] }) {
  const columns = useMemo<ColumnDef<DataGridFeatures, Application>[]>(
    () => [
      {
        accessorKey: "applicant",
        header: "Applicant",
        cell: ({ row }) => <span className="font-medium">{row.original.applicant}</span>,
        size: 280,
      },
      {
        id: "country",
        header: "Based in",
        cell: ({ row }) => countryName(row.original),
        size: 160,
      },
      {
        id: "kinds",
        header: "Kind",
        cell: ({ row }) =>
          row.original.kinds.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.kinds.map((k) => (
                <Badge key={k} variant="outline">
                  {k}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Standard</span>
          ),
        size: 150,
      },
      {
        id: "backup",
        header: "Backup choice",
        cell: ({ row }) =>
          row.original.backup_string ? `.${row.original.backup_string}` : (
            <span className="text-muted-foreground">None</span>
          ),
        size: 130,
      },
      {
        id: "link",
        header: "ICANN record",
        cell: ({ row }) => <ExternalLink href={row.original.url}>{row.original.id}</ExternalLink>,
        size: 210,
      },
    ],
    []
  )
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: apps,
    getRowId: (a: Application) => a.id,
  })
  return (
    <DataGrid table={table} recordCount={apps.length}>
      <DataGridContainer>
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
      </DataGridContainer>
    </DataGrid>
  )
}

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
