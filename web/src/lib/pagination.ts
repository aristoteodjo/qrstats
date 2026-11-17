export type PageItem = number | "gap"

/**
 * The page numbers to show (1-based), with "gap" where pages are skipped: always the first and last,
 * the current one and its neighbours. Seven slots at most, so the bar keeps its width while paging.
 */
export function pageItems(current: number, count: number): Array<PageItem> {
    if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, "gap", count]
    if (current >= count - 3) return [1, "gap", count - 4, count - 3, count - 2, count - 1, count]
    return [1, "gap", current - 1, current, current + 1, "gap", count]
}
