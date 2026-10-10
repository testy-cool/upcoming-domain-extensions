import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import "./index.css"

import { DirectoryProvider, loadDirectory } from "@/data"
import { basename, routes } from "@/routes"

const root = document.getElementById("root")!

loadDirectory().then(
  (data) => {
    const router = createBrowserRouter(routes, {
      basename,
      hydrationData: window.__staticRouterHydrationData,
    })
    const app = (
      <StrictMode>
        <DirectoryProvider value={data}>
          <RouterProvider router={router} />
        </DirectoryProvider>
      </StrictMode>
    )
    // Prerendered pages are hydrated. A search in the address bar, the 404 page
    // and the dev server have no matching HTML, so React draws those itself.
    if (root.hasChildNodes() && !location.search) hydrateRoot(root, app)
    else createRoot(root).render(app)
  },
  (e: Error) => {
    root.textContent = e.message
  }
)

declare global {
  interface Window {
    __staticRouterHydrationData?: import("react-router").HydrationState
  }
}
