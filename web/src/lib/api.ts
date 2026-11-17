import { z } from "zod"

import { apiToken } from "@/lib/auth-client"

export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8110/api/v1").replace(
    /\/$/,
    "",
)

/** What a printed code encodes: the API's own short redirect, never the target itself. */
export const SHORT_URL = ((import.meta.env.VITE_SHORT_URL as string | undefined) ?? "http://localhost:8110").replace(
    /\/$/,
    "",
)

export const shortLink = (slug: string) => `${SHORT_URL}/r/${slug}`

export class ApiError extends Error {
    constructor(
        readonly code: string,
        message: string,
        readonly status: number,
        readonly field?: string,
    ) {
        super(message)
    }
}

const errorBody = z.object({ error: z.string(), code: z.string(), field: z.string().optional() })

type Options = {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    body?: unknown
    query?: Record<string, string | number | undefined>
    auth?: boolean
}

async function send(path: string, options: Options, access: string | null): Promise<Response> {
    const url = new URL(`${API_URL}${path}`)
    for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined && value !== "") url.searchParams.set(key, String(value))
    }
    const headers = new Headers({ Accept: "application/json" })
    if (options.body !== undefined) headers.set("Content-Type", "application/json")
    if (access) headers.set("Authorization", `Bearer ${access}`)
    return fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
}

async function authorized(path: string, options: Options): Promise<Response> {
    const auth = options.auth ?? true
    try {
        const token = auth ? await apiToken() : null
        const response = await send(path, options, token)
        if (auth && response.status === 401 && token) {
            // The short JWT may have just expired: ask Better Auth for a fresh one, once.
            const fresh = await apiToken({ force: true })
            if (fresh) return await send(path, options, fresh)
        }
        return response
    } catch {
        throw new ApiError("network", "Connexion à l'API impossible. Vérifiez votre réseau.", 0)
    }
}

/** Every response is validated against its schema before it reaches a component. */
export async function request<T extends z.ZodType>(
    schema: T,
    path: string,
    options: Options = {},
): Promise<z.infer<T>> {
    const response = await authorized(path, options)
    if (!response.ok) {
        const parsed = errorBody.safeParse(await response.json().catch(() => null))
        throw parsed.success
            ? new ApiError(parsed.data.code, parsed.data.error, response.status, parsed.data.field)
            : new ApiError("unknown", `Erreur du serveur (${response.status}).`, response.status)
    }
    const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null)
    return schema.parse(payload)
}

export function errorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
    return error instanceof ApiError ? error.message : fallback
}
