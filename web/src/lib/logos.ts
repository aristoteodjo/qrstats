import {
    siApple,
    siFacebook,
    siGithub,
    siGmail,
    siInstagram,
    siNetflix,
    siPinterest,
    siSnapchat,
    siSpotify,
    siTelegram,
    siTiktok,
    siWhatsapp,
    siX,
    siYoutube,
} from "simple-icons"
import type { SimpleIcon } from "simple-icons"

import { svgDataUrl } from "@/lib/qr-render"

/** Brand marks from simple-icons (CC0), drawn white on their brand colour, for the logo picker. */
const ICONS: Record<string, SimpleIcon> = {
    x: siX,
    youtube: siYoutube,
    instagram: siInstagram,
    tiktok: siTiktok,
    facebook: siFacebook,
    whatsapp: siWhatsapp,
    gmail: siGmail,
    apple: siApple,
    netflix: siNetflix,
    pinterest: siPinterest,
    telegram: siTelegram,
    spotify: siSpotify,
    snapchat: siSnapchat,
    github: siGithub,
}

export const LOGO_PRESETS = Object.entries(ICONS).map(([id, icon]) => ({ id, title: icon.title }))

export function presetLogo(id: string | null): string | null {
    const icon = id ? ICONS[id] : undefined
    if (!icon) return null
    const light = ["FFFC00"].includes(icon.hex)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 36 36"><circle cx="12" cy="12" r="18" fill="#${icon.hex}"/><path d="${icon.path}" fill="${light ? "#000000" : "#ffffff"}"/></svg>`
    return svgDataUrl(svg)
}

/**
 * Prepares an uploaded logo for the design JSON. An SVG stays vector (sharp at any export size); a bitmap is scaled
 * to 1024 px at most and stored as WebP, sharp enough for a 4096 px export while keeping the design light.
 */
export async function resizeLogo(file: File): Promise<string> {
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) throw new Error("Format accepté : JPG, PNG, SVG ou WebP.")
    if (file.size > 5 * 1024 * 1024) throw new Error("Image trop lourde (5 Mo au maximum).")
    if (file.type === "image/svg+xml") {
        if (file.size > 300 * 1024) throw new Error("SVG trop lourd (300 Ko au maximum).")
        const bytes = new Uint8Array(await file.arrayBuffer())
        let binary = ""
        for (const byte of bytes) binary += String.fromCharCode(byte)
        return `data:image/svg+xml;base64,${btoa(binary)}`
    }
    const url = URL.createObjectURL(file)
    try {
        const image = new Image()
        image.src = url
        await image.decode()
        const side = 1024
        const scale = Math.min(side / (image.naturalWidth || side), side / (image.naturalHeight || side), 1)
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round((image.naturalWidth || side) * scale))
        canvas.height = Math.max(1, Math.round((image.naturalHeight || side) * scale))
        const context = canvas.getContext("2d")
        if (!context) throw new Error("Canvas indisponible.")
        context.imageSmoothingQuality = "high"
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL("image/webp", 0.92)
    } catch {
        throw new Error("Image illisible.")
    } finally {
        URL.revokeObjectURL(url)
    }
}

/** The logo image a design shows: an upload wins over a preset. */
export function designLogo(logo: { preset: string | null; image: string | null }): string | null {
    return logo.image ?? presetLogo(logo.preset)
}
