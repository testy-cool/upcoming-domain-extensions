// From ICANN's reveal-day announcement, 7 October 2026:
// https://www.icann.org/en/announcements/details/icann-reveals-2026-round-applications-for-new-generic-top-level-domains-07-10-2026-en
export const ROUND_ANNOUNCEMENT =
  "https://www.icann.org/en/announcements/details/icann-reveals-2026-round-applications-for-new-generic-top-level-domains-07-10-2026-en"

export const timeline = [
  { date: "2026-04-30", end: "2026-08-12", what: "Applications accepted" },
  { date: "2026-10-07", what: "Reveal Day: ICANN publishes every application" },
  {
    date: "2026-10-08",
    end: "2026-10-21",
    what: "Applicants in a contest may switch to their backup string",
  },
  {
    date: "2026-11-17",
    what: "String Confirmation Day: the final list of names",
  },
  {
    date: "2026-11-17",
    end: "2027-03-16",
    what: "Anyone can comment on or object to an application",
  },
  {
    date: "2027",
    what: "Draw that sets the order applications are processed in (first half of 2027, date not set)",
  },
  {
    date: "2027",
    what: "String evaluation, expected to take 180 days",
  },
  {
    date: "Not set",
    what: "Contests resolved, contracts signed, first new domains go live. ICANN has not given dates.",
  },
] as const
