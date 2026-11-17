import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-form"
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckIcon,
    ChevronRightIcon,
    LinkIcon,
    Loader2Icon,
    LockIcon,
    MegaphoneIcon,
    PencilIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DesignSections } from "@/components/qr/design-panel"
import { EditorSection } from "@/components/qr/editor-section"
import { KIND_ICONS, KindIcon } from "@/components/qr/kind-icon"
import { PhonePreview } from "@/components/qr/phone-preview"
import type { PreviewMode } from "@/components/qr/phone-preview"
import { Accordion } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAppForm } from "@/hooks/form"
import { ApiError, errorMessage, shortLink } from "@/lib/api"
import { KINDS, KIND_LABELS, emptyContent, isDynamic, qrPayload, readContent, readDesign } from "@/lib/qr"
import type { Contents, Design, Kind, QRCode } from "@/lib/qr"
import { createQr, isQr, updateQr } from "@/lib/qrcodes"
import type { QRPatch } from "@/lib/qrcodes"
import { emailProblem, forKind, phoneProblem, requiredProblem, urlProblem } from "@/lib/qr-rules"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3

const STEPS: Array<{ step: Step; label: string }> = [
    { step: 1, label: "Choisissez le type" },
    { step: 2, label: "Ajoutez du contenu" },
    { step: 3, label: "Personnalisez l'aspect" },
]

type Values = {
    kind: Kind | ""
    name: string
    content: Contents
    protect: boolean
    password: string
}

function allContents(existing?: QRCode): Contents {
    const contents = Object.fromEntries(KINDS.map((kind) => [kind, emptyContent(kind)])) as Contents
    if (existing) Object.assign(contents, { [existing.kind]: readContent(existing.kind, existing.content) })
    return contents
}

