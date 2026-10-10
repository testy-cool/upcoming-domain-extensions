import { ExternalLinkIcon } from "lucide-react"

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLinkIcon className="size-3.5" />
    </a>
  )
}

export interface Source {
  title: string
  href: string
}

// One row per official page, the whole row is the link.
export function Sources({ sources }: { sources: Source[] }) {
  return (
    <ItemGroup className="-mx-3 w-auto gap-1">
      {sources.map((s) => (
        <Item key={s.href} asChild size="sm">
          <a href={s.href} target="_blank" rel="noreferrer">
            <ItemContent>
              <ItemTitle>{s.title}</ItemTitle>
              <ItemDescription>{new URL(s.href).hostname}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ExternalLinkIcon className="text-muted-foreground size-4" />
            </ItemActions>
          </a>
        </Item>
      ))}
    </ItemGroup>
  )
}
