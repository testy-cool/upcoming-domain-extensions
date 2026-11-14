import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router"
import {
  type ColumnDef,
  type ExpandedState,
  type PaginationState,
  type ColumnVisibilityState,
  type SortingState,
  useTable,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react"

import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  useDataGrid,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnVisibility } from "@/components/reui/data-grid/data-grid-column-visibility"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoLiveNote } from "@/components/go-live-note"
import { StatusBadge } from "@/components/status-badge"
import { Applications, Facts, summary } from "@/components/tld-details"
import { WatchButton } from "@/components/watch-button"
import {
  activeApplications,
  countryName,
  formatDate,
  typeLabel,
  useDirectory,
  type Status,
  type Tld,
} from "@/data"

type View = Status | "all"

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("")
// IANA says which alphabet each ending it knows is written in. Endings that are
// only applied for are worked out from their letters here.
const DETECT: [string, RegExp][] = [
  ["Han", /\p{Script=Han}/u],
  ["Arabic", /\p{Script=Arabic}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u],
  ["Katakana", /\p{Script=Katakana}/u],
  ["Hiragana", /\p{Script=Hiragana}/u],
  ["Hangul", /\p{Script=Hangul}/u],
  ["Devanagari", /\p{Script=Devanagari}/u],
  ["Hebrew", /\p{Script=Hebrew}/u],
  ["Greek", /\p{Script=Greek}/u],
  ["Thai", /\p{Script=Thai}/u],
]
function alphabetOf(t: Tld, name: string): string {
  if (t.script_name) return t.script_name.replace(/ \(.*\)$/, "")
  return DETECT.find(([, re]) => re.test(name))?.[0] ?? "Latin"
}
// Plain names for the alphabets whose own name says little to most people.
const alphabetLabel: Record<string, string> = {
  Latin: "Latin (a to z)",
  Han: "Chinese characters",
  Katakana: "Japanese katakana",
  Hiragana: "Japanese hiragana",
  Hangul: "Korean",
  Devanagari: "Devanagari (Hindi and others)",
  Gurmukhi: "Gurmukhi (Punjabi)",
}
const ANY = "any"

// The letter an ending is filed under. An accent is dropped, so .québec is under Q.
// Endings in another alphabet, such as .рф or .中国, are under none.
const firstLetter = (name: string) => {
  const c = name.normalize("NFD")[0]?.toLowerCase() ?? ""
  return LETTERS.includes(c) ? c : ""
}

