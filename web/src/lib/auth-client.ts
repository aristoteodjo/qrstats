import { jwtClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/** Better Auth on this site's own origin: the session lives in an httpOnly cookie, out of reach of scripts. */
export const authClient = createAuthClient({ plugins: [jwtClient()] })

let cached: { token: string; expiresAt: number } | null = null
let pending: Promise<string | null> | null = null

function expiry(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
            exp?: number
        }
        return (payload.exp ?? 0) * 1000
    } catch {
        return 0
    }
}

/** The short JWT the API expects, kept in memory only and renewed a minute before it expires. */
export function apiToken({ force = false } = {}): Promise<string | null> {
    if (typeof window === "undefined") return Promise.resolve(null)
    if (!force && cached && cached.expiresAt - Date.now() > 60_000) return Promise.resolve(cached.token)
    pending ??= authClient
        .token()
        .then(({ data }) => {
            cached = data?.token ? { token: data.token, expiresAt: expiry(data.token) } : null
            return cached?.token ?? null
        })
        .catch(() => null)
        .finally(() => {
            pending = null
        })
    return pending
}

export function forgetApiToken() {
    cached = null
}
