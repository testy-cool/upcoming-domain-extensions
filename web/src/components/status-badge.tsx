import { Badge } from "@/components/reui/badge"
import { statusLabel, type Status } from "@/data"

const variant = {
  live: "success-light",
  applied: "outline",
  removed: "secondary",
} as const

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={variant[status]}>{statusLabel[status]}</Badge>
}