/** The three-step editor: creates a code, or changes what an existing one leads to without reprinting it. */
export function QrEditor({ existing }: { existing?: QRCode }) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const editing = Boolean(existing)
    const [step, setStep] = useState<Step>(editing ? 2 : 1)
    const [design, setDesign] = useState<Design>(() => readDesign(existing?.design))
    const [mode, setMode] = useState<PreviewMode>("preview")

    const save = useMutation({
        mutationFn: async (values: Values) => {
            const kind = values.kind as Kind
            const content = values.content[kind]
            const password = isDynamic(kind) && values.protect ? values.password : ""
            if (!existing) {
                return createQr({ name: values.name, kind, content, design, password: password || undefined })
            }
            const patch: QRPatch = { name: values.name, kind, content, design }
            // Empty while already protected keeps the current password; switched off removes it.
            if (!values.protect && existing.protected) patch.password = ""
            if (values.protect && password) patch.password = password
            return updateQr(existing.id, patch)
        },
        onSuccess: (saved) => {
            if (!isQr(saved)) return
            void queryClient.invalidateQueries({ queryKey: ["qrcodes"] })
            void queryClient.invalidateQueries({ queryKey: ["stats"] })
            toast.success(editing ? "QR code mis à jour. Le code imprimé mène déjà au nouveau contenu." : "QR code créé.")
            void navigate({ to: "/qr-codes/$id", params: { id: saved.id } })
        },
        onError: (error) => {
            // A field the API refused: send the person back to the step that holds it.
            if (error instanceof ApiError && error.field?.startsWith("content")) setStep(2)
        },
    })

    const defaultValues: Values = {
        kind: existing?.kind ?? "",
        name: existing?.name ?? "",
        content: allContents(existing),
        protect: existing?.protected ?? false,
        password: "",
    }
    const form = useAppForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            if (step === 2 && !editing) {
                setStep(3)
                setMode("qr")
                return
            }
            await save.mutateAsync(value).catch(() => undefined)
        },
    })

    const values = useStore(form.store, (state) => state.values)
    const kind = values.kind || null
    const payload = kind ? qrPayload(kind, values.content[kind], shortLink(existing?.slug ?? "xxxxxxx")) : ""

    const chooseKind = (next: Kind) => {
        form.setFieldValue("kind", next)
        if (!isDynamic(next)) form.setFieldValue("protect", false)
        setStep(2)
        setMode("preview")
    }

    const canVisit = (target: Step) => {
        if (target === 1) return !editing || (existing ? isDynamic(existing.kind) : true)
        return Boolean(kind) && (target === 2 || editing || step === 3)
    }

    return (
        <form
            noValidate
            className="flex min-h-svh flex-col"
            onSubmit={(event) => {
                event.preventDefault()
                void form.handleSubmit()
            }}
        >
            <div className="grid flex-1 gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 lg:p-10">
                <div className="grid min-w-0 content-start gap-6">
                    <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                        {step === 1
                            ? "Choisissez le type de QR code"
                            : step === 2
                              ? `${editing ? "Modifiez le contenu" : "Ajoutez du contenu"} : ${KIND_LABELS[kind ?? "url"].title}`
                              : "Personnalisez l'aspect"}
                    </h1>

                    {step === 1 ? (
                        <KindPicker
                            current={kind}
                            lockedToDynamic={editing}
                            onPick={chooseKind}
                        />
                    ) : null}

                    {step === 2 && kind ? (
                        <Accordion type="multiple" defaultValue={["content", "name"]} className="grid gap-4">
                            <EditorSection
                                value="content"
                                icon={KIND_ICONS[kind]}
                                title={KIND_LABELS[kind].title}
                                description={
                                    isDynamic(kind)
                                        ? "Ce contenu reste modifiable après impression."
                                        : "Un code Wi-Fi est statique : le réseau est inscrit dans le motif, il n'est ni modifiable ni comptabilisé."
                                }
                            >
                                <ContentFields form={form} kind={kind} />
                            </EditorSection>
                            {kind === "url" ? (
                                <EditorSection
                                    value="utm"
                                    icon={MegaphoneIcon}
                                    title="Suivi de campagne (UTM)"
                                    description="Ajoutés au lien pour vos outils d'analyse (facultatif)"
                                >
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <form.AppField name="content.url.utm_source">
                                            {(field) => <field.TextField label="Source" placeholder="flyer" maxLength={80} className="h-11" />}
                                        </form.AppField>
                                        <form.AppField name="content.url.utm_medium">
                                            {(field) => <field.TextField label="Support" placeholder="print" maxLength={80} className="h-11" />}
                                        </form.AppField>
                                        <form.AppField name="content.url.utm_campaign">
                                            {(field) => <field.TextField label="Campagne" placeholder="soldes-hiver" maxLength={80} className="h-11" />}
                                        </form.AppField>
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        Astuce : imprimez des variantes en ajoutant <code className="font-mono">?utm_source=…</code> au
                                        lien court. Chaque variante est comptée à part dans les statistiques.
                                    </p>
                                </EditorSection>
                            ) : null}
                            <EditorSection value="name" icon={PencilIcon} title="Nom du QR code" description="Pour le retrouver dans votre liste (facultatif)">
                                <form.AppField
                                    name="name"
                                    validators={{ onSubmit: ({ value }) => (value.length > 120 ? "120 caractères au maximum." : undefined) }}
                                >
                                    {(field) => <field.TextField label="Nom du QR code" placeholder="p. ex., Menu du restaurant" className="h-11" />}
                                </form.AppField>
                            </EditorSection>
                        </Accordion>
                    ) : null}

                    {step === 3 && kind ? (
                        <Accordion type="multiple" defaultValue={["frame"]} className="grid gap-4">
                            <DesignSections design={design} onChange={setDesign} />
                            {isDynamic(kind) ? (
                                <EditorSection value="password" icon={LockIcon} title="Mot de passe" description="Demander un mot de passe pour ouvrir ce QR code">
                                    <PasswordFields form={form} alreadyProtected={existing?.protected ?? false} />
                                </EditorSection>
                            ) : null}
                        </Accordion>
                    ) : null}

                    {save.error ? (
                        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
                            {errorMessage(save.error, "L'enregistrement a échoué.")}
                        </p>
                    ) : null}
                </div>

                <aside aria-label="Aperçu" className="lg:sticky lg:top-6 lg:self-start">
                    <PhonePreview
                        kind={kind}
                        content={kind ? values.content[kind] : null}
                        name={values.name}
                        design={design}
                        payload={payload}
                        mode={mode}
                        onModeChange={setMode}
                        locked={values.protect}
                    />
                    {existing && isDynamic(existing.kind) ? (
                        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-center text-xs">
                            <LinkIcon className="size-3.5" aria-hidden="true" />
                            <span className="font-mono">{shortLink(existing.slug)}</span>
                        </p>
                    ) : null}
                </aside>
            </div>

            <footer className="bg-card/95 sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
                <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    onClick={() => {
                        if (step > 1 && !(editing && step === 2)) setStep((step - 1) as Step)
                        else if (existing) void navigate({ to: "/qr-codes/$id", params: { id: existing.id } })
                        else void navigate({ to: "/qr-codes" })
                    }}
                >
                    <ArrowLeftIcon aria-hidden />
                    Retour
                </Button>
                <nav aria-label="Étapes" className="order-last flex w-full justify-center md:order-none md:w-auto md:flex-1">
                    <ol className="flex flex-wrap items-center gap-1">
                        {STEPS.map((item, index) => {
                            const done = item.step < step
                            const current = item.step === step
                            return (
                                <li key={item.step} className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={!canVisit(item.step) || current}
                                        aria-current={current ? "step" : undefined}
                                        onClick={() => {
                                            setStep(item.step)
                                            setMode(item.step === 3 ? "qr" : "preview")
                                        }}
                                        className={cn(
                                            "flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm disabled:cursor-default",
                                            current ? "font-medium" : "text-muted-foreground enabled:hover:text-foreground",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "grid size-7 place-items-center rounded-full border text-xs",
                                                current && "bg-primary border-primary text-primary-foreground",
                                            )}
                                        >
                                            {done ? <CheckIcon className="size-3.5" aria-label="fait" /> : item.step}
                                        </span>
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </button>
                                    {index < STEPS.length - 1 ? (
                                        <ChevronRightIcon className="text-muted-foreground size-4" aria-hidden="true" />
                                    ) : null}
                                </li>
                            )
                        })}
                    </ol>
                </nav>
                {step === 1 ? (
                    <span className="ml-auto md:ml-0 md:w-40" />
                ) : (
                    <Button type="submit" className="ml-auto min-h-11 min-w-40 md:ml-0" disabled={save.isPending}>
                        {save.isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
                        {step === 2 && !editing ? (
                            <>
                                Suivant <ArrowRightIcon aria-hidden />
                            </>
                        ) : editing ? (
                            "Enregistrer"
                        ) : (
                            "Créer le QR code"
                        )}
                    </Button>
                )}
            </footer>
        </form>
    )
}

