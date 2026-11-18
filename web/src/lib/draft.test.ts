import { describe, expect, it } from "vitest"

import { effectiveStep, parseDraft } from "@/lib/draft"

describe("drafts", () => {
    it("reads a stored draft and repairs its design", () => {
        const draft = parseDraft(
            JSON.stringify({
                kind: "url",
                name: "Menu",
                content: { url: { url: "a.example" } },
                protect: true,
                design: { dots: { style: "bad" } },
                stamp: "x",
            }),
        )
        expect(draft?.kind).toBe("url")
        expect(draft?.protect).toBe(true)
        expect(draft?.design.dots.style).toBe("square")
    })

    it("ignores unreadable drafts", () => {
        expect(parseDraft(null)).toBeNull()
        expect(parseDraft("{nope")).toBeNull()
        expect(parseDraft(JSON.stringify({ kind: "evil" }))).toBeNull()
        expect(parseDraft(JSON.stringify({ kind: "" }))?.kind).toBe("")
    })

    it("never shows a content step without a kind", () => {
        expect(effectiveStep(3, "", 1)).toBe(1)
        expect(effectiveStep(3, "url", 1)).toBe(3)
        expect(effectiveStep(undefined, "url", 2)).toBe(2)
    })
})
