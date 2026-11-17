import { useMutation } from "@tanstack/react-query"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { renderQrSvg } from "@/components/qr/qr-image"
import { Button } from "@/components/ui/button"
import { downloadBlob, fileName, svgToPng } from "@/lib/qr-render"
import type { Design } from "@/lib/qr"

type Props = { design: Design; data: string; name: string; className?: string }

/** PNG for screens and print shops, SVG for designers: both from the same rendering. */
export function DownloadButtons({ design, data, name, className }: Props) {
    const download = useMutation({
        mutationFn: async (format: "png" | "svg") => {
            const svg = await renderQrSvg(design, data)
            const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml" }) : await svgToPng(svg, 2048)
            downloadBlob(fileName(name, format), blob)
            return format
        },
        onError: () => toast.error("Le téléchargement a échoué."),
    })
    return (
        <div className={className ?? "flex flex-wrap gap-2"}>
            {(["png", "svg"] as const).map((format) => (
                <Button
                    key={format}
                    type="button"
                    variant={format === "png" ? "default" : "outline"}
                    className="min-h-11 flex-1"
                    disabled={download.isPending}
                    onClick={() => download.mutate(format)}
                >
                    {download.isPending && download.variables === format ? (
                        <Loader2Icon className="animate-spin" aria-hidden />
                    ) : (
                        <DownloadIcon aria-hidden />
                    )}
                    {format.toUpperCase()}
                </Button>
            ))}
        </div>
    )
}