function KindPicker({ current, lockedToDynamic, onPick }: { current: Kind | null; lockedToDynamic: boolean; onPick: (kind: Kind) => void }) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {KINDS.filter((kind) => !lockedToDynamic || isDynamic(kind)).map((kind) => (
                <button
                    key={kind}
                    type="button"
                    onClick={() => onPick(kind)}
                    aria-pressed={current === kind}
                    className={cn(
                        "bg-card hover:border-primary/60 relative flex min-h-24 items-center gap-4 rounded-xl border-2 p-5 text-left shadow-xs transition-colors",
                        current === kind ? "border-primary" : "border-transparent",
                    )}
                >
                    <KindIcon kind={kind} className="size-12" />
                    <span className="grid gap-1">
                        <span className="font-heading text-lg font-semibold">{KIND_LABELS[kind].title}</span>
                        <span className="text-muted-foreground text-sm">{KIND_LABELS[kind].hint}</span>
                    </span>
                    {kind === "url" ? <Badge className="absolute -top-2.5 right-4 text-[10px] uppercase">Le plus utilisé</Badge> : null}
                </button>
            ))}
        </div>
    )
}

type EditorForm = ReturnType<typeof useEditorFormType>
// Only used for its type: the form instance QrEditor builds.
function useEditorFormType() {
    return useAppForm({ defaultValues: {} as Values })
}

