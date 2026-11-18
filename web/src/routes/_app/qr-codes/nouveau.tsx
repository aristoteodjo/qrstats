import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { QrEditor } from "@/components/qr/qr-editor"
import { editorSearch } from "@/lib/editor-search"

export const Route = createFileRoute("/_app/qr-codes/nouveau")({
    validateSearch: editorSearch,
    head: () => ({ meta: [{ title: "Nouveau QR code | qrstats" }] }),
    component: NewQr,
})

function NewQr() {
    const { etape, type } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    return (
        <QrEditor
            mode="create"
            step={etape}
            kindHint={type}
            onRoute={({ step, kind }) => void navigate({ search: { etape: step, type: kind } })}
        />
    )
}