interface Row {
  tld: string
  name: string
  unicode: string | null
  status: Status
  who: string
  date: string
  dateLabel: string
  search: string
  letter: string
  alphabet: string
  t: Tld
  kind: string
  applicants: number | null
  countries: string
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
  // Shown next to the status: since when it is live, or when it was removed.
  const dateLabel =
    t.status === "removed"
      ? formatDate(date)
      : t.status === "live"
        ? `since ${date?.slice(0, 4) ?? "?"}`
        : ""
  return {
    tld: t.tld,
    name: isIdn ? t.display : t.tld,
    unicode: isIdn ? t.tld : null,
    status: t.status,
    who,
    date: date ?? "9999",
    dateLabel,
    letter: firstLetter(isIdn ? t.display : t.tld),
    alphabet: alphabetOf(t, isIdn ? t.display : t.tld),
    t,
    kind:
      t.status === "applied"
        ? [...new Set(apps.flatMap((a) => (a.kinds.length ? a.kinds : ["Standard"])))].join(", ")
        : (typeLabel[t.type] ?? t.type),
    applicants: t.status === "applied" ? apps.length : null,
    countries: [...new Set(apps.map(countryName))].join(", "),
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

const COLUMNS_KEY = "domain-extensions-columns"
const HIDDEN_AT_FIRST: ColumnVisibilityState = {
  kind: false,
  applicants: false,
  countries: false,
  contest: false,
  website: false,
  whois: false,
}

const muted = (v: React.ReactNode) => <span className="text-muted-foreground">{v}</span>

// Columns anyone can add from the Columns menu. Hidden until picked.
const extraColumns: ColumnDef<DataGridFeatures, Row>[] = [
  {
    accessorKey: "kind",
    header: ({ column }) => <DataGridColumnHeader title="Kind" column={column} />,
    meta: { headerTitle: "Kind" },
    size: 150,
  },
  {
    id: "website",
    accessorFn: (r: Row) => r.t.website ?? "",
    header: ({ column }) => <DataGridColumnHeader title="Registry website" column={column} />,
    meta: { headerTitle: "Registry website" },
    cell: ({ row }) =>
      row.original.t.website ? (
        <span className="line-clamp-1 break-all">{row.original.t.website.replace(/^https?:\/\//, "")}</span>
      ) : (
        muted("None")
      ),
    size: 220,
  },
  {
    id: "whois",
    accessorFn: (r: Row) => r.t.whois ?? "",
    header: ({ column }) => <DataGridColumnHeader title="WHOIS server" column={column} />,
    meta: { headerTitle: "WHOIS server" },
    cell: ({ row }) => row.original.t.whois || muted("None"),
    size: 200,
  },
  {
    accessorKey: "applicants",
    header: ({ column }) => <DataGridColumnHeader title="Applicants" column={column} />,
    meta: { headerTitle: "Applicants" },
    cell: ({ row }) => row.original.applicants ?? muted("None"),
    size: 120,
  },
  {
    accessorKey: "countries",
    header: ({ column }) => <DataGridColumnHeader title="Applicant countries" column={column} />,
    meta: { headerTitle: "Applicant countries" },
    cell: ({ row }) => <span className="line-clamp-2">{row.original.countries || muted("None")}</span>,
    size: 220,
  },
  {
    id: "contest",
    accessorFn: (r: Row) => r.t.contention_set ?? Infinity,
    header: ({ column }) => <DataGridColumnHeader title="Contention set" column={column} />,
    meta: { headerTitle: "Contention set" },
    cell: ({ row }) => row.original.t.contention_set ?? muted("None"),
    size: 140,
  },
]

// The pager at the top of the list: where you are and the next and previous
// pages, without the page size, which stays with the full pager at the bottom.
function PageSteps() {
  const { table, recordCount, i18n } = useDataGrid()
  const { pageIndex, pageSize } = table.state.pagination
  const from = recordCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, recordCount)
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground mr-1 text-sm tabular-nums">
        {i18n.labels.paginationInfo({ from, to, count: recordCount })}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={i18n.labels.previousPage}
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={i18n.labels.nextPage}
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}

// What opens under a row when it is clicked.
function RowDetails({ t, back }: { t: Tld; back: string }) {
  const apps = activeApplications(t)
  return (
    <div className="bg-muted/40 space-y-4 px-4 py-5">
      <p className="text-muted-foreground max-w-3xl">{summary(t)}</p>
      {t.status === "applied" && <GoLiveNote />}
      {t.status === "applied" ? <Applications apps={apps} /> : <Facts t={t} />}
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="outline" asChild>
          <Link to={`/${t.tld}/`} state={{ back }} viewTransition>
            Open the full page for .{t.display}
          </Link>
        </Button>
        <WatchButton tld={t.tld} />
      </div>
    </div>
  )
}

export function Directory() {
  const { data } = useDirectory()
  // Where "Back to the list" returns to, with the search and tab kept.
  const here = useLocation()
  const back = here.pathname + here.search
  const [params, setParams] = useSearchParams()
  const view = (params.get("view") as View) ?? "live"
  const query = params.get("q") ?? ""
  const letter = params.get("letter") ?? ""
  const alphabet = params.get("alphabet") ?? ""

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [visibility, setVisibility] = useState<ColumnVisibilityState>(HIDDEN_AT_FIRST)
  // The extra columns someone picked are remembered in this browser. Read after
  // the first render, so it matches the HTML the server sent.
  useEffect(() => {
    const saved = localStorage.getItem(COLUMNS_KEY)
    if (saved) setVisibility({ ...HIDDEN_AT_FIRST, ...JSON.parse(saved) })
  }, [])
  function changeVisibility(next: ColumnVisibilityState | ((old: ColumnVisibilityState) => ColumnVisibilityState)) {
    setVisibility((old) => {
      const value = typeof next === "function" ? next(old) : next
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(value))
      return value
    })
  }
  function toggle(tld: string) {
    setExpanded((old) => {
      const open = old === true ? {} : { ...old }
      if (open[tld]) delete open[tld]
      else open[tld] = true
      return open
    })
  }
  // Newest first: the latest to go live, or to be removed, at the top. Upcoming
  // ones have no date yet and keep their a to z order.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "status", desc: true },
  ])

