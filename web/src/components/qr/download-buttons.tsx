import { useMutation } from "@tanstack/react-query"
import { ChevronDownIcon, DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { renderQrSvg } from "@/components/qr/qr-image"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadBlob, fileName, svgToPdf, svgToPng } from "@/lib/qr-render"
import type { Design } from "@/lib/qr"

type Source = { design: Design; data: string; name: string }
export type Export = { format: "png"; size: number } | { format: "svg" } | { format: "pdf" }

/** Account exports: PNG up to 4096 px for print, SVG for designers (vector, infinitely sharp). */
export const PNG_SIZES = [
    { size: 1024, label: "PNG 1024 px", hint: "écrans, réseaux sociaux" },
    { size: 2048, label: "PNG 2048 px", hint: "impression A5 à A4" },
    { size: 4096, label: "PNG 4096 px", hint: "affiches, grands formats" },
] as const

/** Guests get one modest size: enough for a screen or a small print, the rest comes with an account. */
export const GUEST_PNG_SIZE = 512

export function useQrDownload({ design, data, name }: Source) {
    return useMutation({
        mutationFn: async (target: Export) => {
            const svg = await renderQrSvg(design, data)
            if (target.format === "svg") {
                downloadBlob(fileName(name, "svg"), new Blob([svg], { type: "image/svg+xml" }))
            } else if (target.format === "pdf") {
                downloadBlob(fileName(name, "pdf"), await svgToPdf(svg, name))
            } else {
                downloadBlob(fileName(`${name}-${target.size}`, "png"), await svgToPng(svg, target.size))
            }
            return target
        },
        onError: () => toast.error("Le téléchargement a échoué."),
    })
}

export function ExportMenuItems({ onExport }: { onExport: (target: Export) => void }) {
    return (
        <>
            <DropdownMenuLabel>Image (PNG)</DropdownMenuLabel>
            {PNG_SIZES.map((option) => (
                <DropdownMenuItem key={option.size} onSelect={() => onExport({ format: "png", size: option.size })}>
                    <span className="grid">
                        <span>{option.label}</span>
                        <span className="text-muted-foreground text-xs">{option.hint}</span>
                    </span>
                </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onExport({ format: "svg" })}>
                <span className="grid">
                    <span>SVG vectoriel</span>
                    <span className="text-muted-foreground text-xs">imprimeur, graphiste, toute taille</span>
                </span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport({ format: "pdf" })}>
                <span className="grid">
                    <span>PDF A4</span>
                    <span className="text-muted-foreground text-xs">prêt à imprimer, avec le nom du code</span>
                </span>
            </DropdownMenuItem>
        </>
    )
}

export function DownloadButtons({ design, data, name, className }: Source & { className?: string }) {
    const download = useQrDownload({ design, data, name })
    return (
        <div className={className ?? "flex gap-2"}>
            <Button
                type="button"
                className="min-h-11 flex-1"
                disabled={download.isPending}
                onClick={() => download.mutate({ format: "png", size: 2048 })}
            >
                {download.isPending ? (
                    <Loader2Icon className="animate-spin" aria-hidden />
                ) : (
                    <DownloadIcon aria-hidden />
                )}
                PNG haute définition
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11"
                        aria-label="Autres formats"
                        disabled={download.isPending}
                    >
                        <ChevronDownIcon />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-60">
                    <ExportMenuItems onExport={(target) => download.mutate(target)} />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
