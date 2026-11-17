import { z } from "zod"

/** Same-site paths only: "//host" and "/\host" are read by browsers as another site. Anything else is dropped. */
export const safeRedirect = z
    .string()
    .regex(/^\/(?![/\\])/)
    .optional()
    .catch(undefined)

/** Resolves a requested return path against `origin`; anything that would land on another origin falls back to "/". */
export function sameOriginPath(path: string | undefined, origin: string): string {
    if (!path) return "/"
    try {
        // URL() strips tabs and newlines as browsers do, so "/\t/evil.com" is caught here as the "//evil.com" it becomes.
        const url = new URL(path, origin)
        return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : "/"
    } catch {
        return "/"
    }
}
