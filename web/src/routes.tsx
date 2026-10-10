import { useEffect } from "react"
import { NavLink, Outlet, ScrollRestoration, useLocation, type RouteObject } from "react-router"

import { cn } from "@/lib/utils"
import { formatUpdated, useDirectory } from "@/data"
import { pageMeta } from "@/meta"
import { AlertsPage } from "@/pages/AlertsPage"
import { ApplyPage } from "@/pages/ApplyPage"
import { Directory } from "@/pages/Directory"
import { TldPage } from "@/pages/TldPage"

function Nav({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      viewTransition
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-1.5 whitespace-nowrap",
          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {children}
    </NavLink>
  )
}

function Layout() {
  const { data } = useDirectory()
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pageMeta(pathname, data).title
  }, [pathname, data])
  return (
    <div className="w-full px-6 py-6 lg:px-10">
      <header className="site-header mb-8 flex flex-wrap items-center justify-between gap-3">
        <nav className="-ml-3 flex flex-wrap gap-1">
          <Nav to="/">Directory</Nav>
          <Nav to="/how-it-works/">How applying works</Nav>
          <Nav to="/alerts/">Alerts</Nav>
        </nav>
        <span className="text-muted-foreground">Updated {formatUpdated(data.collected_at)}</span>
      </header>
      <main>
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Directory /> },
      { path: "how-it-works", element: <ApplyPage /> },
      { path: "alerts", element: <AlertsPage /> },
      { path: ":name", element: <TldPage /> },
    ],
  },
]

// The router's base path, without the trailing slash.
export const basename = import.meta.env.BASE_URL.replace(/\/$/, "")
