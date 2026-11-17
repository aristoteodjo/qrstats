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

/** Shrinks an uploaded image to a 256 px PNG data URL: the design travels in JSON and must stay small. */
export async function resizeLogo(file: File): Promise<string> {
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) throw new Error("Format accepté : JPG, PNG, SVG ou WebP.")
    if (file.size > 5 * 1024 * 1024) throw new Error("Image trop lourde (5 Mo au maximum).")
    const url = URL.createObjectURL(file)
    try {
        const image = new Image()
        image.src = url
        await image.decode()
        const side = 256
        const scale = Math.min(side / (image.naturalWidth || side), side / (image.naturalHeight || side), 1)
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round((image.naturalWidth || side) * scale))
        canvas.height = Math.max(1, Math.round((image.naturalHeight || side) * scale))
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL("image/png")
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
