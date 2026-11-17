const integer = new Intl.NumberFormat("fr-FR")
const percentFormat = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 })
const momentFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" })
const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })

export const count = (value: number) => integer.format(value)
export const percent = (value: number) => percentFormat.format(value)
export const moment = (iso: string) => momentFormat.format(new Date(iso))

/** A YYYY-MM-DD calendar day, read as a day (not an instant), so no zone shifts it. */
export function shortDay(date: string): string {
    const [y, m, d] = date.split("-").map(Number)
    return dayFormat.format(new Date(y, m - 1, d))
}

/** Change from the previous period: null when there is nothing to compare with. */
export function change(current: number, previous: number): number | null {
    if (previous === 0) return null
    return (current - previous) / previous
}

/** YYYY-MM-DD of a local date. */
export function isoDay(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
