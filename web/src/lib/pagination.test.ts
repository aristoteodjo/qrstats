import { describe, expect, it } from "vitest"

import { pageItems } from "@/lib/pagination"

describe("pageItems", () => {
    it("lists every page when there are few", () => {
        expect(pageItems(1, 1)).toEqual([1])
        expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    })

    it("keeps seven slots around the current page", () => {
        expect(pageItems(1, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20])
        expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20])
        expect(pageItems(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20])
        expect(pageItems(17, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20])
        expect(pageItems(20, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20])
    })

    it("always shows the current page", () => {
        for (let count = 1; count <= 30; count++) {
            for (let current = 1; current <= count; current++) {
                const items = pageItems(current, count)
                expect(items).toContain(current)
                expect(items.length).toBeLessThanOrEqual(7)
            }
        }
    })
})
