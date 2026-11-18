/**
 * Specialised link types: the person types a handle or a number, the link is built for them. They are stored as
 * ordinary link codes (kind "url"), so they stay editable and tracked; only the form differs.
 */
export const SOCIALS = {
    whatsapp: { title: "WhatsApp", hint: "Ouvre une discussion avec votre numéro", logo: "whatsapp", input: "phone" },
    instagram: { title: "Instagram", hint: "Mène à votre profil Instagram", logo: "instagram", input: "handle" },
    facebook: { title: "Facebook", hint: "Mène à votre page Facebook", logo: "facebook", input: "handle" },
    tiktok: { title: "TikTok", hint: "Mène à votre compte TikTok", logo: "tiktok", input: "handle" },
    youtube: { title: "YouTube", hint: "Mène à votre chaîne YouTube", logo: "youtube", input: "handle" },
    linkedin: { title: "LinkedIn", hint: "Mène à votre profil LinkedIn", logo: null, input: "handle" },
    google: {
        title: "Avis Google",
        hint: "Ouvre le formulaire d'avis de votre établissement",
        logo: null,
        input: "place",
    },
} as const

export type SocialId = keyof typeof SOCIALS
export const SOCIAL_IDS = Object.keys(SOCIALS) as Array<SocialId>
export const isSocialId = (value: unknown): value is SocialId => typeof value === "string" && value in SOCIALS

export type SocialInput = { value: string; message: string }

/** A pasted profile link is kept as it is; a handle ("@nectaras" or "nectaras") becomes the profile link. */
function handle(raw: string): string {
    return raw.trim().replace(/^@+/, "").replace(/\/+$/, "")
}

export function buildSocialUrl(id: SocialId, input: SocialInput): string {
    const raw = input.value.trim()
    if (!raw) return ""
    if (/^https?:\/\//i.test(raw)) return raw
    switch (id) {
        case "whatsapp": {
            const digits = raw.replace(/\D/g, "")
            const text = input.message.trim()
            return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`
        }
        case "instagram":
            return `https://www.instagram.com/${encodeURIComponent(handle(raw))}`
        case "facebook":
            return `https://www.facebook.com/${encodeURIComponent(handle(raw))}`
        case "tiktok":
            return `https://www.tiktok.com/@${encodeURIComponent(handle(raw))}`
        case "youtube":
            return `https://www.youtube.com/@${encodeURIComponent(handle(raw))}`
        case "linkedin":
            return `https://www.linkedin.com/in/${encodeURIComponent(handle(raw))}`
        case "google":
            return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(raw)}`
    }
}

export const SOCIAL_LABELS: Record<SocialId, { label: string; placeholder: string; description?: string }> = {
    whatsapp: { label: "Numéro WhatsApp", placeholder: "+229 97 00 00 00", description: "Avec l'indicatif du pays." },
    instagram: { label: "Nom d'utilisateur Instagram", placeholder: "@votrecompte" },
    facebook: { label: "Nom de la page Facebook", placeholder: "votrepage" },
    tiktok: { label: "Nom d'utilisateur TikTok", placeholder: "@votrecompte" },
    youtube: { label: "Nom de la chaîne YouTube", placeholder: "@votrechaine" },
    linkedin: {
        label: "Identifiant du profil LinkedIn",
        placeholder: "prenom-nom",
        description: "La fin de l'adresse de votre profil.",
    },
    google: {
        label: "Identifiant de lieu Google (Place ID)",
        placeholder: "ChIJ...",
        description: "Trouvez-le avec l'outil « Place ID Finder » de Google, ou collez le lien d'avis de votre fiche.",
    },
}
