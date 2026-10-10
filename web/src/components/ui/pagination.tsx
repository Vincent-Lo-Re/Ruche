import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import type * as React from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

// La pagination de shadcn (variante « icônes seules ») : des boutons, car la page change sur
// place (son numéro est gardé dans l'adresse, lib/pagination.ts) ; ses textes viennent de texts.ts.

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="pagination"
      className={cn("flex justify-end", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

function PaginationButton({
  className,
  isActive,
  ...props
}: { isActive?: boolean } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "ghost"}
      size="icon-sm"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn("tabular-nums", className)}
      {...props}
    />
  )
}

function PaginationPrevious(props: React.ComponentProps<typeof Button>) {
  return (
    <PaginationButton {...props}>
      <ChevronLeftIcon />
    </PaginationButton>
  )
}

function PaginationNext(props: React.ComponentProps<typeof Button>) {
  return (
    <PaginationButton {...props}>
      <ChevronRightIcon />
    </PaginationButton>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-7 items-center justify-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <MoreHorizontalIcon />
    </span>
  )
}

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
}
