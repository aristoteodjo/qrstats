import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { z } from "zod"

import { Brand } from "@/components/layout/brand"
import { useAppForm } from "@/hooks/form"
import { authClient, forgetApiToken } from "@/lib/auth-client"
import { appHref } from "@/lib/current-space"
import { safeRedirect, sameOriginPath } from "@/lib/safe-redirect"

const search = z.object({
    mode: z.enum(["connexion", "inscription"]).optional().catch(undefined),
    redirect: safeRedirect,
})

export const Route = createFileRoute("/connexion")({
    validateSearch: search,
    ssr: false,
    beforeLoad: ({ context, search: params }) => {
        // The session cookie belongs to app.: signing in on the public host would leave the dashboard signed out.
        if (context.space.kind === "site") {
            throw redirect({ href: appHref(`/connexion${params.mode ? `?mode=${params.mode}` : ""}`) })
        }
    },
    head: () => ({ meta: [{ title: "Connexion | qrstats" }] }),
    component: SignIn,
})

async function unwrap<T>(call: Promise<{ data: T | null; error: { message?: string } | null }>): Promise<T> {
    const { data, error } = await call
    if (error || !data) throw new Error(error?.message ?? "La connexion a échoué.")
    return data
}

function SignIn() {
    const { mode, redirect: back } = Route.useSearch()
    const signUp = mode === "inscription"
    const mutation = useMutation({
        mutationFn: (value: { name: string; email: string; password: string }) =>
            signUp
                ? unwrap(authClient.signUp.email(value))
                : unwrap(authClient.signIn.email({ email: value.email, password: value.password })),
        onSuccess: (data) => {
            if (!z.object({ user: z.object({ id: z.string() }) }).safeParse(data).success) return
            forgetApiToken()
            // A full load, not a router navigation: the session store has not refetched yet.
            window.location.assign(sameOriginPath(back ?? "/analyses", window.location.origin))
        },
    })
    const form = useAppForm({
        defaultValues: { name: "", email: "", password: "" },
        validators: {
            onSubmit: z.object({
                name: signUp ? z.string().trim().min(2, "Votre nom est requis.") : z.string(),
                email: z.email("Adresse e-mail invalide."),
                password: z.string().min(signUp ? 10 : 1, signUp ? "10 caractères au moins." : "Saisissez votre mot de passe."),
            }),
        },
        onSubmit: ({ value }) => mutation.mutateAsync(value).catch(() => undefined),
    })

    return (
        <main id="contenu" className="grid min-h-svh place-items-center px-4 py-10">
            <div className="bg-card grid w-full max-w-sm gap-6 rounded-2xl border p-6 shadow-sm sm:p-8">
                <div className="grid justify-items-center gap-2 text-center">
                    <Brand />
                    <h1 className="text-muted-foreground text-sm font-normal">
                        {signUp ? "Créez votre compte gratuitement" : "Connectez-vous à votre espace"}
                    </h1>
                </div>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        void form.handleSubmit()
                    }}
                >
                    {signUp ? (
                        <form.AppField name="name">
                            {(field) => <field.TextField label="Nom" autoComplete="name" className="h-11" />}
                        </form.AppField>
                    ) : null}
                    <form.AppField name="email">
                        {(field) => <field.TextField label="E-mail" type="email" autoComplete="email" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="password">
                        {(field) => (
                            <field.TextField
                                label="Mot de passe"
                                type="password"
                                autoComplete={signUp ? "new-password" : "current-password"}
                                className="h-11"
                            />
                        )}
                    </form.AppField>
                    {mutation.error ? (
                        <p role="alert" className="text-destructive text-sm">
                            {mutation.error.message}
                        </p>
                    ) : null}
                    <form.AppForm>
                        <form.SubmitButton pending={mutation.isPending} pendingLabel="Un instant…" className="min-h-11">
                            {signUp ? "Créer mon compte" : "Se connecter"}
                        </form.SubmitButton>
                    </form.AppForm>
                </form>
                <p className="text-muted-foreground text-center text-sm">
                    {signUp ? "Déjà un compte ? " : "Pas encore de compte ? "}
                    <Link
                        to="/connexion"
                        search={{ mode: signUp ? undefined : "inscription", redirect: back }}
                        className="text-primary inline-flex min-h-11 items-center font-medium hover:underline"
                    >
                        {signUp ? "Se connecter" : "Créer un compte"}
                    </Link>
                </p>
            </div>
        </main>
    )
}
