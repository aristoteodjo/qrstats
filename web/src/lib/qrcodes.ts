import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { request } from "@/lib/api"
import { pageSchema, publicViewSchema, qrCodeSchema, qrSummarySchema } from "@/lib/qr"
import type { Design, Kind } from "@/lib/qr"

export type ListParams = { page: number; q?: string; status?: "active" | "paused" }

export const qrListQuery = (params: ListParams) =>
    queryOptions({
        queryKey: ["qrcodes", "list", params],
        queryFn: () =>
            request(pageSchema(qrSummarySchema), "/qrcodes", {
                query: { page: params.page, per_page: 25, q: params.q, status: params.status },
            }),
        placeholderData: keepPreviousData,
    })

export const qrDetailQuery = (id: string) =>
    queryOptions({
        queryKey: ["qrcodes", "detail", id],
        queryFn: () => request(qrCodeSchema, `/qrcodes/${encodeURIComponent(id)}`),
    })

export const publicQrQuery = (slug: string) =>
    queryOptions({
        queryKey: ["public", slug],
        queryFn: () => request(publicViewSchema, `/public/qr/${encodeURIComponent(slug)}`, { auth: false }),
        retry: false,
    })

export type QRInput = { name: string; kind: Kind; content: unknown; design: Design; password?: string }

export const createQr = (input: QRInput) => request(qrCodeSchema, "/qrcodes", { method: "POST", body: input })

export type QRPatch = Partial<{
    name: string
    kind: Kind
    content: unknown
    design: Design
    status: "active" | "paused"
    password: string
}>

export const updateQr = (id: string, patch: QRPatch) =>
    request(qrCodeSchema, `/qrcodes/${encodeURIComponent(id)}`, { method: "PATCH", body: patch })

export const deleteQr = (id: string) =>
    request(z.null(), `/qrcodes/${encodeURIComponent(id)}`, { method: "DELETE" })

export const unlockQr = (slug: string, password: string) =>
    request(publicViewSchema, `/public/qr/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        body: { password },
        auth: false,
    })

/** Narrows a mutation result before acting on it (onSuccess never trusts the shape blindly). */
export const isQr = (value: unknown): value is z.infer<typeof qrCodeSchema> => qrCodeSchema.safeParse(value).success
