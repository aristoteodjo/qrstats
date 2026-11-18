import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2Icon, Trash2Icon, WandSparklesIcon } from "lucide-react"
import { useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { useAppForm } from "@/hooks/form"
import { errorMessage } from "@/lib/api"
import {
    ART_IDEAS,
    ART_STYLES,
    artQuotaQuery,
    artResultQuery,
    artStartedSchema,
    compressArt,
    startArt,
} from "@/lib/art"
import type { ArtStyle } from "@/lib/art"
import type { Design } from "@/lib/qr"

type Props = { codeId?: string; design: Design; onChange: (design: Design) => void }

const promptSchema = z
    .string()
    .trim()
    .min(3, "Décrivez l'image en quelques mots.")
    .max(400, "400 caractères au maximum.")

/**
 * Generates an artwork that encodes the code's short link (Replicate, accounts only). The code must exist first:
 * its slug is what the image carries.
 */
export function ArtStudio({ codeId, design, onChange }: Props) {
    if (!codeId) {
        return (
            <p className="text-muted-foreground text-sm leading-relaxed">
                Enregistrez d'abord votre QR code : le visuel IA intègre son lien court. Vous le créerez ensuite depuis
                « Modifier », étape Personnaliser.
            </p>
        )
    }
    return <ArtForm codeId={codeId} design={design} onChange={onChange} />
}

function ArtForm({ codeId, design, onChange }: Props & { codeId: string }) {
    const queryClient = useQueryClient()
    const quota = useQuery(artQuotaQuery())
    const [jobId, setJobId] = useState<string | null>(null)
    const result = useQuery({ ...artResultQuery(jobId ?? ""), enabled: jobId !== null })

    const start = useMutation({
        mutationFn: (input: { prompt: string; style: ArtStyle }) => startArt(codeId, input),
        onSuccess: (started) => {
            if (!artStartedSchema.safeParse(started).success) return
            queryClient.setQueryData(artQuotaQuery().queryKey, started.quota)
            setJobId(started.id)
        },
    })
    const apply = useMutation({
        mutationFn: async ({ image, prompt }: { image: string; prompt: string }) => ({
            image: await compressArt(image),
            prompt,
        }),
        onSuccess: (art) => {
            if (!art.image.startsWith("data:image/")) return
            onChange({ ...design, art })
            setJobId(null)
        },
    })

    const form = useAppForm({
        defaultValues: { prompt: "", style: "readable" as ArtStyle },
        validators: {
            onSubmit: z.object({ prompt: promptSchema, style: z.enum(["readable", "balanced", "artistic"]) }),
        },
        onSubmit: ({ value }) =>
            start.mutateAsync({ prompt: value.prompt.trim(), style: value.style }).catch(() => undefined),
    })

    if (quota.isPending) return <p className="text-muted-foreground text-sm">Chargement…</p>
    if (quota.isError)
        return (
            <p role="alert" className="text-destructive text-sm">
                {errorMessage(quota.error)}
            </p>
        )
    if (!quota.data.available) {
        return <p className="text-muted-foreground text-sm">La création de visuels IA n'est pas encore activée.</p>
    }

    const running = start.isPending || result.data?.status === "pending" || (jobId !== null && result.isPending)
    const ready = result.data?.status === "succeeded" && result.data.image ? result.data.image : null

    return (
        <div className="grid gap-5">
            {design.art ? (
                <div className="bg-muted/50 flex items-center gap-4 rounded-xl p-3">
                    <img src={design.art.image} alt="" className="size-16 rounded-lg object-cover" />
                    <p className="min-w-0 flex-1 text-sm">
                        <span className="font-medium">Visuel IA actif.</span>{" "}
                        <span className="text-muted-foreground">
                            Il remplace le motif, les couleurs et le logo. Choisir un style prêt à l'emploi le retire.
                        </span>
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => onChange({ ...design, art: null })}
                    >
                        <Trash2Icon aria-hidden="true" />
                        Retirer
                    </Button>
                </div>
            ) : null}

            <div className="grid gap-4">
                <form.AppField name="prompt">
                    {(field) => (
                        <field.TextareaField
                            label="Décrivez l'image"
                            description="Le code reste scannable : l'image se dessine autour de son motif."
                            rows={3}
                            maxLength={400}
                            disabled={running}
                        />
                    )}
                </form.AppField>
                <div className="flex flex-wrap gap-2">
                    {ART_IDEAS.map((idea) => (
                        <Button
                            key={idea}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto min-h-9 rounded-full text-left whitespace-normal"
                            disabled={running}
                            onClick={() => form.setFieldValue("prompt", idea)}
                        >
                            {idea}
                        </Button>
                    ))}
                </div>
                <form.AppField name="style">
                    {(field) => (
                        <field.RadioGroupField
                            label="Équilibre"
                            options={ART_STYLES.map((style) => ({
                                value: style.value,
                                label: `${style.label} : ${style.hint}`,
                            }))}
                        />
                    )}
                </form.AppField>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        className="min-h-11"
                        disabled={running || quota.data.remaining === 0}
                        onClick={() => void form.handleSubmit()}
                    >
                        {running ? (
                            <Loader2Icon className="animate-spin" aria-hidden="true" />
                        ) : (
                            <WandSparklesIcon aria-hidden="true" />
                        )}
                        {running ? "Création en cours…" : "Créer le visuel"}
                    </Button>
                    <p className="text-muted-foreground text-sm">
                        {quota.data.remaining === 0
                            ? "Limite atteinte pour aujourd'hui."
                            : `${quota.data.remaining} sur ${quota.data.limit} restants sur 24 h`}
                    </p>
                </div>
                {running ? (
                    <p role="status" className="text-muted-foreground text-sm">
                        Comptez 20 à 40 secondes. Vous pouvez continuer à régler le reste pendant ce temps.
                    </p>
                ) : null}
                {start.error ? (
                    <p role="alert" className="text-destructive text-sm">
                        {errorMessage(start.error)}
                    </p>
                ) : null}
                {result.data?.status === "failed" ? (
                    <p role="alert" className="text-destructive text-sm">
                        {result.data.error ?? "La génération a échoué."}
                    </p>
                ) : null}
                {result.error ? (
                    <div role="alert" className="text-destructive flex flex-wrap items-center gap-3 text-sm">
                        {errorMessage(result.error)}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11"
                            disabled={result.isFetching}
                            onClick={() => void result.refetch()}
                        >
                            Vérifier à nouveau
                        </Button>
                    </div>
                ) : null}
            </div>

            {ready ? (
                <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[10rem_1fr] sm:items-center">
                    <img src={ready} alt="Visuel IA proposé" className="w-full rounded-lg" />
                    <div className="grid gap-2">
                        <p className="text-sm">
                            Testez-le avec votre téléphone avant de l'adopter. Le badge de lisibilité le vérifie aussi
                            une fois appliqué.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                className="min-h-11"
                                disabled={apply.isPending}
                                onClick={() =>
                                    apply.mutate({ image: ready, prompt: form.getFieldValue("prompt").trim() })
                                }
                            >
                                Utiliser ce visuel
                            </Button>
                            <Button type="button" variant="outline" className="min-h-11" onClick={() => setJobId(null)}>
                                Écarter
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
