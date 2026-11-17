import type { Design } from "@/lib/qr"

/** Options for qr-code-styling, from a design. Pure, so the mapping is tested without a canvas. */
export function stylingOptions(design: Design, data: string, logo: string | null, size = 600) {
    return {
        type: "svg" as const,
        width: size,
        height: size,
        margin: 8,
        data,
        image: logo ?? undefined,
        // A logo hides modules: the highest correction level keeps the code readable.
        qrOptions: { errorCorrectionLevel: logo ? ("H" as const) : ("Q" as const) },
        imageOptions: { hideBackgroundDots: true, imageSize: design.logo.size, margin: 6, crossOrigin: "anonymous" },
        dotsOptions: { type: design.dots.style, color: design.dots.color },
        backgroundOptions: { color: design.background.transparent ? "transparent" : design.background.color },
        cornersSquareOptions:
            design.cornersSquare.style === "default"
                ? { color: design.cornersSquare.color }
                : { type: design.cornersSquare.style, color: design.cornersSquare.color },
        cornersDotOptions:
            design.cornersDot.style === "default"
                ? { color: design.cornersDot.color }
                : { type: design.cornersDot.style, color: design.cornersDot.color },
    }
}

const escapeXml = (value: string) =>
    value.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!)

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/**
 * Wraps the QR (an SVG document) in its frame. The QR keeps its own size; the frame adds room around it.
 * Every frame keeps a quiet zone of background colour around the pattern.
 */
export function framedSvg(qrSvg: string, design: Design, qrSize: number): string {
    const { style, text, color } = design.frame
    const background = design.background.transparent ? "none" : design.background.color
    const inner = `<image href="${svgDataUrl(qrSvg)}" width="${qrSize}" height="${qrSize}"`
    if (style === "none") {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">${inner} x="0" y="0"/></svg>`
    }
    const pad = Math.round(qrSize * 0.06)
    const band = Math.round(qrSize * 0.2)
    const font = Math.round(band * 0.42)
    const width = qrSize + pad * 2
    const label = escapeXml(text || "Scannez-moi !")
    const textOn = (fill: string, y: number) =>
        `<text x="${width / 2}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="Inter Tight, Helvetica, Arial, sans-serif" font-weight="700" font-size="${font}" fill="${fill}">${label}</text>`

    switch (style) {
        case "label": {
            const height = qrSize + pad * 2 + band
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background === "none" ? "#ffffff" : background}"/>${inner} x="${pad}" y="${pad}"/>${textOn(color, qrSize + pad + band / 2)}</svg>`
        }
        case "box": {
            const stroke = Math.round(pad * 0.45)
            const height = qrSize + pad * 2 + band
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="${stroke / 2}" y="${stroke / 2}" width="${width - stroke}" height="${height - stroke}" rx="${pad}" fill="#ffffff" stroke="${color}" stroke-width="${stroke}"/>${inner} x="${pad}" y="${pad}"/><rect x="${stroke / 2}" y="${qrSize + pad * 1.5}" width="${width - stroke}" height="${band + pad / 2 - stroke / 2}" fill="${color}"/>${textOn("#ffffff", qrSize + pad * 1.5 + band / 2)}</svg>`
        }
        case "badge": {
            const height = qrSize + pad * 3 + band
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="${pad * 1.5}" fill="${color}"/><rect x="${pad / 2}" y="${pad / 2}" width="${width - pad}" height="${qrSize + pad}" rx="${pad}" fill="#ffffff"/>${inner} x="${pad}" y="${pad}"/>${textOn("#ffffff", qrSize + pad * 2 + band / 2)}</svg>`
        }
        case "speech": {
            const tail = Math.round(band * 0.4)
            const top = band + tail
            const height = top + qrSize + pad * 2
            const mid = width / 2
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${band}" rx="${band / 2}" fill="${color}"/><path d="M${mid - tail} ${band - 1} L${mid} ${band + tail} L${mid + tail} ${band - 1} Z" fill="${color}"/>${textOn("#ffffff", band / 2)}<rect x="0" y="${top}" width="${width}" height="${qrSize + pad * 2}" rx="${pad}" fill="${background === "none" ? "#ffffff" : background}"/>${inner} x="${pad}" y="${top + pad}"/></svg>`
        }
    }
}

/** Rasterizes an SVG document to a PNG blob at `width` pixels wide. */
export async function svgToPng(svg: string, width: number): Promise<Blob> {
    const image = new Image()
    image.decoding = "async"
    image.src = svgDataUrl(svg)
    await image.decode()
    const ratio = image.naturalHeight / image.naturalWidth || 1
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = Math.round(width * ratio)
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas indisponible.")
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export impossible."))), "image/png"),
    )
}

export function downloadBlob(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A file name from a code's name: "Menu du jour" is "menu-du-jour". */
export function fileName(name: string, extension: string): string {
    const base = name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    return `${base || "qr-code"}.${extension}`
}
