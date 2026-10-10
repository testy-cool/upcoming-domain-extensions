import { ExternalLinkIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/data"
import { ROUND_ANNOUNCEMENT, timeline } from "@/timeline"

const JOURNEY = "https://newgtldprogram.icann.org/en/application-rounds/round2/applicant-journey"
const GUIDEBOOK_FEES =
  "https://newgtldprogram-2026-agb.icann.org/en/7-module-3-application-submission.html"

const steps = [
  ["Prepare", "Gather the documents, the business plan and a technical provider.", `${JOURNEY}/prepare-to-apply`],
  ["Apply", "Submit the application in ICANN's system while a round is open.", `${JOURNEY}/application-submission`],
  ["Reveal", "ICANN publishes every name and who applied for it.", `${JOURNEY}/pre-evaluation`],
  ["Comments and objections", "Anyone can comment. Some groups can formally object.", `${JOURNEY}/community-input`],
  ["Name check", "ICANN checks the name is technically safe and allowed.", null],
  ["Contest", "If several applicants want the same name, ICANN settles it by a community priority review or an auction.", `${JOURNEY}/contention-set-resolution`],
  ["Applicant check", "ICANN checks the organisation, its finances and its people.", null],
  ["Contract", "The winner signs a registry agreement with ICANN.", "https://newgtldprogram.icann.org/en/application-rounds/round2/interested-in-applying/new-gtld-application/base-registry-agreement"],
  ["Go live", "Technical tests, then IANA adds the name to the internet's root.", null],
] as const

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline">
      {children}
      <ExternalLinkIcon className="size-3.5" />
    </a>
  )
}

function when(d: string, end?: string) {
  const f = (x: string) => (/^\d{4}-\d{2}-\d{2}$/.test(x) ? formatDate(x) : x)
  return end ? `${f(d)} to ${f(end)}` : f(d)
}

export function ApplyPage() {
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
        <CardContent className="space-y-3">
          <ul className="divide-y">
            {timeline.map((s) => (
              <li key={s.what} className="grid grid-cols-[14rem_1fr] gap-4 py-2">
                <span className="text-muted-foreground">
                  {when(s.date, "end" in s ? s.end : undefined)}
                </span>
                <span>{s.what}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            The window to apply is closed. ICANN has not announced the next one.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>The steps an applicant goes through</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="divide-y">
            {steps.map(([title, text, href], i) => (
              <li key={title} className="grid grid-cols-[2rem_1fr] gap-3 py-3">
                <span className="text-muted-foreground">{i + 1}</span>
                <div className="space-y-1">
                  <div className="font-medium">{title}</div>
                  <p className="text-muted-foreground">{text}</p>
                  {href && <Ext href={href}>ICANN page</Ext>}
                </div>
              </li>
            ))}
          </ol>
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
          <Ext href={GUIDEBOOK_FEES}>Applicant Guidebook, module 3, fees</Ext>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Official sources</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li><Ext href="https://newgtldprogram.icann.org/en">ICANN New gTLD Program</Ext></li>
            <li><Ext href={JOURNEY}>ICANN applicant journey, step by step</Ext></li>
            <li><Ext href="https://newgtldprogram-2026-agb.icann.org/en/">2026 Applicant Guidebook</Ext></li>
            <li><Ext href="https://newgtldprogram-aps.icann.org/applications">Every 2026 application, ICANN search</Ext></li>
            <li><Ext href={ROUND_ANNOUNCEMENT}>Reveal-day announcement and dates, 7 Oct 2026</Ext></li>
            <li><Ext href="https://www.iana.org/domains/root/db">IANA root zone database, every live and removed ending</Ext></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
