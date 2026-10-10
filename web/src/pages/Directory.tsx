import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import { SearchIcon } from "lucide-react"

import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/status-badge"
import {
  activeApplications,
  formatDate,
  typeLabel,
  useDirectory,
  type Status,
  type Tld,
} from "@/data"

type View = Status | "all"

interface Row {
  tld: string
  name: string
  unicode: string | null
  status: Status
  who: string
  date: string
  dateLabel: string
  search: string
}

function toRow(t: Tld): Row {
  const apps = activeApplications(t)
  const isIdn = t.tld.startsWith("xn--")
  let who = t.manager ?? ""
  if (t.status === "applied") {
    who =
      apps.length === 1
        ? apps[0].applicant
        : `${apps.length} applicants competing`
  } else if (t.status === "removed") {
    who = "No operator"
  }
  const date =
    t.status === "removed" ? t.removed : t.status === "live" ? t.delegated : null
  const dateLabel =
    t.status === "removed"
      ? `Removed ${formatDate(date)}`
      : t.status === "live"
        ? `Since ${formatDate(date)}`
        : "Applied 2026"
  return {
    tld: t.tld,
    name: isIdn ? t.display : t.tld,
    unicode: isIdn ? t.tld : null,
    status: t.status,
    who,
    date: date ?? "9999",
    dateLabel,
    search: [
      t.tld,
      t.display,
      t.manager,
      typeLabel[t.type],
      ...apps.map((a) => a.applicant),
    ]
      .join(" ")
      .toLowerCase(),
  }
}

export function Directory() {
  const { data } = useDirectory()
  const navigate = useNavigate()
  // Where "Back to the list" returns to, with the search and tab kept.
  const here = useLocation()
  const back = here.pathname + here.search
  const [params, setParams] = useSearchParams()
  const view = (params.get("view") as View) ?? "applied"
  const query = params.get("q") ?? ""

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])

  const allRows = useMemo(() => data.tlds.map(toRow), [data])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, "")
    return allRows.filter(
      (r) => (view === "all" || r.status === view) && (!q || r.search.includes(q))
    )
  }, [allRows, view, query])

  function update(next: { view?: View; q?: string }) {
    const p = new URLSearchParams(params)
    if (next.view !== undefined) p.set("view", next.view)
    if (next.q !== undefined) {
      if (next.q) p.set("q", next.q)
      else p.delete("q")
    }
    setParams(p, { replace: true })
    setPagination((s) => ({ ...s, pageIndex: 0 }))
  }

  const columns = useMemo<ColumnDef<DataGridFeatures, Row>[]>(
    () => [
      {
        accessorKey: "name",
        id: "name",
        header: ({ column }) => (
          <DataGridColumnHeader title="Domain" column={column} />
        ),
        cell: ({ row }) => (
          <div className="space-y-px">
            <Link
              to={`/${row.original.tld}/`}
              state={{ back }}
              viewTransition
              onClick={(e) => e.stopPropagation()}
              className="text-foreground text-base font-medium hover:underline"
            >
              .{row.original.name}
            </Link>
            {row.original.unicode && (
              <div className="text-muted-foreground">
                .{row.original.unicode}
              </div>
            )}
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        size: 170,
      },
      {
        accessorKey: "who",
        header: ({ column }) => (
          <DataGridColumnHeader title="Run by / applied for by" column={column} />
        ),
        cell: (info) => (
          <span className="line-clamp-1">{info.getValue() as string}</span>
        ),
        size: 360,
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <DataGridColumnHeader title="When" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.dateLabel}</span>
        ),
        size: 180,
      },
    ],
    [back]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row: Row) => row.tld,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  const count = (s: View) =>
    s === "all" ? data.tlds.length : data.counts[s as Status]

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Upcoming domain extensions</h1>
        <p className="text-muted-foreground">
          Every ending a web address can have, like .com or .ai. The ones
          companies applied for in 2026, the ones in use, and the ones that
          were shut down. Updated every day from ICANN and IANA.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => update({ view: v as View })}>
          <TabsList>
            <TabsTrigger value="applied">Coming<span className="hidden sm:inline">&nbsp;({count("applied")})</span></TabsTrigger>
            <TabsTrigger value="live">Live<span className="hidden sm:inline">&nbsp;({count("live")})</span></TabsTrigger>
            <TabsTrigger value="removed">Removed<span className="hidden sm:inline">&nbsp;({count("removed")})</span></TabsTrigger>
            <TabsTrigger value="all">All<span className="hidden sm:inline">&nbsp;({count("all")})</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-auto sm:min-w-64 sm:flex-1">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search a domain or a company, for example .ai or Google"
            className="pl-8"
            autoFocus
          />
        </div>
      </div>

      <DataGrid
        table={table}
        recordCount={rows.length}
        onRowClick={(row) => navigate(`/${row.tld}/`, { state: { back }, viewTransition: true })}
        emptyMessage="Nothing matches that search."
        tableLayout={{ headerSticky: true }}
      >
        <div className="w-full space-y-2.5">
          <DataGridContainer>
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
          <DataGridPagination />
        </div>
      </DataGrid>
    </div>
  )
}
