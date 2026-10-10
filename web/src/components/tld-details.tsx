import { useMemo } from "react"
import { type ColumnDef, useTable } from "@tanstack/react-table"

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
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { ExternalLink } from "@/components/sources"
import {
  activeApplications,
  countryName,
  formatDate,
  typeLabel,
  type Application,
  type Tld,
} from "@/data"

// Shown both on an extension's own page and under its row in the list.

export function summary(t: Tld) {
  const apps = activeApplications(t)
  if (t.status === "live")
    return `In use since ${formatDate(t.delegated)}. Anyone can look up who runs it in the IANA record.`
  if (t.status === "removed")
    return `Taken out of the internet's root on ${formatDate(t.removed)}. Addresses ending in .${t.display} no longer work.`
  if (apps.length > 1)
    return `${apps.length} organisations applied for it in 2026. Only one can get it, so ICANN will settle the contest after evaluation.`
  return "One organisation applied for it in 2026. It is waiting on ICANN's review."
}

export function Facts({ t }: { t: Tld }) {
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

export function Applications({ apps }: { apps: Application[] }) {
  const columns = useMemo<ColumnDef<DataGridFeatures, Application>[]>(
    () => [
      {
        accessorKey: "applicant",
        header: "Applicant",
        cell: ({ row }) => <span className="font-medium">{row.original.applicant}</span>,
        size: 250,
      },
      {
        id: "country",
        header: "Based in",
        cell: ({ row }) => countryName(row.original),
        size: 140,
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
        size: 120,
      },
      {
        id: "backup",
        header: "Backup choice",
        cell: ({ row }) =>
          row.original.backup_string ? `.${row.original.backup_string}` : (
            <span className="text-muted-foreground">None</span>
          ),
        size: 120,
      },
      {
        id: "link",
        header: "ICANN record",
        cell: ({ row }) => <ExternalLink href={row.original.url}>{row.original.id}</ExternalLink>,
        size: 200,
      },
    ],
    []
  )
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: apps,
    getRowId: (a: Application) => a.id,
    // Show every applicant. The table pages by 10 unless told otherwise.
    initialState: { pagination: { pageIndex: 0, pageSize: 1000 } },
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

