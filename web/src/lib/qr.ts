import { z } from "zod"

/** Kinds mirror the API (internal/service/content.go). Only Wi-Fi is static: its network lives in the pattern. */
export const KINDS = ["url", "text", "vcard", "wifi", "email", "phone", "sms"] as const
export type Kind = (typeof KINDS)[number]

export const isDynamic = (kind: Kind) => kind !== "wifi"

export const KIND_LABELS: Record<Kind, { title: string; hint: string }> = {
    url: { title: "Site web", hint: "Renvoie vers une adresse, modifiable à tout moment" },
    text: { title: "Texte", hint: "Affiche un message sur une page" },
    vcard: { title: "Carte de visite", hint: "Partage vos coordonnées à enregistrer" },
    email: { title: "E-mail", hint: "Ouvre un e-mail prérempli" },
    phone: { title: "Appel", hint: "Lance un appel vers un numéro" },
    sms: { title: "SMS", hint: "Prépare un SMS vers un numéro" },
    wifi: { title: "Wi-Fi", hint: "Connecte au réseau sans saisie (code statique)" },
}

export const urlContent = z.object({
    url: z.string(),
    utm_source: z.string().catch(""),
    utm_medium: z.string().catch(""),
    utm_campaign: z.string().catch(""),
})
export const textContent = z.object({ text: z.string() })
export const vcardContent = z.object({
    first_name: z.string().catch(""),
    last_name: z.string().catch(""),
    organization: z.string().catch(""),
    title: z.string().catch(""),
    phone: z.string().catch(""),
    email: z.string().catch(""),
    website: z.string().catch(""),
    address: z.string().catch(""),
    note: z.string().catch(""),
})
export const wifiContent = z.object({
    ssid: z.string(),
    password: z.string().catch(""),
    encryption: z.enum(["WPA", "WEP", "nopass"]).catch("WPA"),
    hidden: z.boolean().catch(false),
})
export const emailContent = z.object({ to: z.string(), subject: z.string().catch(""), body: z.string().catch("") })
export const phoneContent = z.object({ phone: z.string() })
export const smsContent = z.object({ phone: z.string(), message: z.string().catch("") })

export type Contents = {
    url: z.infer<typeof urlContent>
    text: z.infer<typeof textContent>
    vcard: z.infer<typeof vcardContent>
    wifi: z.infer<typeof wifiContent>
    email: z.infer<typeof emailContent>
    phone: z.infer<typeof phoneContent>
    sms: z.infer<typeof smsContent>
}

export const CONTENT_SCHEMAS = {
    url: urlContent,
    text: textContent,
    vcard: vcardContent,
    wifi: wifiContent,
    email: emailContent,
    phone: phoneContent,
    sms: smsContent,
} as const

export function emptyContent<TKind extends Kind>(kind: TKind): Contents[TKind] {
    const empty: Contents = {
        url: { url: "", utm_source: "", utm_medium: "", utm_campaign: "" },
        text: { text: "" },
        vcard: {
            first_name: "",
            last_name: "",
            organization: "",
            title: "",
            phone: "",
            email: "",
            website: "",
            address: "",
            note: "",
        },
        wifi: { ssid: "", password: "", encryption: "WPA", hidden: false },
        email: { to: "", subject: "", body: "" },
        phone: { phone: "" },
        sms: { phone: "", message: "" },
    }
    return empty[kind]
}

/** Reads stored content for a kind, falling back to an empty one rather than crashing on an old shape. */
export function readContent<TKind extends Kind>(kind: TKind, raw: unknown): Contents[TKind] {
    const parsed = CONTENT_SCHEMAS[kind].safeParse(raw)
    return parsed.success ? (parsed.data as Contents[TKind]) : emptyContent(kind)
}

