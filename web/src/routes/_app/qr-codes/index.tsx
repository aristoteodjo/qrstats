import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { BarChart3Icon, LockIcon, MoreHorizontalIcon, PauseIcon, PencilIcon, PlayIcon, PlusIcon, QrCodeIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"

import { PageContent, PageHeader } from "@/components/dash/page-header"
import { SearchField } from "@/components/dash/search-field"
import { StatusPill } from "@/components/dash/status-pill"
import { KindIcon } from "@/components/qr/kind-icon"
import { DeleteQrModal, useDeleteDialog, useToggleStatus } from "@/components/qr/qr-actions"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api"
import { count, moment } from "@/lib/format"
import { pageItems } from "@/lib/pagination"
import { KIND_LABELS, isDynamic, summary } from "@/lib/qr"
import { qrListQuery } from "@/lib/qrcodes"

const search = z.object({
    page: z.number().int().min(1).catch(1).optional(),
    q: z.string().max(100).catch("").optional(),
    status: z.enum(["active", "paused"]).optional().catch(undefined),
})

export const Route = createFileRoute("/_app/qr-codes/")({
    validateSearch: search,
    head: () => ({ meta: [{ title: "QR codes | qrstats" }] }),
    component: QrCodes,
})

function QrCodes() {
    const { page = 1, q = "", status } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    const [text, setText] = useState(q)
    const debounced = useDebouncedValue(text, 300)
    useEffect(() => {
        if (debounced !== q) void navigate({ search: (prev) => ({ ...prev, q: debounced || undefined, page: undefined }), replace: true })
    }, [debounced, q, navigate])

    const list = useQuery(qrListQuery({ page, q: q || undefined, status }))
    const toggle = useToggleStatus()
    const deletion = useDeleteDialog()

    return (
        <>
            <PageHeader
                title="QR codes"
                description="Changez la destination d'un code sans le réimprimer."
                actions={
                    <Button asChild className="min-h-11">
                        <Link to="/qr-codes/nouveau">
                            <PlusIcon aria-hidden />
                            Créer un QR code
                        </Link>
                    </Button>
                }
            />
            <PageContent>
                <div className="bg-card overflow-hidden rounded-xl border">
                    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-1">
                        <SearchField value={text} onChange={setText} label="Rechercher un QR code" placeholder="Rechercher par nom, lien ou contenu" />
                        <ToggleGroup
                            type="single"
                            value={status ?? "all"}
                            onValueChange={(value) =>
                                value &&
                                void navigate({
                                    search: (prev) => ({ ...prev, status: value === "all" ? undefined : (value as "active" | "paused"), page: undefined }),
                                })
                            }
                            aria-label="Filtrer par statut"
                        >
                            <ToggleGroupItem value="all" className="min-h-11 px-3">Tous</ToggleGroupItem>
                            <ToggleGroupItem value="active" className="min-h-11 px-3">Actifs</ToggleGroupItem>
                            <ToggleGroupItem value="paused" className="min-h-11 px-3">En pause</ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    {list.isPending ? (
                        <div className="grid gap-2 p-4">
                            {Array.from({ length: 5 }, (_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : list.isError ? (
                        <p role="alert" className="text-destructive p-6 text-sm">
                            {errorMessage(list.error, "La liste n'a pas pu être chargée.")}
                        </p>
                    ) : list.data.total === 0 ? (
                        <div className="grid place-items-center gap-3 p-12 text-center">
                            <QrCodeIcon className="text-muted-foreground size-12" strokeWidth={1.3} aria-hidden="true" />
                            {q || status ? (
                                <p className="text-muted-foreground text-sm">Aucun QR code ne correspond à cette recherche.</p>
                            ) : (
                                <>
                                    <p className="font-heading text-lg font-semibold">Pas encore de QR code</p>
                                    <p className="text-muted-foreground max-w-sm text-sm">
                                        Créez votre premier code : vous pourrez changer sa destination à tout moment et suivre chaque scan.
                                    </p>
                                    <Button asChild className="min-h-11">
                                        <Link to="/qr-codes/nouveau">Créer un QR code</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table className="data-table" aria-label="QR codes">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nom</TableHead>
                                            <TableHead className="hidden md:table-cell">Destination</TableHead>
                                            <TableHead className="text-right">Scans</TableHead>
                                            <TableHead className="hidden lg:table-cell">Dernier scan</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>
                                                <span className="sr-only">Actions</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {list.data.data.map((qr) => (
                                            <TableRow key={qr.id}>
                                                <TableCell>
                                                    <Link to="/qr-codes/$id" params={{ id: qr.id }} className="flex min-h-11 items-center gap-3">
                                                        <KindIcon kind={qr.kind} />
                                                        <span className="grid min-w-0">
                                                            <span className="truncate font-medium hover:underline">{qr.name}</span>
                                                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                                                {KIND_LABELS[qr.kind].title}
                                                                {qr.protected ? <LockIcon className="size-3" aria-label="protégé par mot de passe" /> : null}
                                                            </span>
                                                        </span>
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground hidden max-w-xs truncate md:table-cell">
                                                    {summary(qr.kind, qr.content)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">{isDynamic(qr.kind) ? count(qr.scans) : "—"}</TableCell>
                                                <TableCell className="text-muted-foreground hidden lg:table-cell">
                                                    {qr.last_scan_at ? moment(qr.last_scan_at) : "Jamais"}
                                                </TableCell>
                                                <TableCell>
                                                    {!isDynamic(qr.kind) ? (
                                                        <StatusPill tone="neutral">Statique</StatusPill>
                                                    ) : qr.status === "active" ? (
                                                        <StatusPill tone="positive">Actif</StatusPill>
                                                    ) : (
                                                        <StatusPill tone="warning">En pause</StatusPill>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="size-11" aria-label={`Actions pour ${qr.name}`}>
                                                                <MoreHorizontalIcon />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="min-w-48">
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
                                                            {isDynamic(qr.kind) ? (
                                                                <DropdownMenuItem onSelect={() => toggle.mutate(qr)} disabled={toggle.isPending}>
                                                                    {qr.status === "active" ? <PauseIcon /> : <PlayIcon />}
                                                                    {qr.status === "active" ? "Mettre en pause" : "Réactiver"}
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem variant="destructive" onSelect={() => deletion.open(qr)}>
                                                                <Trash2Icon /> Supprimer
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-4 py-1 text-sm">
                                <p role="status" className="tabular-nums">
                                    {(page - 1) * list.data.per_page + 1}–{Math.min(page * list.data.per_page, list.data.total)} sur {list.data.total}
                                </p>
                                {list.data.pages > 1 ? (
                                    <Pagination className="mx-0 w-auto">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
                                                    disabled={page <= 1}
                                                />
                                            </PaginationItem>
                                            {pageItems(page, list.data.pages).map((item, index) =>
                                                item === "gap" ? (
                                                    <PaginationItem key={`gap-${index}`}>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                ) : (
                                                    <PaginationItem key={item}>
                                                        <PaginationLink
                                                            isActive={item === page}
                                                            aria-label={`Page ${item}`}
                                                            onClick={() => void navigate({ search: (prev) => ({ ...prev, page: item }) })}
                                                        >
                                                            {item}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ),
                                            )}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
                                                    disabled={page >= list.data.pages}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>
            </PageContent>
            {deletion.target ? (
                <DeleteQrModal qr={deletion.target} open onOpenChange={(open) => !open && deletion.close()} />
            ) : null}
        </>
    )
}
