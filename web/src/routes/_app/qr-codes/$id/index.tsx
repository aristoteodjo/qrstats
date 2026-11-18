import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { CopyIcon, ExternalLinkIcon, LockIcon, PauseIcon, PencilIcon, PlayIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { PageContent, PageHeader } from "@/components/dash/page-header"
import { StatusPill } from "@/components/dash/status-pill"
import { DownloadButtons } from "@/components/qr/download-buttons"
import { DeleteQrModal, useToggleStatus } from "@/components/qr/qr-actions"
import { QrImage } from "@/components/qr/qr-image"
import { ScanCheck } from "@/components/qr/scan-check"
import { StatsBoard } from "@/components/stats/stats-board"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage, shortLink } from "@/lib/api"
import { moment } from "@/lib/format"
import { KIND_LABELS, isDynamic, qrPayload, readDesign, summary } from "@/lib/qr"
import { qrDetailQuery } from "@/lib/qrcodes"

export const Route = createFileRoute("/_app/qr-codes/$id/")({
    head: () => ({ meta: [{ title: "QR code | qrstats" }] }),
    component: QrDetail,
})

function QrDetail() {
    const { id } = Route.useParams()
    const qr = useQuery(qrDetailQuery(id))
    const toggle = useToggleStatus()
    const [deleting, setDeleting] = useState(false)

    if (qr.isPending) {
        return (
            <PageContent>
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-80" />
            </PageContent>
        )
    }
    if (qr.isError) {
        return (
            <PageContent>
                <p role="alert" className="text-destructive text-sm">
                    {errorMessage(qr.error, "QR code introuvable.")}
                </p>
                <Button asChild variant="outline" className="min-h-11 justify-self-start">
                    <Link to="/qr-codes">Retour à la liste</Link>
                </Button>
            </PageContent>
        )
    }

    const code = qr.data
    const dynamic = isDynamic(code.kind)
    const link = shortLink(code.slug)
    const design = readDesign(code.design)

    return (
        <>
            <PageHeader
                title={code.name}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        {KIND_LABELS[code.kind].title}, créé le {moment(code.created_at)}
                        {!dynamic ? (
                            <StatusPill tone="neutral">Statique</StatusPill>
                        ) : code.status === "active" ? (
                            <StatusPill tone="positive">Actif</StatusPill>
                        ) : (
                            <StatusPill tone="warning">En pause</StatusPill>
                        )}
                        {code.protected ? (
                            <StatusPill tone="info">
                                <LockIcon className="mr-1 size-3" aria-hidden="true" />
                                Mot de passe
                            </StatusPill>
                        ) : null}
                    </span>
                }
                actions={
                    <>
                        {dynamic ? (
                            <Button
                                variant="outline"
                                className="min-h-11"
                                disabled={toggle.isPending}
                                onClick={() => toggle.mutate(code)}
                            >
                                {code.status === "active" ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
                                {code.status === "active" ? "Mettre en pause" : "Réactiver"}
                            </Button>
                        ) : null}
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-11"
                            aria-label="Supprimer"
                            onClick={() => setDeleting(true)}
                        >
                            <Trash2Icon />
                        </Button>
                        <Button asChild className="min-h-11">
                            <Link to="/qr-codes/$id/modifier" params={{ id: code.id }}>
                                <PencilIcon aria-hidden />
                                {dynamic ? "Changer la destination" : "Modifier l'aspect"}
                            </Link>
                        </Button>
                    </>
                }
            />
            <PageContent>
                <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <section aria-label="QR code" className="bg-card grid content-start gap-4 rounded-xl border p-5">
                        <QrImage
                            design={design}
                            data={qrPayload(code.kind, code.content, link)}
                            label={`QR code ${code.name}`}
                            className="w-full"
                        />
                        <DownloadButtons
                            design={design}
                            data={qrPayload(code.kind, code.content, link)}
                            name={code.name}
                        />
                        <ScanCheck design={design} data={qrPayload(code.kind, code.content, link)} />
                    </section>
                    <section
                        aria-label="Destination"
                        className="bg-card grid content-start gap-5 rounded-xl border p-5"
                    >
                        <div className="grid gap-1">
                            <h2 className="text-muted-foreground text-sm font-medium">Mène vers</h2>
                            <p className="font-heading text-lg font-semibold break-all">
                                {summary(code.kind, code.content)}
                            </p>
                            {code.kind === "url" ? (
                                <a
                                    href={summary(code.kind, code.content)}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-primary inline-flex min-h-11 items-center gap-1 text-sm"
                                >
                                    Ouvrir la destination <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                                </a>
                            ) : null}
                        </div>
                        {dynamic ? (
                            <div className="grid gap-2">
                                <h2 className="text-muted-foreground text-sm font-medium">Lien imprimé dans le code</h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    <code className="bg-muted rounded-md px-3 py-2 font-mono text-sm break-all">
                                        {link}
                                    </code>
                                    <Button
                                        variant="outline"
                                        className="min-h-11"
                                        onClick={() =>
                                            void navigator.clipboard
                                                .writeText(link)
                                                .then(() => toast.success("Lien copié."))
                                                .catch(() => toast.error("Copie impossible."))
                                        }
                                    >
                                        <CopyIcon aria-hidden /> Copier
                                    </Button>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    Ce lien ne change jamais. Modifiez la destination quand vous voulez : les codes déjà
                                    imprimés suivent.
                                </p>
                            </div>
                        ) : (
                            <p className="bg-muted text-muted-foreground rounded-lg p-3 text-sm">
                                Un QR code Wi-Fi contient le réseau lui-même : il ne passe pas par qrstats, ses scans ne
                                sont donc pas comptés.
                            </p>
                        )}
                    </section>
                </div>
                {dynamic ? (
                    <div className="grid gap-4">
                        <h2 className="font-heading text-xl font-semibold">Statistiques</h2>
                        <StatsBoard qrCodeId={code.id} />
                    </div>
                ) : null}
            </PageContent>
            <DeleteQrModal qr={code} open={deleting} onOpenChange={setDeleting} afterDelete="list" />
        </>
    )
}
