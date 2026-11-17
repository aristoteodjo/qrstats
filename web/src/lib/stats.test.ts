import { describe, expect, it } from "vitest"

import { change, shortDay } from "@/lib/format"
import { bucketLabel, periodRange } from "@/lib/stats"

describe("stats helpers", () => {
    it("computes inclusive period ranges", () => {
        expect(periodRange("7", new Date(2026, 10, 18))).toEqual({ from: "2026-11-12", to: "2026-11-18" })
        expect(periodRange("30", new Date(2026, 2, 1))).toEqual({ from: "2026-01-31", to: "2026-03-01" })
    })

    it("labels buckets", () => {
        expect(bucketLabel("country", "BJ")).toBe("Bénin")
        expect(bucketLabel("language", "fr")).toBe("français")
        expect(bucketLabel("device", "mobile")).toBe("Mobile")
        expect(bucketLabel("city", "")).toBe("Non renseigné")
        expect(bucketLabel("referrer", "")).toBe("Direct (scan)")
        expect(bucketLabel("os", "__other__")).toBe("Autres")
    })

    it("compares periods", () => {
        expect(change(15, 10)).toBe(0.5)
        expect(change(3, 0)).toBeNull()
        expect(shortDay("2026-11-02")).toBe("2 nov.")
    })
})
