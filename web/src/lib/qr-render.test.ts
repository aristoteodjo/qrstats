import { describe, expect, it } from "vitest"

import { defaultDesign } from "@/lib/qr"
import { fileName, framedSvg, stylingOptions } from "@/lib/qr-render"

describe("stylingOptions", () => {
    it("raises error correction when a logo is present", () => {
        const design = defaultDesign()
        expect(stylingOptions(design, "x", null).qrOptions.errorCorrectionLevel).toBe("Q")
        expect(stylingOptions(design, "x", "data:image/png;base64,AA").qrOptions.errorCorrectionLevel).toBe("H")
    })

    it("leaves corner types to the library by default", () => {
        const design = defaultDesign()
        expect(stylingOptions(design, "x", null).cornersSquareOptions).toEqual({ color: "#000000" })
        design.cornersDot = { style: "dot", color: "#123456" }
        expect(stylingOptions(design, "x", null).cornersDotOptions).toEqual({ type: "dot", color: "#123456" })
        design.background.transparent = true
        expect(stylingOptions(design, "x", null).backgroundOptions.color).toBe("transparent")
    })
})

describe("framedSvg", () => {
    it("keeps the bare code without a frame and escapes the label", () => {
        const design = defaultDesign()
        expect(framedSvg("<svg/>", design, 100)).toContain('width="100" height="100"')
        design.frame = { style: "label", text: '<b>"Menu"</b>', color: "#000000" }
        const svg = framedSvg("<svg/>", design, 100)
        expect(svg).toContain("&lt;b&gt;&quot;Menu&quot;&lt;/b&gt;")
        expect(svg).not.toContain("<b>")
    })

    it("draws every frame", () => {
        for (const style of ["label", "box", "badge", "speech"] as const) {
            const design = defaultDesign()
            design.frame.style = style
            expect(framedSvg("<svg/>", design, 200)).toMatch(/^<svg [^>]+>.*<\/svg>$/)
        }
    })
})

it("derives file names", () => {
    expect(fileName("Menu du jour (été)", "png")).toBe("menu-du-jour-ete.png")
    expect(fileName("!!!", "svg")).toBe("qr-code.svg")
})
