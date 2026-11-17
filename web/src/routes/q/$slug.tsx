import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ContactIcon, CopyIcon, LockIcon, PauseCircleIcon, SearchXIcon } from "lucide-react"
import { useEffect } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Brand } from "@/components/layout/brand"
import { KindIcon } from "@/components/qr/kind-icon"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppForm } from "@/hooks/form"
import { ApiError, errorMessage } from "@/lib/api"
import { KIND_LABELS, actionHref, readContent, vcardText } from "@/lib/qr"
import type { PublicView } from "@/lib/qr"
import { publicQrQuery, unlockQr } from "@/lib/qrcodes"
import { downloadBlob, fileName } from "@/lib/qr-render"

/** Where a scan lands when it is not a plain link: text, contact, actions, password, paused or unknown code. */
export const Route = createFileRoute("/q/$slug")({
    ssr: false,
    head: () => ({ meta: [{ title: "qrstats" }, { name: "robots", content: "noindex" }] }),
    component: ScanLanding,
})

function Shell({ children }: { children: ReactNode }) {
    return (
        <main id="contenu" className="grid min-h-svh place-items-center px-4 py-10">
            <div className="grid w-full max-w-md gap-6">
                <div className="bg-card grid gap-5 rounded-2xl border p-6 shadow-sm sm:p-8">{children}</div>
                <p className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
                    Propulsé par <Brand className="text-sm [&_img]:size-5" />
                </p>
            </div>
        </main>
    )
}

function ScanLanding() {
    const { slug } = Route.useParams()
    const view = useQuery(publicQrQuery(slug))
    const unlock = useMutation({ mutationFn: (password: string) => unlockQr(slug, password) })

    if (view.isPending) {
        return (
            <Shell>
                <Skeleton className="h-40" />
            </Shell>
        )
    }
    if (view.isError) {
        const missing = view.error instanceof ApiError && view.error.status === 404
        return (
            <Shell>
                <Message
                    icon={<SearchXIcon className="size-8" aria-hidden="true" />}
                    title={missing ? "QR code introuvable" : "Ce QR code ne répond pas"}
                    text={missing ? "Ce code n'existe pas ou a été supprimé par son propriétaire." : "Réessayez dans quelques instants."}
                />
            </Shell>
        )
    }
    if (view.data.status === "paused") {
        return (
            <Shell>
                <Message
                    icon={<PauseCircleIcon className="size-8" aria-hidden="true" />}
                    title="QR code désactivé"
                    text="Son propriétaire l'a mis en pause. Revenez plus tard."
                />
            </Shell>
        )
    }
    const opened: PublicView | undefined = unlock.data ?? (view.data.locked ? undefined : view.data)
    if (!opened) {
        return (
            <Shell>
                <PasswordGate name={view.data.name} pending={unlock.isPending} error={unlock.error} onSubmit={(password) => unlock.mutate(password)} />
            </Shell>
        )
    }
    return (
        <Shell>
            <Content view={opened} />
        </Shell>
    )
}

