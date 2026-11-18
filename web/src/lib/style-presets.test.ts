import { describe, expect, it } from "vitest"

import { defaultDesign } from "@/lib/qr"
import { STYLE_PRESETS, applyPreset } from "@/lib/style-presets"

describe("style presets", () => {
    it("keep the logo and drop frames when frames are not available", () => {
        const design = { ...defaultDesign(), logo: { preset: "x", image: null, size: 0.3 } }
        const framed = STYLE_PRESETS.find((p) => p.design.frame.style !== "none")!
        expect(applyPreset(design, framed, true).frame.style).toBe(framed.design.frame.style)
        expect(applyPreset(design, framed, false).frame.style).toBe("none")
        expect(applyPreset(design, framed, true).logo.preset).toBe("x")
    })

    it("all keep dark modules on a light ground", () => {
        const lum = (hex: string) =>
            parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
        for (const preset of STYLE_PRESETS) {
            expect(lum(preset.design.dots.color)).toBeLessThan(lum(preset.design.background.color) - 300)
        }
    })
})
