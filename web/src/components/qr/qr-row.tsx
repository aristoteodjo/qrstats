import { Link } from "@tanstack/react-router"
import {
    BarChart3Icon,
    CopyIcon,
    DownloadIcon,
    EyeIcon,
    LinkIcon,
    LockIcon,
    MoreHorizontalIcon,
    PauseIcon,
    PencilIcon,
    PlayIcon,
    Share2Icon,
    Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { useQrDownload } from "@/components/qr/download-buttons"
import { QrImage } from "@/components/qr/qr-image"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { shortLink } from "@/lib/api"
import { count, moment } from "@/lib/format"
import { KIND_LABELS, isDynamic, qrPayload, readDesign, summary } from "@/lib/qr"
import type { QRSummary } from "@/lib/qr"
import { cn } from "@/lib/utils"

type Props = {
    qr: QRSummary
    selected: boolean
    onSelect: (selected: boolean) => void
    onRename: () => void
    onToggle: () => void
    onDelete: () => void
    toggling: boolean
}

const display = (link: string) => link.replace(/^https?:\/\//, "")

function copy(text: string, message: string) {
    void navigator.clipboard
        .writeText(text)
        .then(() => toast.success(message))
        .catch(() => toast.error("Copie impossible."))
}

/** One code as a card: its image, what it leads to, its scans, its dates and status, its actions. */
export function QrRow({ qr, selected, onSelect, onRename, onToggle, onDelete, toggling }: Props) {
    const dynamic = isDynamic(qr.kind)
    const link = shortLink(qr.slug)
    const design = readDesign(qr.design)
    const data = qrPayload(qr.kind, qr.content, link)
    const download = useQrDownload({ design, data, name: qr.name })
    const recentlyEdited =
        Date.now() - new Date(qr.updated_at).getTime() < 24 * 3600 * 1000 && qr.updated_at !== qr.created_at

    const share = () => {
        if (typeof navigator.share === "function") {
            navigator.share({ title: qr.name, url: link }).catch(() => undefined)
        } else copy(link, "Lien copié.")
    }

    return (
        <li
            className={cn(
                "bg-card grid items-center gap-4 rounded-xl border p-4 shadow-xs transition-colors sm:p-5",
                "grid-cols-[auto_auto_minmax(0,1fr)] lg:grid-cols-[auto_auto_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_110px_auto]",
                selected && "border-primary/60 bg-accent/30",
            )}
        >
            <Checkbox
                className="size-5"
                checked={selected}
                onCheckedChange={(value) => onSelect(value === true)}
                aria-label={`Sélectionner ${qr.name}`}
            />
            <Link
                to="/qr-codes/$id"
                params={{ id: qr.id }}
                className="bg-card grid size-20 place-items-center rounded-lg border p-1.5 sm:size-24"
                aria-label={`Ouvrir ${qr.name}`}
            >
                <QrImage design={design} data={data} label="" className="w-full" />
            </Link>

            <div className="grid min-w-0 gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                    <Link
                        to="/qr-codes/$id"
                        params={{ id: qr.id }}
                        className="font-heading truncate text-lg font-semibold hover:underline"
                    >
                        {qr.name}
                    </Link>
                    {qr.protected ? (
                        <LockIcon
                            className="text-muted-foreground size-3.5 shrink-0"
                            aria-label="protégé par mot de passe"
                        />
                    ) : null}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-9 shrink-0"
                        aria-label={`Renommer ${qr.name}`}
                        onClick={onRename}
                    >
                        <PencilIcon className="size-4" />
                    </Button>
                </div>
                {dynamic ? (
                    <p className="flex min-w-0 items-center gap-1.5 text-sm">
                        <EyeIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate font-mono text-[13px]">{display(link)}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground size-8 shrink-0"
                            aria-label="Copier le lien court"
                            onClick={() => copy(link, "Lien court copié.")}
                        >
                            <CopyIcon className="size-3.5" />
                        </Button>
                    </p>
                ) : null}
                <p className="text-sm">
                    <span className="text-muted-foreground">Type </span>
                    {KIND_LABELS[qr.kind].title}
                </p>
                <p className="flex min-w-0 items-center gap-1.5 text-sm">
                    <LinkIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{summary(qr.kind, qr.content) || "—"}</span>
                    <Link
                        to="/qr-codes/$id/modifier"
                        params={{ id: qr.id }}
                        className="text-muted-foreground hover:text-foreground grid size-8 shrink-0 place-items-center rounded-md"
                        aria-label={dynamic ? "Changer la destination" : "Modifier"}
                    >
                        <PencilIcon className="size-3.5" />
                    </Link>
                </p>
            </div>

            <div className="col-span-3 grid grid-cols-2 gap-4 border-t pt-3 sm:grid-cols-4 lg:contents">
                <div className="grid justify-items-start text-left lg:justify-items-center lg:border-x lg:px-2 lg:text-center">
                    <span className="font-heading text-2xl font-semibold tabular-nums">
                        {dynamic ? count(qr.scans) : "—"}
                    </span>
                    <span className="text-muted-foreground text-sm">
                        {dynamic ? (qr.scans > 1 ? "scans" : "scan") : "non suivi"}
                    </span>
                </div>

                <div className="grid gap-0.5 text-sm">
                    <p>Création : {moment(qr.created_at)}</p>
                    <p className="text-muted-foreground">Modification : {moment(qr.updated_at)}</p>
                    {recentlyEdited ? <p className="text-primary text-xs font-medium">Récemment modifié</p> : null}
                </div>

                <p className="flex items-center gap-2 text-sm font-medium lg:justify-center lg:border-x lg:px-2">
                    <span
                        aria-hidden="true"
                        className={cn(
                            "size-2 rounded-full",
                            !dynamic ? "bg-muted-foreground" : qr.status === "active" ? "bg-positive" : "bg-warning",
                        )}
                    />
                    <span
                        className={cn(
                            !dynamic
                                ? "text-muted-foreground"
                                : qr.status === "active"
                                  ? "text-positive"
                                  : "text-warning",
                        )}
                    >
                        {!dynamic ? "Statique" : qr.status === "active" ? "Actif" : "En pause"}
                    </span>
                </p>

                <div className="flex items-center gap-2 lg:justify-end">
                    {dynamic ? (
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-11"
                            aria-label={`Partager ${qr.name}`}
                            onClick={share}
                        >
                            <Share2Icon />
                        </Button>
                    ) : null}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-11"
                                aria-label={`Télécharger ${qr.name}`}
                                disabled={download.isPending}
                            >
                                <DownloadIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => download.mutate("png")}>
                                PNG (impression, écrans)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => download.mutate("svg")}>
                                SVG (graphistes)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11"
                                aria-label={`Autres actions pour ${qr.name}`}
                            >
                                <MoreHorizontalIcon />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-52">
                            <DropdownMenuItem asChild>
                                <Link to="/qr-codes/$id" params={{ id: qr.id }}>
                                    <BarChart3Icon /> Statistiques
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/qr-codes/$id/modifier" params={{ id: qr.id }}>
                                    <PencilIcon /> Modifier
                                </Link>
                            </DropdownMenuItem>
                            {dynamic ? (
                                <DropdownMenuItem onSelect={onToggle} disabled={toggling}>
                                    {qr.status === "active" ? <PauseIcon /> : <PlayIcon />}
                                    {qr.status === "active" ? "Mettre en pause" : "Réactiver"}
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                                <Trash2Icon /> Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </li>
    )
}
