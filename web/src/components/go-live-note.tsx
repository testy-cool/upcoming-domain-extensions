import { Link } from "react-router"

import { lastRoundPace, monthsAfterThisReveal, useDirectory } from "@/data"

// One line on when an applied-for ending might go live, from the last round's pace.
export function GoLiveNote() {
  const pace = lastRoundPace(useDirectory().data)
  return (
    <p className="text-muted-foreground max-w-3xl">
      When it could go live: ICANN has not given a date. At the 2012 round's
      pace, the first new endings would go live around{" "}
      {monthsAfterThisReveal(pace.first)} and half of them by around{" "}
      {monthsAfterThisReveal(pace.half)}.{" "}
      <Link to="/how-it-works/#when" viewTransition className="text-primary underline-offset-4 hover:underline">
        How this is worked out
      </Link>
    </p>
  )
}
