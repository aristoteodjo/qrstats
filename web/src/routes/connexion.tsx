import { Link, createFileRoute } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { z } from "zod"

import { AuthShell } from "@/components/auth/auth-shell"
import { useAppForm } from "@/hooks/form"
import { authClient, forgetApiToken } from "@/lib/auth-client"
import { currentPasswordRule, emailRule, unwrap } from "@/lib/auth-forms"
import { safeRedirect, sameOriginPath } from "@/lib/safe-redirect"

export const Route = createFileRoute("/connexion")({
    validateSearch: z.object({ redirect: safeRedirect }),
    ssr: false,
    head: () => ({ meta: [{ title: "Connexion | qrstats" }] }),
    component: SignIn,
})

const signedIn = z.object({ user: z.object({ id: z.string() }) })

function SignIn() {
    const { redirect } = Route.useSearch()
    const signIn = useMutation({
        mutationFn: (value: { email: string; password: string }) =>
            unwrap(
                authClient.signIn.email({ email: value.email.trim(), password: value.password }),
                "La connexion a échoué.",
            ),
        onSuccess: (data) => {
            if (!signedIn.safeParse(data).success) return
            forgetApiToken()
            // A full load, not a router navigation: the session store has not refetched yet.
            window.location.assign(sameOriginPath(redirect ?? "/qr-codes", window.location.origin))
        },
    })
    const form = useAppForm({
        defaultValues: { email: "", password: "" },
        onSubmit: ({ value }) => signIn.mutateAsync(value).catch(() => undefined),
    })

    return (
        <AuthShell
            title="Bon retour"
            intro="Connectez-vous pour gérer vos QR codes et suivre leurs scans."
            footer={
                <>
                    Pas encore de compte ?{" "}
                    <Link to="/inscription" search={{ redirect }} className="text-primary font-medium hover:underline">
                        Créer un compte
                    </Link>
                </>
            }
        >
            <form
                noValidate
                className="grid gap-5"
                onSubmit={(event) => {
                    event.preventDefault()
                    void form.handleSubmit()
                }}
            >
                <form.AppField name="email" validators={{ onBlur: emailRule, onSubmit: emailRule }}>
                    {(field) => (
                        <field.TextField
                            label="Adresse e-mail"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            className="bg-card h-12"
                        />
                    )}
                </form.AppField>
                <form.AppField name="password" validators={{ onSubmit: currentPasswordRule }}>
                    {(field) => <field.PasswordField label="Mot de passe" autoComplete="current-password" />}
                </form.AppField>
                {signIn.error ? (
                    <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2.5 text-sm">
                        {signIn.error.message}
                    </p>
                ) : null}
                <form.AppForm>
                    <form.SubmitButton pending={signIn.isPending} pendingLabel="Connexion…" className="h-12 text-base">
                        Se connecter
                    </form.SubmitButton>
                </form.AppForm>
            </form>
        </AuthShell>
    )
}
