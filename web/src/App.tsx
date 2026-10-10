import { BrowserRouter, NavLink, Route, Routes } from "react-router"

import { cn } from "@/lib/utils"
import { useDirectory } from "@/data"
import { AlertsPage } from "@/pages/AlertsPage"
import { ApplyPage } from "@/pages/ApplyPage"
import { Directory } from "@/pages/Directory"
import { TldPage } from "@/pages/TldPage"

function Nav({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-1.5",
          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      {children}
    </NavLink>
  )
}

function Updated() {
  const { data } = useDirectory()
  if (!data) return null
  return (
    <span className="text-muted-foreground">
      Updated {new Date(data.collected_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
    </span>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto w-full max-w-5xl px-6 py-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex gap-1">
            <Nav to="/">Directory</Nav>
            <Nav to="/how-it-works">How applying works</Nav>
            <Nav to="/alerts">Alerts</Nav>
          </nav>
          <Updated />
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Directory />} />
            <Route path="/tld/:name" element={<TldPage />} />
            <Route path="/how-it-works" element={<ApplyPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
