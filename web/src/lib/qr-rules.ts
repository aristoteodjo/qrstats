import type { Kind } from "@/lib/qr"

/** Client-side checks mirroring the API (internal/service/content.go), so errors show before a round trip. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[0-9][0-9 .\-()]{3,24}$/

export function urlProblem(value: string): string | undefined {
    const raw = value.trim()
    if (!raw) return "L'adresse est obligatoire."
    const candidate = raw.includes("://") ? raw : `https://${raw}`
    try {
        const url = new URL(candidate)
        if (url.protocol !== "http:" && url.protocol !== "https:") return "Seules les adresses http et https sont acceptées."
        if (!url.hostname.includes(".") && url.hostname !== "localhost") return "Adresse invalide."
    } catch {
        return "Adresse invalide."
    }
    return undefined
}

export const emailProblem = (value: string, required = true) =>
    !value.trim() ? (required ? "L'adresse e-mail est obligatoire." : undefined) : EMAIL.test(value.trim()) ? undefined : "Adresse e-mail invalide."

export const phoneProblem = (value: string, required = true) =>
    !value.trim() ? (required ? "Le numéro est obligatoire." : undefined) : PHONE.test(value.trim()) ? undefined : "Numéro de téléphone invalide."

export const requiredProblem = (value: string, message: string) => (value.trim() ? undefined : message)

/** Only the fields of the kind being edited are checked; the others keep whatever was typed. */
export const forKind = (current: unknown, kind: Kind, check: () => string | undefined) =>
    current === kind ? check() : undefined
