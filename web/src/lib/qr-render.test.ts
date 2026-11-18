import { describe, expect, it } from "vitest"

import { defaultDesign } from "@/lib/qr"
import { fileName, framedSvg, nestSvg, resizeSvg, stylingOptions } from "@/lib/qr-render"

describe("stylingOptions", () => {
    it("raises error correction when a logo is present", () => {
        const design = defaultDesign()
        expect(stylingOptions(design, "x", null).qrOptions.errorCorrectionLevel).toBe("Q")
        expect(stylingOptions(design, "x", "data:image/png;base64,AA").qrOptions.errorCorrectionLevel).toBe("H")
    })

    it("draws solid corners by default and lets them follow the dots on request", () => {
        const design = defaultDesign()
        expect(stylingOptions(design, "x", null).cornersSquareOptions).toEqual({ type: "square", color: "#000000" })
        design.cornersSquare = { style: "default", color: "#000000" }
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
        expect(framedSvg('<svg width="100" height="100"></svg>', design, 100)).toContain('width="100" height="100"')
        design.frame = { style: "label", text: '<b>"Menu"</b>', color: "#000000" }
        const svg = framedSvg('<svg width="100" height="100"></svg>', design, 100)
        expect(svg).toContain("&lt;b&gt;&quot;Menu&quot;&lt;/b&gt;")
        expect(svg).not.toContain("<b>")
    })

    it("draws every frame", () => {
        for (const style of ["label", "box", "badge", "speech"] as const) {
            const design = defaultDesign()
            design.frame.style = style
            expect(framedSvg('<svg width="200" height="200"></svg>', design, 200)).toMatch(/^<svg [^>]+>.*<\/svg>$/)
        }
    })
})

describe("resizeSvg", () => {
    it("scales to the export width and keeps proportions", () => {
        expect(resizeSvg('<svg xmlns="x" width="600" height="720" viewBox="0 0 600 720"><g/></svg>', 3000)).toBe(
            '<svg xmlns="x" width="3000" height="3600" viewBox="0 0 600 720"><g/></svg>',
        )
        expect(resizeSvg('<svg width="10" height="10"></svg>', 100)).toBe(
            '<svg width="100" height="100" viewBox="0 0 10 10"></svg>',
        )
    })
})

describe("nestSvg", () => {
    it("keeps the QR vector and positions it", () => {
        const nested = nestSvg(
            '<?xml version="1.0"?><svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
            10,
            20,
            300,
        )
        expect(nested).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" x="10" y="20" width="300" height="300"><rect/></svg>',
        )
        expect(nestSvg("not svg", 0, 0, 1)).toBe("")
    })

    it("frames embed the QR as nested svg, never as an image", () => {
        const design = defaultDesign()
        design.frame.style = "box"
        const svg = framedSvg('<svg width="100" height="100"><rect/></svg>', design, 100)
        expect(svg).not.toContain("<image")
        expect(svg).toContain('viewBox="0 0 100 100"')
    })
})

it("derives file names", () => {
    expect(fileName("Menu du jour (été)", "png")).toBe("menu-du-jour-ete.png")
    expect(fileName("!!!", "svg")).toBe("qr-code.svg")
})
