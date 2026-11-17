import { createFileRoute } from "@tanstack/react-router"

import { QrEditor } from "@/components/qr/qr-editor"

export const Route = createFileRoute("/_app/qr-codes/nouveau")({
    head: () => ({ meta: [{ title: "Nouveau QR code | qrstats" }] }),
    component: () => <QrEditor />,
})
