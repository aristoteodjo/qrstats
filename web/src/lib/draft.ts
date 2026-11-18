import { z } from "zod"

import { KINDS, readDesign } from "@/lib/qr"
import type { Design, Kind } from "@/lib/qr"

/**
 * An editor draft, kept in the tab's sessionStorage so leaving the page (or reloading it) never loses the work.
 * Never holds a password. `stamp` ties an edit draft to the version of the code it started from.
 */
export type Draft = {
    kind: Kind | ""
    name: string
    content: Record<string, unknown>
    protect: boolean
    design: Design
    stamp: string
    preset: string
    social: { value: string; message: string }
    rules: Array<{ field: string; value: string; url: string }>
}

const draftSchema = z.object({
    // An unknown kind means the draft comes from elsewhere (or an older version): it is dropped, not repaired.
    kind: z.union([z.enum(KINDS), z.literal("")]),
    name: z.string().max(120).catch(""),
    content: z.record(z.string(), z.unknown()).catch({}),
    protect: z.boolean().catch(false),
    design: z.unknown().optional(),
    stamp: z.string().catch(""),
    preset: z.string().catch(""),
    social: z.object({ value: z.string().catch(""), message: z.string().catch("") }).catch({ value: "", message: "" }),
    rules: z
        .array(z.object({ field: z.string().catch("os"), value: z.string().catch(""), url: z.string().catch("") }))
        .max(10)
        .catch([]),
})

/** Parses a stored draft; anything unreadable is treated as no draft at all. */
export function parseDraft(raw: string | null): Draft | null {
    if (!raw) return null
    try {
        const stored: unknown = JSON.parse(raw)
        if (typeof stored !== "object" || stored === null) return null
        // Missing keys take their empty value; only a wrong kind voids the draft.
        const parsed = draftSchema.safeParse({
            kind: "",
            name: "",
            content: {},
            protect: false,
            stamp: "",
            preset: "",
            social: { value: "", message: "" },
            rules: [],
            ...stored,
        })
        if (!parsed.success) return null
        return { ...parsed.data, design: readDesign(parsed.data.design) }
    } catch {
        return null
    }
}

export function draftKey(scope: "new" | "guest" | `edit:${string}`) {
    return `qrstats:draft:${scope}`
}

/** Storage can be missing or refuse writes (private mode, full quota): a draft is a convenience, never an error. */
export function loadDraft(key: string): Draft | null {
    try {
        return parseDraft(window.sessionStorage.getItem(key))
    } catch {
        return null
    }
}

export function saveDraft(key: string, draft: Draft) {
    try {
        window.sessionStorage.setItem(key, JSON.stringify(draft))
    } catch {
        // A logo can exceed the quota: the draft is then simply not kept.
    }
}

export function clearDraft(key: string) {
    try {
        window.sessionStorage.removeItem(key)
    } catch {
        // Nothing to clear.
    }
}

export const STEPS = [1, 2, 3] as const
export type Step = (typeof STEPS)[number]

/** The step actually shown: a step past the first needs a chosen kind, otherwise it falls back to choosing one. */
export function effectiveStep(requested: Step | undefined, kind: Kind | "", fallback: Step): Step {
    const step = requested ?? fallback
    return step > 1 && !kind ? 1 : step
}
