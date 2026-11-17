import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

import { AppModal } from "@/components/shared/app-modal"
import { Button } from "@/components/ui/button"
import { useAppForm } from "@/hooks/form"
import { errorMessage } from "@/lib/api"
import { isQr, updateQr } from "@/lib/qrcodes"

export function RenameModal({
    qr,
    open,
    onOpenChange,
}: {
    qr: { id: string; name: string }
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const queryClient = useQueryClient()
    const rename = useMutation({
        mutationFn: (name: string) => updateQr(qr.id, { name }),
        onSuccess: (saved) => {
            if (!isQr(saved)) return
            void queryClient.invalidateQueries({ queryKey: ["qrcodes"] })
            toast.success("QR code renommé.")
            onOpenChange(false)
        },
    })
    const form = useAppForm({
        defaultValues: { name: qr.name },
        validators: {
            onSubmit: z.object({
                name: z.string().trim().min(1, "Le nom est obligatoire.").max(120, "120 caractères au maximum."),
            }),
        },
        onSubmit: ({ value }) => rename.mutateAsync(value.name.trim()).catch(() => undefined),
    })
    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            pending={rename.isPending}
            title="Renommer le QR code"
            size="sm"
        >
            <form
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault()
                    void form.handleSubmit()
                }}
            >
                <form.AppField name="name">
                    {(field) => <field.TextField label="Nom" className="h-11" maxLength={120} />}
                </form.AppField>
                {rename.error ? (
                    <p role="alert" className="text-destructive text-sm">
                        {errorMessage(rename.error)}
                    </p>
                ) : null}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        disabled={rename.isPending}
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </Button>
                    <form.AppForm>
                        <form.SubmitButton pending={rename.isPending} className="min-h-11">
                            Enregistrer
                        </form.SubmitButton>
                    </form.AppForm>
                </div>
            </form>
        </AppModal>
    )
}
