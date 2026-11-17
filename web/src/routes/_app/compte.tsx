import { createFileRoute } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

import { PageContent, PageHeader } from "@/components/dash/page-header"
import { useAppForm } from "@/hooks/form"
import { useSession } from "@/hooks/use-session"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_app/compte")({
    head: () => ({ meta: [{ title: "Compte | qrstats" }] }),
    component: Account,
})

async function unwrap<T>(call: Promise<{ data: T | null; error: { message?: string } | null }>): Promise<T> {
    const { data, error } = await call
    if (error || !data) throw new Error(error?.message ?? "L'opération a échoué.")
    return data
}

function Account() {
    const { user } = useSession()
    return (
        <>
            <PageHeader title="Compte" description={user?.email} />
            <PageContent>
                <div className="grid max-w-2xl gap-6">
                    <ProfileForm name={user?.name ?? ""} />
                    <PasswordForm />
                </div>
            </PageContent>
        </>
    )
}

function ProfileForm({ name }: { name: string }) {
    const update = useMutation({
        mutationFn: (value: { name: string }) => unwrap(authClient.updateUser({ name: value.name })),
        onSuccess: (data) => {
            if (z.object({ status: z.boolean() }).safeParse(data).success) toast.success("Profil mis à jour.")
        },
    })
    const form = useAppForm({
        defaultValues: { name },
        validators: { onSubmit: z.object({ name: z.string().trim().min(2, "Votre nom est requis.").max(80) }) },
        onSubmit: ({ value }) => update.mutateAsync(value).catch(() => undefined),
    })
    return (
        <section className="bg-card grid gap-4 rounded-xl border p-5 sm:p-6">
            <h2 className="font-heading text-lg font-semibold">Profil</h2>
            <form
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault()
                    void form.handleSubmit()
                }}
            >
                <form.AppField name="name">{(field) => <field.TextField label="Nom" autoComplete="name" className="h-11" />}</form.AppField>
                {update.error ? (
                    <p role="alert" className="text-destructive text-sm">
                        {update.error.message}
                    </p>
                ) : null}
                <form.AppForm>
                    <form.SubmitButton pending={update.isPending} className="min-h-11 justify-self-start">
                        Enregistrer
                    </form.SubmitButton>
                </form.AppForm>
            </form>
        </section>
    )
}

function PasswordForm() {
    const change = useMutation({
        mutationFn: (value: { currentPassword: string; newPassword: string }) =>
            unwrap(authClient.changePassword({ ...value, revokeOtherSessions: true })),
        onSuccess: (data) => {
            if (z.object({ user: z.object({ id: z.string() }) }).safeParse(data).success) {
                toast.success("Mot de passe modifié. Vos autres sessions sont déconnectées.")
                form.reset()
            }
        },
    })
    const form = useAppForm({
        defaultValues: { currentPassword: "", newPassword: "" },
        validators: {
            onSubmit: z.object({
                currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel."),
                newPassword: z.string().min(10, "10 caractères au moins."),
            }),
        },
        onSubmit: ({ value }) => change.mutateAsync(value).catch(() => undefined),
    })
    return (
        <section className="bg-card grid gap-4 rounded-xl border p-5 sm:p-6">
            <h2 className="font-heading text-lg font-semibold">Mot de passe</h2>
            <form
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault()
                    void form.handleSubmit()
                }}
            >
                <form.AppField name="currentPassword">
                    {(field) => <field.TextField label="Mot de passe actuel" type="password" autoComplete="current-password" className="h-11" />}
                </form.AppField>
                <form.AppField name="newPassword">
                    {(field) => <field.TextField label="Nouveau mot de passe" type="password" autoComplete="new-password" className="h-11" />}
                </form.AppField>
                {change.error ? (
                    <p role="alert" className="text-destructive text-sm">
                        {change.error.message}
                    </p>
                ) : null}
                <form.AppForm>
                    <form.SubmitButton pending={change.isPending} className="min-h-11 justify-self-start">
                        Changer le mot de passe
                    </form.SubmitButton>
                </form.AppForm>
            </form>
        </section>
    )
}
