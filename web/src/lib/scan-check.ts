/**
 * Scannability check, done in the browser: the rendered code is decoded at the sizes a phone actually sees it
 * (small sticker seen from afar, then normal). A code that only decodes large is risky once printed small.
 */
export const CHECK_SIZES = [200, 400] as const

export type CheckResult = { size: number; decoded: string | null }
export type Verdict = { level: "good" | "fragile" | "unreadable" | "mismatch"; message: string }

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
    const [la, lb] = [luminance(a), luminance(b)]
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * The weakest contrast between any dark part of the code (dots, corners) and its ground. A transparent ground is
 * judged against white paper. Lighter dots than ground count as no contrast: many phones do not read inverted codes.
 */
export function designContrast(design: {
    dots: { color: string }
    cornersSquare: { color: string }
    cornersDot: { color: string }
    background: { color: string; transparent: boolean }
}): number {
    const ground = design.background.transparent ? "#ffffff" : design.background.color
    return Math.min(
        ...[design.dots.color, design.cornersSquare.color, design.cornersDot.color].map((ink) =>
            luminance(ink) >= luminance(ground) ? 1 : contrast(ink, ground),
        ),
    )
}

/**
 * A decoder reads a perfect image far better than a camera reads paper under a lamp: decoding proves the data is
 * right, contrast decides whether a phone will manage it.
 */
export function verdict(results: Array<CheckResult>, expected: string, inkContrast = 21): Verdict {
    if (inkContrast < 2.5) {
        return {
            level: "unreadable",
            message:
                "Contraste trop faible : les téléphones ne liront pas ce code. Foncez les points ou éclaircissez le fond.",
        }
    }
    const read = results.filter((r) => r.decoded !== null)
    if (read.length === 0) {
        return {
            level: "unreadable",
            message: "Illisible : augmentez le contraste, réduisez le logo ou choisissez un motif plus simple.",
        }
    }
    if (read.some((r) => r.decoded !== expected)) {
        return { level: "mismatch", message: "Le code lu ne correspond pas au contenu : ne l'imprimez pas." }
    }
    if (read.length < results.length || inkContrast < 4) {
        return {
            level: "fragile",
            message: "Lisible de près seulement : imprimez-le à 3 cm de côté au moins, ou allégez le design.",
        }
    }
    return { level: "good", message: "Lisible : testé à plusieurs tailles." }
}

/** Decodes an SVG document at each size. Needs a browser (canvas). */
export async function checkSvg(svg: string, sizes: ReadonlyArray<number> = CHECK_SIZES): Promise<Array<CheckResult>> {
    const [{ default: jsQR }, { svgToCanvas }] = await Promise.all([import("jsqr"), import("@/lib/qr-render")])
    const results: Array<CheckResult> = []
    for (const size of sizes) {
        const canvas = await svgToCanvas(svg, size, "#ffffff")
        const context = canvas.getContext("2d")
        if (!context) continue
        const image = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })
        results.push({ size, decoded: code ? code.data : null })
    }
    return results
}