const escapeWifi = (value: string) => value.replace(/([\\;,:"])/g, "\\$1")

/** The WIFI: payload phone cameras understand (ZXing format). */
export function wifiPayload(content: Contents["wifi"]): string {
    const password = content.encryption === "nopass" ? "" : `P:${escapeWifi(content.password)};`
    return `WIFI:T:${content.encryption};S:${escapeWifi(content.ssid)};${password}${content.hidden ? "H:true;" : ""};`
}

const escapeVcard = (value: string) =>
    value
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/([,;])/g, "\\$1")

/** A vCard 3.0, read by iOS and Android contacts. Empty fields are left out. */
export function vcardText(c: Contents["vcard"]): string {
    const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVcard(c.last_name)};${escapeVcard(c.first_name)};;;`,
        `FN:${escapeVcard([c.first_name, c.last_name].filter(Boolean).join(" ") || c.organization)}`,
    ]
    if (c.organization) lines.push(`ORG:${escapeVcard(c.organization)}`)
    if (c.title) lines.push(`TITLE:${escapeVcard(c.title)}`)
    if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone.replace(/[^\d+]/g, "")}`)
    if (c.email) lines.push(`EMAIL:${escapeVcard(c.email)}`)
    if (c.website) lines.push(`URL:${escapeVcard(c.website)}`)
    if (c.address) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(c.address)};;;;`)
    if (c.note) lines.push(`NOTE:${escapeVcard(c.note)}`)
    lines.push("END:VCARD")
    return lines.join("\r\n")
}

/** Where a landing page sends the visitor for the action kinds. */
export function actionHref(kind: Kind, raw: unknown): string | null {
    switch (kind) {
        case "email": {
            const c = readContent("email", raw)
            const params = new URLSearchParams()
            if (c.subject) params.set("subject", c.subject)
            if (c.body) params.set("body", c.body)
            const query = params.toString().replace(/\+/g, "%20")
            return `mailto:${c.to}${query ? `?${query}` : ""}`
        }
        case "phone":
            return `tel:${readContent("phone", raw).phone.replace(/[^\d+]/g, "")}`
        case "sms": {
            const c = readContent("sms", raw)
            const phone = c.phone.replace(/[^\d+]/g, "")
            return c.message ? `sms:${phone}?body=${encodeURIComponent(c.message)}` : `sms:${phone}`
        }
        default:
            return null
    }
}

/** One line describing what a code leads to, for lists and headers. */
export function summary(kind: Kind, raw: unknown): string {
    switch (kind) {
        case "url":
            return readContent("url", raw).url
        case "text":
            return readContent("text", raw).text.slice(0, 80)
        case "vcard": {
            const c = readContent("vcard", raw)
            return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.organization
        }
        case "wifi":
            return readContent("wifi", raw).ssid
        case "email":
            return readContent("email", raw).to
        case "phone":
            return readContent("phone", raw).phone
        case "sms":
            return readContent("sms", raw).phone
    }
}

/* Design: the web app owns its shape, the API stores it as an opaque JSON object. */

export const DOT_STYLES = ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"] as const
export const CORNER_SQUARE_STYLES = ["default", "square", "dot", "extra-rounded"] as const
export const CORNER_DOT_STYLES = ["default", "square", "dot"] as const
export const FRAME_STYLES = ["none", "label", "box", "badge", "speech"] as const

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const SHAPES = ["square", "circle"] as const

export const designSchema = z.object({
    shape: z.enum(SHAPES).catch("square"),
    dots: z
        .object({ style: z.enum(DOT_STYLES).catch("square"), color: hex.catch("#000000") })
        .catch({ style: "square", color: "#000000" }),
    background: z
        .object({ color: hex.catch("#ffffff"), transparent: z.boolean().catch(false) })
        .catch({ color: "#ffffff", transparent: false }),
    cornersSquare: z
        .object({ style: z.enum(CORNER_SQUARE_STYLES).catch("square"), color: hex.catch("#000000") })
        .catch({ style: "square", color: "#000000" }),
    cornersDot: z
        .object({ style: z.enum(CORNER_DOT_STYLES).catch("square"), color: hex.catch("#000000") })
        .catch({ style: "square", color: "#000000" }),
    logo: z
        .object({
            preset: z.string().nullable().catch(null),
            image: z
                .string()
                .regex(/^data:image\/(png|jpeg|svg\+xml|webp);base64,/)
                .nullable()
                .catch(null),
            size: z.number().min(0.15).max(0.4).catch(0.3),
        })
        .catch({ preset: null, image: null, size: 0.3 }),
    frame: z
        .object({
            style: z.enum(FRAME_STYLES).catch("none"),
            text: z.string().max(24).catch("Scannez-moi !"),
            color: hex.catch("#000000"),
        })
        .catch({ style: "none", text: "Scannez-moi !", color: "#000000" }),
    // An AI artwork that already encodes the code's short link: it replaces the drawn pattern entirely.
    art: z
        .object({
            image: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/),
            prompt: z.string().max(400).catch(""),
        })
        .nullable()
        .catch(null),
})

export type Design = z.infer<typeof designSchema>

export const defaultDesign = (): Design => designSchema.parse({})

export function readDesign(raw: unknown): Design {
    return designSchema.parse(raw ?? {})
}

/** Kinds open without an account: the content is written into the pattern itself (static, neither editable nor tracked). */
export const GUEST_KINDS = ["url", "text", "wifi", "email", "phone"] as const satisfies ReadonlyArray<Kind>
export type GuestKind = (typeof GUEST_KINDS)[number]
export const isGuestKind = (kind: Kind): kind is GuestKind => (GUEST_KINDS as ReadonlyArray<Kind>).includes(kind)

/** Descriptions true for a static code: no page, nothing to change later. */
export const GUEST_HINTS: Record<GuestKind, string> = {
    url: "Ouvre une adresse web (fixée une fois pour toutes)",
    text: "Affiche le texte directement sur le téléphone",
    wifi: "Connecte au réseau sans saisie",
    email: "Ouvre un e-mail prérempli",
    phone: "Lance un appel vers un numéro",
}

/** The content itself, as phone cameras read it: what a static code (no account) encodes. */
export function staticPayload(kind: Kind, raw: unknown): string {
    switch (kind) {
        case "url": {
            const url = readContent("url", raw).url.trim()
            return url && !url.includes("://") ? `https://${url}` : url
        }
        case "text":
            return readContent("text", raw).text
        case "wifi":
            return wifiPayload(readContent("wifi", raw))
        case "vcard":
            return vcardText(readContent("vcard", raw))
        case "sms": {
            const c = readContent("sms", raw)
            return `SMSTO:${c.phone.replace(/[^\d+]/g, "")}:${c.message}`
        }
        case "email":
        case "phone":
            return actionHref(kind, raw) ?? ""
    }
}

