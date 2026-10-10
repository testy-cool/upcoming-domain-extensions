// Serves testy.cool/upcoming-domain-extensions/* from the GitHub Pages site of the same name.
const ORIGIN = "https://testy-cool.github.io"
const PREFIX = "/upcoming-domain-extensions"

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === PREFIX) {
      return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 301)
    }
    const upstream = await fetch(ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers: { "Accept-Encoding": request.headers.get("Accept-Encoding") ?? "" },
      redirect: "manual",
    })
    const response = new Response(upstream.body, upstream)
    const location = response.headers.get("Location")
    if (location) {
      response.headers.set("Location", location.replace(ORIGIN, url.origin).replace(/^http:/, "https:"))
    }
    return response
  },
}
