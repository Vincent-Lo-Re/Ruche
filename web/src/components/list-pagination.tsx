import type { Pagination as PaginationState } from "@/hooks/use-pagination"
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { formatCount } from "@/lib/media/format"
import { pageNumbers } from "@/lib/pagination"
import { texts } from "@/texts"

const words = texts.common.pagination

/**
 * Sous une liste (10/10/2026) : « 26–50 sur 312 », puis les flèches et les numéros de page (la
 * pagination de shadcn, icônes seules). Rien quand tout tient sur une page. Changer de page
 * remonte en haut de la page de l'admin.
 */
export function ListPagination<T>({
  pagination,
}: {
  pagination: PaginationState<T>
}) {
  const { page, count, from, to, total, setPage } = pagination
  if (count <= 1) return null
  const go = (next: number) => {
    setPage(next)
    const scroller = document.querySelector("[data-page-scroll]")
    if (scroller) scroller.scrollTop = 0
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        {words.range(formatCount(from), formatCount(to), formatCount(total))}
      </p>
      <Pagination aria-label={words.label}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              aria-label={words.previous}
              disabled={page === 1}
              onClick={() => go(page - 1)}
            />
          </PaginationItem>
          {pageNumbers(page, count).map((number, index) =>
            number === "gap" ? (
              <PaginationItem key={`gap-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={number}>
                <PaginationButton
                  isActive={number === page}
                  aria-label={words.page(number)}
                  onClick={() => go(number)}
                >
                  {formatCount(number)}
                </PaginationButton>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              aria-label={words.next}
              disabled={page === count}
              onClick={() => go(page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