  const allRows = useMemo(() => data.tlds.map(toRow), [data])
  // The endings in this tab, before the search, the alphabet and the letter.
  const inView = useMemo(
    () => allRows.filter((r) => view === "all" || r.status === view),
    [allRows, view]
  )
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, "")
    return inView.filter(
      (r) =>
        (!q || r.search.includes(q)) &&
        (!alphabet || r.alphabet === alphabet) &&
        (!letter || r.letter === letter)
    )
  }, [inView, query, alphabet, letter])
  // How many endings of this tab each alphabet has, most first.
  const alphabets = useMemo(() => {
    const n = new Map<string, number>()
    for (const r of inView) n.set(r.alphabet, (n.get(r.alphabet) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1])
  }, [inView])
  // How many endings of this tab start with each letter. A letter with none
  // cannot be picked.
  const letterCounts = useMemo(() => {
    const n = new Map<string, number>()
    for (const r of inView)
      if (!alphabet || r.alphabet === alphabet) n.set(r.letter, (n.get(r.letter) ?? 0) + 1)
    return n
  }, [inView, alphabet])
  const filtering = Boolean(query || alphabet || letter)

  function update(next: { view?: View; q?: string; letter?: string; alphabet?: string }) {
    const p = new URLSearchParams(params)
    if (next.view !== undefined) p.set("view", next.view)
    for (const key of ["q", "letter", "alphabet"] as const) {
      const value = next[key]
      if (value === undefined) continue
      if (value) p.set(key, value)
      else p.delete(key)
    }
    setParams(p, { replace: true })
    setPagination((s) => ({ ...s, pageIndex: 0 }))
  }

  const columns = useMemo<ColumnDef<DataGridFeatures, Row>[]>(
    () => [
      {
        id: "open",
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={row.getIsExpanded() ? "Hide details" : "Show details"}
            aria-expanded={row.getIsExpanded()}
            onClick={(e) => {
              e.stopPropagation()
              toggle(row.original.tld)
            }}
          >
            {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Button>
        ),
        size: 44,
        enableHiding: false,
        meta: {
          expandedContent: (r: Row) => <RowDetails t={r.t} back={back} />,
        },
      },
      {
        accessorKey: "name",
        id: "name",
        header: ({ column }) => (
          <DataGridColumnHeader title="Domain" column={column} />
        ),
        meta: { headerTitle: "Domain" },
        enableHiding: false,
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
        id: "status",
        // Sorted by date, so live ones sort oldest first and removed ones by removal.
        accessorFn: (r: Row) => `${r.status} ${r.date}`,
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} />
        ),
        meta: { headerTitle: "Status" },
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.original.status} />
            {row.original.dateLabel && (
              <span className="text-muted-foreground">{row.original.dateLabel}</span>
            )}
          </div>
        ),
        size: 230,
      },
      {
        accessorKey: "who",
        header: ({ column }) => (
          <DataGridColumnHeader title="Run by / applied for by" column={column} />
        ),
        meta: { headerTitle: "Run by / applied for by" },
        cell: (info) => (
          <span className="line-clamp-1">{info.getValue() as string}</span>
        ),
        size: 420,
      },
      ...extraColumns,
    ],
    [back]
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row: Row) => row.tld,
    getRowCanExpand: () => true,
    state: { pagination, sorting, expanded, columnVisibility: visibility },
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: changeVisibility,
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

      <DataGrid
        table={table}
        recordCount={rows.length}
        onRowClick={(row) => toggle(row.tld)}
        emptyMessage="Nothing matches that search."
        tableLayout={{ headerSticky: true, columnsVisibility: true }}
      >
        <div className="w-full space-y-3">
          <Tabs value={view} onValueChange={(v) => update({ view: v as View })}>
            <TabsList>
              <TabsTrigger value="live">Live<span className="hidden sm:inline">&nbsp;({count("live")})</span></TabsTrigger>
              <TabsTrigger value="applied">Upcoming<span className="hidden sm:inline">&nbsp;({count("applied")})</span></TabsTrigger>
              <TabsTrigger value="removed">Removed<span className="hidden sm:inline">&nbsp;({count("removed")})</span></TabsTrigger>
              <TabsTrigger value="all">All<span className="hidden sm:inline">&nbsp;({count("all")})</span></TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Search endings or companies"
                aria-label="Search endings or companies"
                className="pl-8"
                autoFocus
              />
            </div>
            <Select
              value={alphabet || ANY}
              onValueChange={(v) => {
                const picked = v === ANY ? "" : v
                // Only Latin endings start with a to z, so another alphabet clears the letter.
                update({ alphabet: picked, ...(picked && picked !== "Latin" ? { letter: "" } : {}) })
              }}
            >
              <SelectTrigger aria-label="Alphabet" className="w-fit min-w-40">
                {/* Named here so the page sent by the server shows it too. */}
                <SelectValue>{alphabet ? (alphabetLabel[alphabet] ?? alphabet) : "All alphabets"}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectItem value={ANY}>All alphabets</SelectItem>
                {alphabets.map(([a, n]) => (
                  <SelectItem key={a} value={a}>
                    {alphabetLabel[a] ?? a} ({n})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!alphabet || alphabet === "Latin") && (
              <Select value={letter || ANY} onValueChange={(v) => update({ letter: v === ANY ? "" : v })}>
                <SelectTrigger aria-label="First letter" className="w-fit min-w-36">
                  <SelectValue>{letter ? `Starts with ${letter.toUpperCase()}` : "Any first letter"}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectItem value={ANY}>Any first letter</SelectItem>
                  {LETTERS.map((l) => (
                    <SelectItem key={l} value={l} disabled={!letterCounts.get(l)}>
                      {l.toUpperCase()} ({letterCounts.get(l) ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filtering && (
              <Button variant="ghost" onClick={() => update({ q: "", alphabet: "", letter: "" })}>
                <XIcon />
                Clear
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <PageSteps />
              <DataGridColumnVisibility
                table={table}
                trigger={
                  <Button variant="outline">
                    <Settings2Icon />
                    Columns
                  </Button>
                }
              />
            </div>
          </div>
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