function ContentFields({ form, kind }: { form: EditorForm; kind: Kind }) {
    const of = (check: (value: string) => string | undefined) => ({
        onSubmit: ({ value }: { value: string }) => forKind(form.getFieldValue("kind"), kind, () => check(value)),
    })
    switch (kind) {
        case "url":
            return (
                <form.AppField name="content.url.url" validators={of(urlProblem)}>
                    {(field) => (
                        <field.TextField
                            label="URL de site web *"
                            placeholder="p. ex., www.monsiteweb.com"
                            inputMode="url"
                            autoComplete="url"
                            className="h-11"
                            description="Changez-la quand vous voulez : le QR code imprimé suivra."
                        />
                    )}
                </form.AppField>
            )
        case "text":
            return (
                <form.AppField name="content.text.text" validators={of((v) => requiredProblem(v, "Le texte est obligatoire.") ?? (v.length > 2000 ? "2000 caractères au maximum." : undefined))}>
                    {(field) => <field.TextareaField label="Texte *" rows={6} maxLength={2000} />}
                </form.AppField>
            )
        case "vcard":
            return (
                <div className="grid gap-4 sm:grid-cols-2">
                    <form.AppField
                        name="content.vcard.first_name"
                        validators={{
                            onSubmit: ({ value }) =>
                                forKind(form.getFieldValue("kind"), "vcard", () => {
                                    const c = form.getFieldValue("content").vcard
                                    return value.trim() || c.last_name.trim() || c.organization.trim()
                                        ? undefined
                                        : "Indiquez au moins un nom ou une organisation."
                                }),
                        }}
                    >
                        {(field) => <field.TextField label="Prénom" autoComplete="given-name" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.vcard.last_name">
                        {(field) => <field.TextField label="Nom" autoComplete="family-name" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.vcard.organization">
                        {(field) => <field.TextField label="Organisation" autoComplete="organization" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.vcard.title">
                        {(field) => <field.TextField label="Fonction" autoComplete="organization-title" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.vcard.phone" validators={of((v) => phoneProblem(v, false))}>
                        {(field) => <field.TextField label="Téléphone" type="tel" autoComplete="tel" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.vcard.email" validators={of((v) => emailProblem(v, false))}>
                        {(field) => <field.TextField label="E-mail" type="email" autoComplete="email" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.vcard.website" validators={of((v) => (v.trim() ? urlProblem(v) : undefined))}>
                        {(field) => <field.TextField label="Site web" inputMode="url" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.vcard.address">
                        {(field) => <field.TextField label="Adresse" autoComplete="street-address" className="h-11" />}
                    </form.AppField>
                    <div className="sm:col-span-2">
                        <form.AppField name="content.vcard.note">
                            {(field) => <field.TextareaField label="Note" rows={3} maxLength={200} />}
                        </form.AppField>
                    </div>
                </div>
            )
        case "wifi":
            return (
                <div className="grid gap-4 sm:grid-cols-2">
                    <form.AppField name="content.wifi.ssid" validators={of((v) => requiredProblem(v, "Le nom du réseau est obligatoire."))}>
                        {(field) => <field.TextField label="Nom du réseau (SSID) *" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.wifi.encryption">
                        {(field) => (
                            <field.SelectField
                                label="Sécurité"
                                options={[
                                    { value: "WPA", label: "WPA / WPA2 / WPA3" },
                                    { value: "WEP", label: "WEP" },
                                    { value: "nopass", label: "Aucune (réseau ouvert)" },
                                ]}
                            />
                        )}
                    </form.AppField>
                    <form.Subscribe selector={(state) => state.values.content.wifi.encryption}>
                        {(encryption) =>
                            encryption === "nopass" ? null : (
                                <form.AppField
                                    name="content.wifi.password"
                                    validators={of((v) =>
                                        form.getFieldValue("content").wifi.encryption === "nopass"
                                            ? undefined
                                            : requiredProblem(v, "Le mot de passe du réseau est obligatoire."),
                                    )}
                                >
                                    {(field) => <field.TextField label="Mot de passe du réseau *" className="h-11" autoComplete="off" />}
                                </form.AppField>
                            )
                        }
                    </form.Subscribe>
                    <form.AppField name="content.wifi.hidden">
                        {(field) => <field.CheckboxField label="Réseau masqué" />}
                    </form.AppField>
                </div>
            )
        case "email":
            return (
                <div className="grid gap-4">
                    <form.AppField name="content.email.to" validators={of((v) => emailProblem(v))}>
                        {(field) => <field.TextField label="Destinataire *" type="email" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.email.subject">
                        {(field) => <field.TextField label="Objet" maxLength={200} className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.email.body">
                        {(field) => <field.TextareaField label="Message" rows={4} maxLength={1000} />}
                    </form.AppField>
                </div>
            )
        case "phone":
            return (
                <form.AppField name="content.phone.phone" validators={of((v) => phoneProblem(v))}>
                    {(field) => <field.TextField label="Numéro de téléphone *" type="tel" autoComplete="tel" placeholder="+229 97 00 00 00" className="h-11" />}
                </form.AppField>
            )
        case "sms":
            return (
                <div className="grid gap-4">
                    <form.AppField name="content.sms.phone" validators={of((v) => phoneProblem(v))}>
                        {(field) => <field.TextField label="Numéro de téléphone *" type="tel" placeholder="+229 97 00 00 00" className="h-11" />}
                    </form.AppField>
                    <form.AppField name="content.sms.message">
                        {(field) => <field.TextareaField label="Message prérempli" rows={3} maxLength={500} />}
                    </form.AppField>
                </div>
            )
    }
}

function PasswordFields({ form, alreadyProtected }: { form: EditorForm; alreadyProtected: boolean }) {
    return (
        <form.Subscribe selector={(state) => state.values.protect}>
            {(protect) => (
                <div className="grid gap-4">
                    <div className="flex min-h-11 items-center gap-3">
                        <Switch
                            id="protect"
                            checked={protect}
                            onCheckedChange={(checked) => form.setFieldValue("protect", checked)}
                        />
                        <Label htmlFor="protect" className="cursor-pointer font-normal">
                            Exiger un mot de passe pour ouvrir ce QR code
                        </Label>
                    </div>
                    {protect ? (
                        <form.AppField
                            name="password"
                            validators={{
                                onSubmit: ({ value }) => {
                                    if (!form.getFieldValue("protect")) return undefined
                                    if (!value && alreadyProtected) return undefined
                                    return value.length < 4 || value.length > 72 ? "Entre 4 et 72 caractères." : undefined
                                },
                            }}
                        >
                            {(field) => (
                                <field.TextField
                                    label={alreadyProtected ? "Nouveau mot de passe" : "Mot de passe"}
                                    type="password"
                                    autoComplete="new-password"
                                    className="h-11 max-w-sm"
                                    description={alreadyProtected ? "Laissez vide pour garder le mot de passe actuel." : "À communiquer aux personnes autorisées."}
                                />
                            )}
                        </form.AppField>
                    ) : null}
                </div>
            )}
        </form.Subscribe>
    )
}
