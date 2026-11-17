import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { request } from "@/lib/api"
import { isoDay } from "@/lib/format"

const bucket = z.object({ key: z.string(), count: z.number() })

export const statsSchema = z.object({
    from: z.string(),
    to: z.string(),
    scans: z.number(),
    uniques: z.number(),
    previous: z.object({ scans: z.number(), uniques: z.number() }),
    series: z.array(z.object({ date: z.string(), scans: z.number(), uniques: z.number() })),
    hours: z.array(z.number()),
    weekdays: z.array(z.number()),
    breakdowns: z.record(z.string(), z.array(bucket)),
    top_codes: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string(), scans: z.number() })),
})
export type Stats = z.infer<typeof statsSchema>
export type Bucket = z.infer<typeof bucket>

export const PERIODS = [
    { value: "7", label: "7 jours" },
    { value: "30", label: "30 jours" },
    { value: "90", label: "90 jours" },
    { value: "365", label: "12 mois" },
] as const
export type Period = (typeof PERIODS)[number]["value"]

/** Inclusive day range ending today, in the reader's zone. */
export function periodRange(period: Period, today = new Date()): { from: string; to: string } {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (Number(period) - 1))
    return { from: isoDay(start), to: isoDay(today) }
}

export const readerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

export const statsQuery = (period: Period, qrCodeId?: string) => {
    const tz = typeof window === "undefined" ? "UTC" : readerZone()
    const range = periodRange(period)
    return queryOptions({
        queryKey: ["stats", { period, qrCodeId, tz, ...range }],
        queryFn: () => request(statsSchema, "/stats", { query: { ...range, tz, qr_code_id: qrCodeId } }),
    })
}

export const DIMENSIONS = {
    device: "Appareils",
    os: "Systèmes",
    browser: "Navigateurs",
    country: "Pays",
    city: "Villes",
    language: "Langues",
    referrer: "Provenance",
    utm_source: "Sources (UTM)",
    utm_medium: "Supports (UTM)",
    utm_campaign: "Campagnes (UTM)",
} as const
export type Dimension = keyof typeof DIMENSIONS

const DEVICES: Record<string, string> = { mobile: "Mobile", tablet: "Tablette", desktop: "Ordinateur" }

let regions: Intl.DisplayNames | null = null
let languages: Intl.DisplayNames | null = null

/** A bucket key in words: empty is "Inconnu", "__other__" is the folded tail, codes become names. */
export function bucketLabel(dimension: Dimension, key: string): string {
    if (key === "__other__") return "Autres"
    if (key === "") return dimension === "referrer" ? "Direct (scan)" : "Non renseigné"
    if (dimension === "device") return DEVICES[key] ?? key
    try {
        if (dimension === "country") {
            regions ??= new Intl.DisplayNames(["fr"], { type: "region" })
            return regions.of(key) ?? key
        }
        if (dimension === "language") {
            languages ??= new Intl.DisplayNames(["fr"], { type: "language" })
            return languages.of(key) ?? key
        }
    } catch {
        return key
    }
    return key
}

export const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
