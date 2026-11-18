import { describe, expect, it } from "vitest"

import { designContrast, verdict } from "@/lib/scan-check"

describe("contrast", () => {
    it("measures the weakest ink against the ground", () => {
        const design = {
            dots: { color: "#000000" },
            cornersSquare: { color: "#000000" },
            cornersDot: { color: "#000000" },
            background: { color: "#ffffff", transparent: false },
        }
        expect(designContrast(design)).toBeCloseTo(21, 0)
        expect(designContrast({ ...design, dots: { color: "#eeeeee" } })).toBeLessThan(1.2)
        expect(designContrast({ ...design, background: { color: "#000000", transparent: false } })).toBe(1)
        expect(designContrast({ ...design, background: { color: "#000000", transparent: true } })).toBeCloseTo(21, 0)
    })

    it("overrides a lucky decode", () => {
        const decoded = [
            { size: 200, decoded: "x" },
            { size: 400, decoded: "x" },
        ]
        expect(verdict(decoded, "x", 1.1).level).toBe("unreadable")
        expect(verdict(decoded, "x", 3).level).toBe("fragile")
        expect(verdict(decoded, "x", 12).level).toBe("good")
    })
})

describe("scannability verdict", () => {
    it("grades by the sizes that decode", () => {
        expect(
            verdict(
                [
                    { size: 200, decoded: "x" },
                    { size: 400, decoded: "x" },
                ],
                "x",
            ).level,
        ).toBe("good")
        expect(
            verdict(
                [
                    { size: 200, decoded: null },
                    { size: 400, decoded: "x" },
                ],
                "x",
            ).level,
        ).toBe("fragile")
        expect(
            verdict(
                [
                    { size: 200, decoded: null },
                    { size: 400, decoded: null },
                ],
                "x",
            ).level,
        ).toBe("unreadable")
        expect(
            verdict(
                [
                    { size: 200, decoded: "y" },
                    { size: 400, decoded: "x" },
                ],
                "x",
            ).level,
        ).toBe("mismatch")
    })
})
