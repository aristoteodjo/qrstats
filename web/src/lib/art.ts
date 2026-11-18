import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { request } from "@/lib/api"

export const ART_STYLES = [
    { value: "readable", label: "Lisible", hint: "Le motif reste bien visible" },
    { value: "balanced", label: "Équilibré", hint: "Image et motif à parts égales" },
    { value: "artistic", label: "Artistique", hint: "L'image domine, à vérifier au scan" },
] as const
export type ArtStyle = (typeof ART_STYLES)[number]["value"]

export const ART_IDEAS = [
    "un village de montagne au coucher du soleil, aquarelle",
    "une forêt tropicale luxuriante, lumière douce",
    "une ville futuriste la nuit, néons bleus",
    "des fleurs de printemps vues de dessus, photo détaillée",
    "un marché africain coloré, illustration",
] as const

export const artQuotaSchema = z.object({
    available: z.boolean(),
    limit: z.number(),
    used: z.number(),
    remaining: z.number(),
})
export const artStartedSchema = z.object({ id: z.string(), status: z.string(), quota: artQuotaSchema })
export const artResultSchema = z.object({
    id: z.string(),
    status: z.enum(["pending", "succeeded", "failed"]),
    image: z.string().optional(),
    error: z.string().optional(),
})
export type ArtResult = z.infer<typeof artResultSchema>

export const artQuotaQuery = () =>
    queryOptions({ queryKey: ["art", "quota"], queryFn: () => request(artQuotaSchema, "/art/quota") })

export const startArt = (codeId: string, input: { prompt: string; style: ArtStyle }) =>
    request(artStartedSchema, `/qrcodes/${encodeURIComponent(codeId)}/art`, { method: "POST", body: input })

/** Polls an artwork every 3 s until it is ready, failed, or the API errors (a run takes 10 to 40 s). */
export const artResultQuery = (id: string) =>
    queryOptions({
        queryKey: ["art", "result", id],
        queryFn: () => request(artResultSchema, `/art/${encodeURIComponent(id)}`),
        refetchInterval: (query) =>
            query.state.status === "error" || (query.state.data && query.state.data.status !== "pending")
                ? false
                : 3000,
        retry: false,
        staleTime: Infinity,
    })

/** Re-encodes the artwork as WebP, about five times lighter than the provider's PNG, so it fits in the design. */
export async function compressArt(dataUrl: string): Promise<string> {
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas indisponible.")
    context.drawImage(image, 0, 0)
    return canvas.toDataURL("image/webp", 0.92)
}
