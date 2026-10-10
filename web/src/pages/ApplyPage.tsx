import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Sources, type Source } from "@/components/sources"
import { LAST_REVEAL, formatDate, lastRoundPace, monthsAfterThisReveal, useDirectory } from "@/data"
import { ROUND_ANNOUNCEMENT, timeline } from "@/timeline"

const JOURNEY = "https://newgtldprogram.icann.org/en/application-rounds/round2/applicant-journey"
const GUIDEBOOK_FEES =
  "https://newgtldprogram-2026-agb.icann.org/en/7-module-3-application-submission.html"

// The date each step started in the 2026 round, where ICANN has given one.
const steps = [
  ["Prepare", "Gather the documents, the business plan and a technical provider.", `${JOURNEY}/prepare-to-apply`, null],
  ["Apply", "Submit the application in ICANN's system while a round is open.", `${JOURNEY}/application-submission`, "2026-04-30"],
  ["Reveal", "ICANN publishes every name and who applied for it.", `${JOURNEY}/pre-evaluation`, "2026-10-07"],
  ["Comments and objections", "Anyone can comment. Some groups can formally object.", `${JOURNEY}/community-input`, "2026-11-17"],
  ["Name check", "ICANN checks the name is technically safe and allowed.", null, null],
  ["Contest", "If several applicants want the same name, ICANN settles it by a community priority review or an auction.", `${JOURNEY}/contention-set-resolution`, null],
  ["Applicant check", "ICANN checks the organisation, its finances and its people.", null, null],
  ["Contract", "The winner signs a registry agreement with ICANN.", "https://newgtldprogram.icann.org/en/application-rounds/round2/interested-in-applying/new-gtld-application/base-registry-agreement", null],
  ["Go live", "Technical tests, then IANA adds the name to the internet's root.", null, null],
] as const

const sources: Source[] = [
  { title: "ICANN New gTLD Program", href: "https://newgtldprogram.icann.org/en" },
  { title: "ICANN applicant journey, step by step", href: JOURNEY },
  { title: "2026 Applicant Guidebook", href: "https://newgtldprogram-2026-agb.icann.org/en/" },
  { title: "Every 2026 application, ICANN search", href: "https://newgtldprogram-aps.icann.org/applications" },
  { title: "Reveal-day announcement and dates, 7 Oct 2026", href: ROUND_ANNOUNCEMENT },
  { title: "IANA root zone database, every live and removed ending", href: "https://www.iana.org/domains/root/db" },
]

// The number of the last entry that had started by the day the data was
// collected. Fixed by the data, not the clock, so the server and the browser
// draw the same timeline. Entries without an exact date never count.
function reached(dates: readonly (string | null)[], today: string) {
  let last = 0
  dates.forEach((d, i) => {
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) last = i + 1
  })
  return last
}

function when(d: string, end?: string) {
  const f = (x: string) => (/^\d{4}-\d{2}-\d{2}$/.test(x) ? formatDate(x) : x)
  return end ? `${f(d)} to ${f(end)}` : f(d)
}

export function ApplyPage() {
  const { data } = useDirectory()
  const today = data.collected_at.slice(0, 10)
  const pace = lastRoundPace(data)
  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold">How a new domain ending is made</h1>
        <p className="text-muted-foreground">
          Buying a name like example.com happens at a registrar. Creating a new
          ending, like .example, is different. An organisation applies to
          ICANN, during an application round, to run the ending as its
          registry. Rounds are rare. Before 2026, the last one opened in 2012.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The 2026 round, where it stands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Timeline defaultValue={reached(timeline.map((s) => s.date), today)}>
            {timeline.map((s, i) => (
              <TimelineItem key={s.what} step={i + 1}>
                <TimelineHeader>
                  <TimelineSeparator />
                  <TimelineDate>{when(s.date, "end" in s ? s.end : undefined)}</TimelineDate>
                  <TimelineTitle>{s.what}</TimelineTitle>
                  <TimelineIndicator />
                </TimelineHeader>
              </TimelineItem>
            ))}
          </Timeline>
          <p className="text-muted-foreground">
            The window to apply is closed. ICANN has not announced the next one.
          </p>
        </CardContent>
      </Card>

      <Card id="when" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>When the new endings could go live</CardTitle>
        </CardHeader>
        <CardContent className="max-w-3xl space-y-3">
          <p>
            ICANN has not given go-live dates. The last round is the best guide
            there is. Its applications were made public on {formatDate(LAST_REVEAL)},
            and {pace.count.toLocaleString("en-US")} of its endings went live.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>The first went live {pace.first} months later.</li>
            <li>Half were live within {pace.half} months.</li>
            <li>Nine in ten were live within {pace.most} months.</li>
          </ul>
          <p>
            At the same pace, the first 2026 endings would go live around{" "}
            {monthsAfterThisReveal(pace.first)}, and half of them by around{" "}
            {monthsAfterThisReveal(pace.half)}. This is the last round's pace,
            not a promise from ICANN. Endings that several organisations want
            usually take longer, because they have to be settled first.
          </p>
          <p className="text-muted-foreground">
            Worked out from the go-live date of every generic ending in IANA's
            root zone database that went live from October 2013 on.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>The steps an applicant goes through</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline defaultValue={reached(steps.map((s) => s[3]), today)}>
            {steps.map(([title, text, href], i) => (
              <TimelineItem key={title} step={i + 1}>
                <TimelineHeader>
                  <TimelineSeparator />
                  <TimelineDate>Step {i + 1}</TimelineDate>
                  <TimelineTitle>{title}</TimelineTitle>
                  <TimelineIndicator />
                </TimelineHeader>
                <TimelineContent className="space-y-1">
                  <p>{text}</p>
                  {href && <ExternalLink href={href}>ICANN page</ExternalLink>}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What it costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            The evaluation fee is USD 227,000 per application. Applicants who
            qualify for ICANN's Applicant Support Program pay 75 to 85 percent
            less. Some reviews cost extra, for example USD 52,936 for a
            community priority review.
          </p>
          <ExternalLink href={GUIDEBOOK_FEES}>Applicant Guidebook, module 3, fees</ExternalLink>
        </CardContent>
      </Card>

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
