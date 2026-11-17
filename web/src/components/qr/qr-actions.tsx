import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { AppModal } from "@/components/shared/app-modal"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api"
import { deleteQr, isQr, updateQr } from "@/lib/qrcodes"
import type { QRCode } from "@/lib/qr"

/** Pause / reactivation: a paused code still opens, on a page saying it is disabled, and counts no scan. */
export function useToggleStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (qr: Pick<QRCode, "id" | "status">) =>
            updateQr(qr.id, { status: qr.status === "active" ? "paused" : "active" }),
        onSuccess: (saved) => {
            if (!isQr(saved)) return
            void queryClient.invalidateQueries({ queryKey: ["qrcodes"] })
            toast.success(saved.status === "active" ? "QR code réactivé." : "QR code mis en pause.")
        },
        onError: (error) => toast.error(errorMessage(error)),
    })
}

export function DeleteQrModal({
    qr,
    open,
    onOpenChange,
    afterDelete,
}: {
    qr: Pick<QRCode, "id" | "name">
    open: boolean
    onOpenChange: (open: boolean) => void
    afterDelete?: "list"
}) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const remove = useMutation({
        mutationFn: () => deleteQr(qr.id),
        onSuccess: () => {
            onOpenChange(false)
            queryClient.removeQueries({ queryKey: ["qrcodes", "detail", qr.id] })
            void queryClient.invalidateQueries({ queryKey: ["qrcodes", "list"] })
            void queryClient.invalidateQueries({ queryKey: ["stats"] })
            toast.success("QR code supprimé.")
            if (afterDelete === "list") void navigate({ to: "/qr-codes" })
        },
    })
    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            pending={remove.isPending}
            title={`Supprimer « ${qr.name} » ?`}
            description="Les exemplaires imprimés ne mèneront plus nulle part et ses statistiques seront effacées. Cette action est définitive."
            footer={
                <>
                    <Button variant="outline" className="min-h-11" disabled={remove.isPending} onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button variant="destructive" className="min-h-11" disabled={remove.isPending} onClick={() => remove.mutate()}>
                        {remove.isPending ? "Suppression…" : "Supprimer"}
                    </Button>
                </>
            }
        >
            {remove.error ? (
                <p role="alert" className="text-destructive text-sm">
                    {errorMessage(remove.error)}
                </p>
            ) : null}
        </AppModal>
    )
}

export function useDeleteDialog() {
    const [target, setTarget] = useState<Pick<QRCode, "id" | "name"> | null>(null)
    return { target, open: (qr: Pick<QRCode, "id" | "name">) => setTarget(qr), close: () => setTarget(null) }
}