function Message({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
    return (
        <div className="grid justify-items-center gap-3 text-center">
            <span className="bg-muted text-muted-foreground grid size-14 place-items-center rounded-full">{icon}</span>
            <h1 className="font-heading text-xl font-semibold">{title}</h1>
            <p className="text-muted-foreground text-sm">{text}</p>
        </div>
    )
}

function PasswordGate({
    name,
    pending,
    error,
    onSubmit,
}: {
    name: string
    pending: boolean
    error: Error | null
    onSubmit: (password: string) => void
}) {
    const form = useAppForm({
        defaultValues: { password: "" },
        validators: { onSubmit: z.object({ password: z.string().min(1, "Saisissez le mot de passe.") }) },
        onSubmit: ({ value }) => onSubmit(value.password),
    })
    return (
        <>
            <div className="grid justify-items-center gap-3 text-center">
                <span className="bg-accent text-accent-foreground grid size-14 place-items-center rounded-full">
                    <LockIcon className="size-7" aria-hidden="true" />
                </span>
                <h1 className="font-heading text-xl font-semibold">{name}</h1>
                <p className="text-muted-foreground text-sm">Ce contenu est protégé par un mot de passe.</p>
            </div>
            <form
                className="grid gap-4"
                onSubmit={(event) => {
                    event.preventDefault()
                    void form.handleSubmit()
                }}
            >
                <form.AppField name="password">
                    {(field) => <field.TextField label="Mot de passe" type="password" autoComplete="off" className="h-11" />}
                </form.AppField>
                {error ? (
                    <p role="alert" className="text-destructive text-sm">
                        {errorMessage(error)}
                    </p>
                ) : null}
                <form.AppForm>
                    <form.SubmitButton pending={pending} className="min-h-11">
                        Ouvrir
                    </form.SubmitButton>
                </form.AppForm>
            </form>
        </>
    )
}

function Content({ view }: { view: PublicView }) {
    const target = view.kind === "url" ? view.target : null
    useEffect(() => {
        // An unlocked link code goes on to its destination, like an unprotected one does from /r/.
        if (target && /^https?:\/\//.test(target)) window.location.replace(target)
    }, [target])

    const header = (
        <div className="flex items-center gap-3">
            <KindIcon kind={view.kind} />
            <div className="grid">
                <h1 className="font-heading text-xl font-semibold">{view.name}</h1>
                <p className="text-muted-foreground text-xs">{KIND_LABELS[view.kind].title}</p>
            </div>
        </div>
    )

    switch (view.kind) {
        case "url":
            return (
                <>
                    {header}
                    <p className="text-muted-foreground text-sm">Redirection en cours…</p>
                    {target ? (
                        <Button asChild className="min-h-11">
                            <a href={target} rel="noreferrer noopener">
                                Continuer vers le site
                            </a>
                        </Button>
                    ) : null}
                </>
            )
        case "text": {
            const { text } = readContent("text", view.content)
            return (
                <>
                    {header}
                    <p className="leading-relaxed whitespace-pre-wrap">{text}</p>
                    <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() =>
                            void navigator.clipboard
                                .writeText(text)
                                .then(() => toast.success("Texte copié."))
                                .catch(() => toast.error("Copie impossible."))
                        }
                    >
                        <CopyIcon aria-hidden /> Copier le texte
                    </Button>
                </>
            )
        }
        case "vcard": {
            const c = readContent("vcard", view.content)
            const full = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.organization
            const rows: Array<[string, string, string | null]> = [
                ["Organisation", c.organization, null],
                ["Fonction", c.title, null],
                ["Téléphone", c.phone, c.phone ? `tel:${c.phone.replace(/[^\d+]/g, "")}` : null],
                ["E-mail", c.email, c.email ? `mailto:${c.email}` : null],
                ["Site web", c.website, c.website || null],
                ["Adresse", c.address, null],
                ["Note", c.note, null],
            ]
            return (
                <>
                    <div className="grid justify-items-center gap-2 text-center">
                        <span className="bg-accent text-accent-foreground grid size-16 place-items-center rounded-full">
                            <ContactIcon className="size-8" aria-hidden="true" />
                        </span>
                        <h1 className="font-heading text-2xl font-semibold">{full}</h1>
                    </div>
                    <dl className="grid gap-3">
                        {rows
                            .filter(([, value]) => value)
                            .map(([label, value, href]) => (
                                <div key={label} className="grid gap-0.5">
                                    <dt className="text-muted-foreground text-xs">{label}</dt>
                                    <dd className="break-words">
                                        {href ? (
                                            <a href={href} className="text-primary inline-flex min-h-11 items-center hover:underline" rel="noreferrer noopener">
                                                {value}
                                            </a>
                                        ) : (
                                            value
                                        )}
                                    </dd>
                                </div>
                            ))}
                    </dl>
                    <Button
                        className="min-h-11"
                        onClick={() => downloadBlob(fileName(full, "vcf"), new Blob([vcardText(c)], { type: "text/vcard;charset=utf-8" }))}
                    >
                        Ajouter aux contacts
                    </Button>
                </>
            )
        }
        case "email":
        case "phone":
        case "sms": {
            const href = actionHref(view.kind, view.content) ?? "#"
            const label = { email: "Écrire l'e-mail", phone: "Appeler", sms: "Envoyer le SMS" }[view.kind]
            const detail =
                view.kind === "email"
                    ? readContent("email", view.content).to
                    : view.kind === "phone"
                      ? readContent("phone", view.content).phone
                      : readContent("sms", view.content).phone
            return (
                <>
                    {header}
                    <p className="font-heading text-2xl font-semibold break-all">{detail}</p>
                    <Button asChild className="min-h-11">
                        <a href={href}>{label}</a>
                    </Button>
                </>
            )
        }
        case "wifi":
            return (
                <>
                    {header}
                    <p className="text-muted-foreground text-sm">Ce code se scanne directement avec l'appareil photo pour rejoindre le réseau.</p>
                </>
            )
    }
}