/** What the printed pattern encodes: the short redirect for every dynamic kind, the network itself for Wi-Fi. */
export function qrPayload(kind: Kind, content: unknown, link: string): string {
    return kind === "wifi" ? wifiPayload(readContent("wifi", content)) : link
}

/* API shapes. */

export const qrCodeSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    kind: z.enum(KINDS),
    content: z.unknown(),
    design: z.unknown(),
    status: z.enum(["active", "paused"]),
    rules: z.array(z.object({ field: z.string(), value: z.string(), url: z.string() })).catch([]),
    protected: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
})
export type QRCode = z.infer<typeof qrCodeSchema>

export const qrSummarySchema = qrCodeSchema.extend({
    scans: z.number(),
    last_scan_at: z.string().nullable(),
})
export type QRSummary = z.infer<typeof qrSummarySchema>

export const pageSchema = <T extends z.ZodType>(item: T) =>
    z.object({
        data: z.array(item),
        total: z.number(),
        page: z.number(),
        per_page: z.number(),
        pages: z.number(),
    })

export const publicViewSchema = z.object({
    kind: z.enum(KINDS),
    name: z.string(),
    status: z.enum(["active", "paused"]),
    locked: z.boolean(),
    content: z.unknown().optional(),
    target: z.string().optional(),
})
export type PublicView = z.infer<typeof publicViewSchema>
