import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { PauseIcon, PlayIcon, PlusCircleIcon, QrCodeIcon, Trash2Icon, XIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { z } from "zod"

import { SearchField } from "@/components/dash/search-field"
import { QrRow } from "@/components/qr/qr-row"
import { DeleteQrModal, useBulkAction, useDeleteDialog, useToggleStatus } from "@/components/qr/qr-actions"
import { RenameModal } from "@/components/qr/rename-modal"
import { AppModal } from "@/components/shared/app-modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api"
import { pageItems } from "@/lib/pagination"
import { KINDS, KIND_LABELS } from "@/lib/qr"
import { SORTS, qrListQuery } from "@/lib/qrcodes"

const search = z.object({
    page: z.number().int().min(1).optional().catch(undefined),
    q: z.string().max(100).optional().catch(undefined),
    status: z.enum(["active", "paused"]).optional().catch(undefined),
    kind: z.enum(KINDS).optional().catch(undefined),
    sort: z.enum(["recent", "oldest", "updated", "name", "scans"]).optional().catch(undefined),
})

export const Route = createFileRoute("/_app/qr-codes/")({
    validateSearch: search,
    head: () => ({ meta: [{ title: "QR codes | qrstats" }] }),
    component: QrCodes,
})

const ALL = "all"

function QrCodes() {
    const { page = 1, q = "", status, kind, sort } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    const [text, setText] = useState(q)
    const debounced = useDebouncedValue(text, 300)
    useEffect(() => {
        if (debounced !== q)
            void navigate({
                search: (prev) => ({ ...prev, q: debounced || undefined, page: undefined }),
                replace: true,
            })
    }, [debounced, q, navigate])

    const list = useQuery(qrListQuery({ page, q: q || undefined, status, kind, sort }))
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
    const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
    const [bulkDelete, setBulkDelete] = useState(false)
    const toggle = useToggleStatus()
    const deletion = useDeleteDialog()
    const bulk = useBulkAction(() => {
        setSelected(new Set())
        setBulkDelete(false)
    })

    const rows = list.data?.data ?? []
    // Selection only spans the visible page: a filter or page change starts a new one.
    const visible = rows.filter((row) => selected.has(row.id)).map((row) => row.id)
    const allChecked = rows.length > 0 && visible.length === rows.length
    const filtered = Boolean(q || status || kind)

    const setFilter = (patch: Partial<z.infer<typeof search>>) => {
        setSelected(new Set())
        void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })
    }

    return (
        <>
            <header className="flex flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
                <div className="flex items-center gap-3">
                    <SidebarTrigger className="-ml-2 size-11 md:hidden" />
                    <h1 className="font-heading text-2xl font-semibold sm:text-3xl">QR codes</h1>
                    {list.data ? (
                        <span className="bg-positive-soft text-positive rounded-full px-3 py-1 text-sm font-medium tabular-nums">
                            {list.data.total} au total
                        </span>
                    ) : null}
                </div>
                <Button asChild size="lg" className="min-h-12 px-5 text-base">
                    <Link to="/qr-codes/nouveau">
                        <PlusCircleIcon aria-hidden />
                        Créer un QR code
                    </Link>
                </Button>
            </header>

            <div className="grid min-w-0 content-start gap-4 p-4 sm:p-6 lg:px-10">
                <div className="flex flex-wrap items-center gap-3">
                    <Checkbox
                        className="bg-card size-6"
                        checked={allChecked ? true : visible.length > 0 ? "indeterminate" : false}
                        disabled={rows.length === 0}
                        onCheckedChange={(value) =>
                            setSelected(value === true ? new Set(rows.map((row) => row.id)) : new Set())
                        }
                        aria-label="Sélectionner tous les QR codes de la page"
                    />
                    <div className="bg-card min-h-11 min-w-56 flex-1 rounded-lg border px-3 shadow-xs sm:max-w-sm">
                        <SearchField
                            value={text}
                            onChange={setText}
                            label="Rechercher un QR code"
                            placeholder="Rechercher par nom ou URL"
                        />
                    </div>
                    <FilterSelect
                        label="Statut du QR code"
                        value={status ?? ALL}
                        onChange={(value) =>
                            setFilter({ status: value === ALL ? undefined : (value as "active" | "paused") })
                        }
                        options={[
                            { value: ALL, label: "Tous les statuts" },
                            { value: "active", label: "Actifs" },
                            { value: "paused", label: "En pause" },
                        ]}
                    />
                    <FilterSelect
                        label="Type"
                        value={kind ?? ALL}
                        onChange={(value) =>
                            setFilter({ kind: value === ALL ? undefined : (value as (typeof KINDS)[number]) })
                        }
                        options={[
                            { value: ALL, label: "Tous les types" },
                            ...KINDS.map((k) => ({ value: k, label: KIND_LABELS[k].title })),
                        ]}
                    />
                    <FilterSelect
                        label="Trier par"
                        value={sort ?? "recent"}
                        onChange={(value) =>
                            setFilter({
                                sort: value === "recent" ? undefined : (value as (typeof SORTS)[number]["value"]),
                            })
                        }
                        options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
                    />
                </div>

                {visible.length > 0 ? (
                    <div
                        role="region"
                        aria-label="Actions groupées"
                        className="bg-card flex flex-wrap items-center gap-2 rounded-xl border px-4 py-2"
                    >
                        <p className="mr-auto text-sm font-medium" role="status">
                            {visible.length} sélectionné{visible.length > 1 ? "s" : ""}
                        </p>
                        <Button
                            variant="outline"
                            className="min-h-11"
                            disabled={bulk.isPending}
                            onClick={() => bulk.mutate({ ids: visible, action: "pause" })}
                        >
                            <PauseIcon aria-hidden /> Mettre en pause
                        </Button>
                        <Button
                            variant="outline"
                            className="min-h-11"
                            disabled={bulk.isPending}
                            onClick={() => bulk.mutate({ ids: visible, action: "activate" })}
                        >
                            <PlayIcon aria-hidden /> Réactiver
                        </Button>
                        <Button
                            variant="outline"
                            className="text-destructive min-h-11"
                            disabled={bulk.isPending}
                            onClick={() => setBulkDelete(true)}
                        >
                            <Trash2Icon aria-hidden /> Supprimer
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label="Annuler la sélection"
                            onClick={() => setSelected(new Set())}
                        >
                            <XIcon />
                        </Button>
                    </div>
                ) : null}

                {list.isPending ? (
                    <div className="grid gap-3">
                        {Array.from({ length: 4 }, (_, i) => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <p role="alert" className="text-destructive text-sm">
                        {errorMessage(list.error, "La liste n'a pas pu être chargée.")}
                    </p>
                ) : list.data.total === 0 ? (
                    <div className="bg-card grid place-items-center gap-3 rounded-xl border p-12 text-center">
                        <QrCodeIcon className="text-muted-foreground size-12" strokeWidth={1.3} aria-hidden="true" />
                        {filtered ? (
                            <>
                                <p className="text-muted-foreground text-sm">
                                    Aucun QR code ne correspond à ces filtres.
                                </p>
                                <Button
                                    variant="outline"
                                    className="min-h-11"
                                    onClick={() => {
                                        setText("")
                                        void navigate({ search: {} })
                                    }}
                                >
                                    Effacer les filtres
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="font-heading text-lg font-semibold">Pas encore de QR code</p>
                                <p className="text-muted-foreground max-w-sm text-sm">
                                    Créez votre premier code : vous pourrez changer sa destination à tout moment et
                                    suivre chaque scan.
                                </p>
                                <Button asChild className="min-h-11">
                                    <Link to="/qr-codes/nouveau">Créer un QR code</Link>
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <ul aria-label="QR codes" className="grid gap-3">
                            {rows.map((qr) => (
                                <QrRow
                                    key={qr.id}
                                    qr={qr}
                                    selected={selected.has(qr.id)}
                                    onSelect={(value) =>
                                        setSelected((prev) => {
                                            const next = new Set(prev)
                                            if (value) next.add(qr.id)
                                            else next.delete(qr.id)
                                            return next
                                        })
                                    }
                                    onRename={() => setRenaming({ id: qr.id, name: qr.name })}
                                    onToggle={() => toggle.mutate(qr)}
                                    onDelete={() => deletion.open(qr)}
                                    toggling={toggle.isPending}
                                />
                            ))}
                        </ul>
                        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
                            <p role="status" className="tabular-nums">
                                {(page - 1) * list.data.per_page + 1}–
                                {Math.min(page * list.data.per_page, list.data.total)} sur {list.data.total}
                            </p>
                            {list.data.pages > 1 ? (
                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() =>
                                                    void navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })
                                                }
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
                                                        onClick={() =>
                                                            void navigate({
                                                                search: (prev) => ({ ...prev, page: item }),
                                                            })
                                                        }
                                                    >
                                                        {item}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ),
                                        )}
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() =>
                                                    void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })
                                                }
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

            {deletion.target ? (
                <DeleteQrModal qr={deletion.target} open onOpenChange={(open) => !open && deletion.close()} />
            ) : null}
            {renaming ? <RenameModal qr={renaming} open onOpenChange={(open) => !open && setRenaming(null)} /> : null}
            <AppModal
                open={bulkDelete}
                onOpenChange={setBulkDelete}
                pending={bulk.isPending}
                title={`Supprimer ${visible.length} QR code${visible.length > 1 ? "s" : ""} ?`}
                description="Les exemplaires imprimés ne mèneront plus nulle part et leurs statistiques seront effacées. Cette action est définitive."
                footer={
                    <>
                        <Button
                            variant="outline"
                            className="min-h-11"
                            disabled={bulk.isPending}
                            onClick={() => setBulkDelete(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            className="min-h-11"
                            disabled={bulk.isPending}
                            onClick={() => bulk.mutate({ ids: visible, action: "delete" })}
                        >
                            {bulk.isPending ? "Suppression…" : "Supprimer"}
                        </Button>
                    </>
                }
            />
        </>
    )
}

function FilterSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger aria-label={label} className="bg-card min-h-11 w-full sm:w-48">
                <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
