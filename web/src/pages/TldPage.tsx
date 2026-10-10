import { useNavigate, useParams } from "react-router"
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { WatchButton } from "@/components/watch-button"
import {
  activeApplications,
  formatDate,
  typeLabel,
  useDirectory,
  type Tld,
} from "@/data"
import { ROUND_ANNOUNCEMENT } from "@/timeline"

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLinkIcon className="size-3.5" />
    </a>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const countries = new Intl.DisplayNames(["en"], { type: "region" })
function countryName(code: string) {
  try {
    return countries.of(code) ?? code
  } catch {
    return code
  }
}

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

export function TldPage() {
  const { name } = useParams()
  const { data, error } = useDirectory()
  const navigate = useNavigate()
  if (error) return <p className="text-destructive">{error}</p>
  if (!data) return <p className="text-muted-foreground">Loading…</p>
  const t = data.tlds.find((x) => x.tld === name)
  if (!t) return <p>No domain called .{name} in the list.</p>
  const apps = activeApplications(t)

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-3">
        <ArrowLeftIcon /> Back to the list
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">
            .{t.display}
            {t.display !== t.tld && (
              <span className="text-muted-foreground ml-3 text-lg font-normal">
                .{t.tld}
              </span>
            )}
          </h1>
          <StatusBadge status={t.status} />
          <p className="text-muted-foreground max-w-2xl">{summary(t)}</p>
        </div>
        <WatchButton tld={t.tld} />
      </div>

      {t.status !== "applied" && (
        <Card>
          <CardHeader>
            <CardTitle>Facts</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Fact label="Kind">{typeLabel[t.type] ?? t.type}</Fact>
              <Fact label="Run by">{t.manager}</Fact>
              <Fact label="Went live">{formatDate(t.delegated)}</Fact>
              <Fact label="Removed on">{formatDate(t.removed)}</Fact>
              <Fact label="Registry website">
                {t.website && <Ext href={t.website}>{t.website}</Ext>}
              </Fact>
              <Fact label="WHOIS server">{t.whois}</Fact>
            </dl>
          </CardContent>
        </Card>
      )}

      {apps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              2026 applications ({apps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Every application is still in ICANN's first stage,
              {" "}{apps[0].stage.toLowerCase()}. The final list of names comes
              out on 17 November 2026.
              {t.contention_set &&
                ` This name is in contention set ${t.contention_set}: several applicants want it, or names close to it.`}
            </p>
            <ul className="divide-y">
              {apps.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="space-y-1">
                    <div className="font-medium">{a.applicant}</div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>Based in {countryName(a.country)}</span>
                      {a.kinds.map((k) => (
                        <Badge key={k} variant="outline">
                          {k}
                        </Badge>
                      ))}
                      {a.backup_string && (
                        <span>Backup choice: .{a.backup_string}</span>
                      )}
                    </div>
                  </div>
                  <Ext href={a.url}>Application {a.id}</Ext>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {t.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {t.history.map((h) => (
                <li key={h.url} className="grid grid-cols-[8rem_1fr] gap-4 py-2">
                  <span className="text-muted-foreground">{formatDate(h.date)}</span>
                  <Ext href={h.url}>{h.title}</Ext>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Official sources</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {t.iana_url && (
              <li>
                <Ext href={t.iana_url}>IANA root zone record for .{t.tld}</Ext>
              </li>
            )}
            {apps.length > 0 && (
              <>
                <li>
                  <Ext href={`https://newgtldprogram-aps.icann.org/applications`}>
                    ICANN 2026 application search
                  </Ext>
                </li>
                <li>
                  <Ext href={ROUND_ANNOUNCEMENT}>ICANN reveal-day announcement, 7 Oct 2026</Ext>
                </li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
