import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { QrEditor } from "@/components/qr/qr-editor"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api"
import { editorSearch } from "@/lib/editor-search"
import { qrDetailQuery } from "@/lib/qrcodes"

export const Route = createFileRoute("/_app/qr-codes/$id/modifier")({
    validateSearch: editorSearch,
    head: () => ({ meta: [{ title: "Modifier le QR code | qrstats" }] }),
    component: EditQr,
})

function EditQr() {
    const { id } = Route.useParams()
    const { etape, type } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    const qr = useQuery(qrDetailQuery(id))
    if (qr.isPending) return <Skeleton className="m-6 h-96" />
    if (qr.isError) {
        return (
            <p role="alert" className="text-destructive p-6 text-sm">
                {errorMessage(qr.error, "QR code introuvable.")}
            </p>
        )
    }
    return (
        <QrEditor
            key={qr.data.updated_at}
            mode="edit"
            existing={qr.data}
            step={etape}
            kindHint={type}
            onRoute={({ step, kind }) => void navigate({ search: { etape: step, type: kind } })}
        />
    )
}
