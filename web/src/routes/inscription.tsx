import { Link, createFileRoute } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { CheckIcon } from "lucide-react"
import { z } from "zod"

import { AuthShell } from "@/components/auth/auth-shell"
import { useAppForm } from "@/hooks/form"
import { authClient, forgetApiToken } from "@/lib/auth-client"
import { emailRule, nameRule, newPasswordRule, unwrap } from "@/lib/auth-forms"
import { safeRedirect, sameOriginPath } from "@/lib/safe-redirect"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/inscription")({
    validateSearch: z.object({ redirect: safeRedirect }),
    ssr: false,
    head: () => ({ meta: [{ title: "Créer un compte | qrstats" }] }),
    component: SignUp,
})

const signedUp = z.object({ user: z.object({ id: z.string() }) })

function SignUp() {
    const { redirect } = Route.useSearch()
    const signUp = useMutation({
        mutationFn: (value: { name: string; email: string; password: string }) =>
            unwrap(
                authClient.signUp.email({
                    name: value.name.trim(),
                    email: value.email.trim(),
                    password: value.password,
                }),
                "La création du compte a échoué.",
            ),
        onSuccess: (data) => {
            if (!signedUp.safeParse(data).success) return
            forgetApiToken()
            window.location.assign(sameOriginPath(redirect ?? "/qr-codes/nouveau", window.location.origin))
        },
    })
    const form = useAppForm({
        defaultValues: { name: "", email: "", password: "" },
        onSubmit: ({ value }) => signUp.mutateAsync(value).catch(() => undefined),
    })

    return (
        <AuthShell
            title="Créez votre compte"
            intro="Votre premier QR code modifiable est à deux minutes."
            footer={
                <>
                    Déjà un compte ?{" "}
                    <Link to="/connexion" search={{ redirect }} className="text-primary font-medium hover:underline">
                        Se connecter
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
                <form.AppField name="name" validators={{ onBlur: nameRule, onSubmit: nameRule }}>
                    {(field) => <field.TextField label="Nom" autoComplete="name" className="bg-card h-12" />}
                </form.AppField>
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
                <form.AppField
                    name="password"
                    validators={{
                        onSubmit: ({ value }) =>
                            newPasswordRule.safeParse(value).success
                                ? undefined
                                : "Le mot de passe ne respecte pas encore les règles ci-dessous.",
                    }}
                >
                    {(field) => (
                        <div className="grid gap-3">
                            <field.PasswordField label="Mot de passe" autoComplete="new-password" />
                            <PasswordChecklist value={field.state.value} />
                        </div>
                    )}
                </form.AppField>
                {signUp.error ? (
                    <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2.5 text-sm">
                        {signUp.error.message}
                    </p>
                ) : null}
                <form.AppForm>
                    <form.SubmitButton
                        pending={signUp.isPending}
                        pendingLabel="Création du compte…"
                        className="h-12 text-base"
                    >
                        Créer mon compte
                    </form.SubmitButton>
                </form.AppForm>
                <p className="text-muted-foreground text-xs">
                    En créant un compte, vous acceptez les{" "}
                    <Link to="/cgu" className="underline">
                        conditions d'utilisation
                    </Link>{" "}
                    et la{" "}
                    <Link to="/confidentialite" className="underline">
                        politique de confidentialité
                    </Link>
                    .
                </p>
            </form>
        </AuthShell>
    )
}

/** The two password rules, ticked as they are met, so the error never comes as a surprise. */
function PasswordChecklist({ value }: { value: string }) {
    const rules = [
        { label: "10 caractères au moins", met: value.length >= 10 },
        { label: "Des lettres et des chiffres ou symboles", met: /[a-zA-Z]/.test(value) && /[^a-zA-Z]/.test(value) },
    ]
    return (
        <ul aria-label="Règles du mot de passe" className="grid gap-1.5 text-sm">
            {rules.map((rule) => (
                <li
                    key={rule.label}
                    className={cn("flex items-center gap-2", rule.met ? "text-positive" : "text-muted-foreground")}
                >
                    <span
                        className={cn(
                            "grid size-4 place-items-center rounded-full border",
                            rule.met && "bg-positive border-positive text-card",
                        )}
                        aria-hidden="true"
                    >
                        {rule.met ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
                    </span>
                    {rule.label}
                    <span className="sr-only">{rule.met ? " : respecté" : " : pas encore respecté"}</span>
                </li>
            ))}
        </ul>
    )
}
