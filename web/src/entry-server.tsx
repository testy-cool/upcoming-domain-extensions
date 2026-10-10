// Renders one page to HTML at build time. scripts/prerender.mjs calls this for every page.
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router"

import { DirectoryProvider, type Directory } from "@/data"
import { pageMeta } from "@/meta"
import { basename, routes } from "@/routes"

const handler = createStaticHandler(routes, { basename })

export { pageMeta }

export async function render(path: string, data: Directory) {
  const context = await handler.query(new Request(`http://localhost${basename}${path}`))
  if (context instanceof Response) throw new Error(`${path} answered with a redirect`)
  const router = createStaticRouter(handler.dataRoutes, context)
  return renderToString(
    <StrictMode>
      <DirectoryProvider value={data}>
        <StaticRouterProvider router={router} context={context} />
      </DirectoryProvider>
    </StrictMode>
  )
}
