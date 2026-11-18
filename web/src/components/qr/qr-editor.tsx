import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-form"
import {
    PlusIcon,
    SplitIcon,
    XIcon,
    DownloadIcon,
    SparklesIcon,
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
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { DesignSections } from "@/components/qr/design-panel"
import { ScanCheck } from "@/components/qr/scan-check"
import { SOCIALS, SOCIAL_IDS, SOCIAL_LABELS, buildSocialUrl, isSocialId } from "@/lib/social"
import type { SocialId } from "@/lib/social"
import { presetLogo } from "@/lib/logos"
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
import {
    GUEST_HINTS,
    GUEST_KINDS,
    KINDS,
    KIND_LABELS,
    emptyContent,
    isDynamic,
    qrPayload,
    readContent,
    readDesign,
    staticPayload,
} from "@/lib/qr"
import type { Contents, Design, Kind, QRCode } from "@/lib/qr"
import { createQr, isQr, updateQr } from "@/lib/qrcodes"
import type { QRPatch } from "@/lib/qrcodes"
import { emailProblem, forKind, phoneProblem, requiredProblem, urlProblem } from "@/lib/qr-rules"
import { clearDraft, draftKey, effectiveStep, loadDraft, saveDraft } from "@/lib/draft"
import type { Draft, Step } from "@/lib/draft"
import { GUEST_PNG_SIZE, useQrDownload } from "@/components/qr/download-buttons"
import { cn } from "@/lib/utils"

const STEPS: Array<{ step: Step; label: string }> = [
    { step: 1, label: "Choisissez le type" },
    { step: 2, label: "Ajoutez du contenu" },
    { step: 3, label: "Personnalisez l'aspect" },
]

type RuleValue = { field: string; value: string; url: string }

type Values = {
    kind: Kind | ""
    name: string
    content: Contents
    protect: boolean
    password: string
    /** A specialised link type (WhatsApp, Instagram...): stored as a link code, only the form differs. */
    preset: SocialId | ""
    social: { value: string; message: string }
    rules: Array<RuleValue>
}

function allContents(existing?: QRCode, draft?: Draft | null): Contents {
    const contents = Object.fromEntries(KINDS.map((kind) => [kind, emptyContent(kind)])) as Contents
    if (existing) Object.assign(contents, { [existing.kind]: readContent(existing.kind, existing.content) })
    if (draft) {
        for (const kind of KINDS) {
            if (kind in draft.content) Object.assign(contents, { [kind]: readContent(kind, draft.content[kind]) })
        }
    }
    return contents
}

export type EditorMode = "create" | "edit" | "guest"

type Props = {
    mode: EditorMode
    existing?: QRCode
    /** The step and kind live in the URL (?etape=, ?type=): reloading or coming back lands on the same screen. */
    step: Step | undefined
    kindHint?: Kind
    onRoute: (next: { step: Step; kind?: Kind }) => void
}

/**
 * The three-step editor: creates a code, changes what an existing one leads to without reprinting it, or (guest)
 * makes a static code without an account. The draft survives leaving the page (sessionStorage).
 */
export function QrEditor({ mode, existing, step: requestedStep, kindHint, onRoute }: Props) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const editing = mode === "edit"
    const guest = mode === "guest"
    const key = draftKey(guest ? "guest" : existing ? `edit:${existing.id}` : "new")
    // An edit draft only applies to the version of the code it was started from.
    const [draft] = useState(() => {
        const found = loadDraft(key)
        return found && (!existing || found.stamp === existing.updated_at) ? found : null
    })
    const [design, setDesign] = useState<Design>(() => draft?.design ?? readDesign(existing?.design))
    const [previewMode, setMode] = useState<PreviewMode>(requestedStep === 3 ? "qr" : "preview")

    const save = useMutation({
        mutationFn: async (values: Values) => {
            const kind = values.kind as Kind
            const content = values.content[kind]
            const password = isDynamic(kind) && values.protect ? values.password : ""
            const rules = kind === "url" ? values.rules : []
            if (!existing) {
                return createQr({ name: values.name, kind, content, design, rules, password: password || undefined })
            }
            const patch: QRPatch = { name: values.name, kind, content, design, rules }
            // Empty while already protected keeps the current password; switched off removes it.
            if (!values.protect && existing.protected) patch.password = ""
            if (values.protect && password) patch.password = password
            return updateQr(existing.id, patch)
        },
        onSuccess: (saved) => {
            if (!isQr(saved)) return
            clearDraft(key)
            void queryClient.invalidateQueries({ queryKey: ["qrcodes"] })
            void queryClient.invalidateQueries({ queryKey: ["stats"] })
            toast.success(
                editing ? "QR code mis à jour. Le code imprimé mène déjà au nouveau contenu." : "QR code créé.",
            )
            void navigate({ to: "/qr-codes/$id", params: { id: saved.id } })
        },
        onError: (error) => {
            // A field the API refused: send the person back to the step that holds it.
            if (error instanceof ApiError && error.field?.startsWith("content")) go(2)
        },
    })

    const defaultValues: Values = {
        kind: draft?.kind || existing?.kind || kindHint || "",
        name: draft?.name ?? existing?.name ?? "",
        content: allContents(existing, draft),
        protect: !guest && (draft?.protect ?? existing?.protected ?? false),
        password: "",
        preset: isSocialId(draft?.preset) ? draft.preset : "",
        social: draft?.social ?? { value: "", message: "" },
        rules: draft?.rules ?? existing?.rules ?? [],
    }
    const form = useAppForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            if (step === 2 && !editing) {
                go(3)
                return
            }
            if (guest) {
                await download.mutateAsync({ format: "png", size: GUEST_PNG_SIZE }).catch(() => undefined)
                return
            }
            await save.mutateAsync(value).catch(() => undefined)
        },
    })

    const values = useStore(form.store, (state) => state.values)
    const kind = values.kind || null
    const step = effectiveStep(requestedStep, values.kind, editing ? 2 : 1)
    const payload = !kind
        ? ""
        : guest
          ? staticPayload(kind, values.content[kind])
          : qrPayload(kind, values.content[kind], shortLink(existing?.slug ?? "xxxxxxx"))
    const download = useQrDownload({ design, data: payload, name: values.name || "qr-code" })

    // Every change is kept for the tab: leaving the page and coming back resumes the same code (never a password).
    useEffect(() => {
        saveDraft(key, {
            kind: values.kind,
            name: values.name,
            content: values.content,
            protect: values.protect,
            design,
            stamp: existing?.updated_at ?? "",
            preset: values.preset,
            social: values.social,
            rules: values.rules,
        })
    }, [
        key,
        values.kind,
        values.name,
        values.content,
        values.protect,
        values.preset,
        values.social,
        values.rules,
        design,
        existing?.updated_at,
    ])

    function go(next: Step, nextKind?: Kind) {
        setMode(next === 3 ? "qr" : "preview")
        onRoute({ step: next, kind: nextKind ?? kind ?? undefined })
    }

    const chooseKind = (next: Kind) => {
        form.setFieldValue("kind", next)
        form.setFieldValue("preset", "")
        if (!isDynamic(next)) form.setFieldValue("protect", false)
        go(2, next)
    }

    const chooseSocial = (id: SocialId) => {
        form.setFieldValue("kind", "url")
        form.setFieldValue("preset", id)
        const logo = SOCIALS[id].logo
        // The brand's logo goes in the middle, unless the person already chose one (never on guest codes).
        if (logo && !guest && !design.logo.image && !design.logo.preset) {
            setDesign({ ...design, logo: { ...design.logo, preset: logo } })
        }
        go(2, "url")
    }

    const typeTitle = values.preset ? SOCIALS[values.preset].title : KIND_LABELS[kind ?? "url"].title

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
                              ? `${editing ? "Modifiez le contenu" : "Ajoutez du contenu"} : ${typeTitle}`
                              : "Personnalisez l'aspect"}
                    </h1>

                    {step === 1 ? (
                        <>
                            <KindPicker
                                current={values.preset ? null : kind}
                                kinds={guest ? GUEST_KINDS : editing ? KINDS.filter(isDynamic) : KINDS}
                                hints={guest ? GUEST_HINTS : undefined}
                                onPick={chooseKind}
                            />
                            <SocialPicker current={values.preset || null} onPick={chooseSocial} />
                        </>
                    ) : null}

                    {step === 2 && kind ? (
                        <Accordion type="multiple" defaultValue={["content", "name"]} className="grid gap-4">
                            <EditorSection
                                value="content"
                                icon={KIND_ICONS[kind]}
                                title={typeTitle}
                                description={
                                    guest
                                        ? "Sans compte, ce contenu est inscrit dans le code : il ne pourra plus être modifié ni suivi."
                                        : isDynamic(kind)
                                          ? "Ce contenu reste modifiable après impression."
                                          : "Un code Wi-Fi est statique : le réseau est inscrit dans le motif, il n'est ni modifiable ni comptabilisé."
                                }
                            >
                                {kind === "url" && values.preset ? (
                                    <SocialFields form={form} preset={values.preset} />
                                ) : (
                                    <ContentFields form={form} kind={kind} />
                                )}
                            </EditorSection>
                            {kind === "url" && !guest ? (
                                <EditorSection
                                    value="utm"
                                    icon={MegaphoneIcon}
                                    title="Suivi de campagne (UTM)"
                                    description="Ajoutés au lien pour vos outils d'analyse (facultatif)"
                                >
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <form.AppField name="content.url.utm_source">
                                            {(field) => (
                                                <field.TextField
                                                    label="Source"
                                                    placeholder="flyer"
                                                    maxLength={80}
                                                    className="h-11"
                                                />
                                            )}
                                        </form.AppField>
                                        <form.AppField name="content.url.utm_medium">
                                            {(field) => (
                                                <field.TextField
                                                    label="Support"
                                                    placeholder="print"
                                                    maxLength={80}
                                                    className="h-11"
                                                />
                                            )}
                                        </form.AppField>
                                        <form.AppField name="content.url.utm_campaign">
                                            {(field) => (
                                                <field.TextField
                                                    label="Campagne"
                                                    placeholder="soldes-hiver"
                                                    maxLength={80}
                                                    className="h-11"
                                                />
                                            )}
                                        </form.AppField>
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        Astuce : imprimez des variantes en ajoutant{" "}
                                        <code className="font-mono">?utm_source=…</code> au lien court. Chaque variante
                                        est comptée à part dans les statistiques.
                                    </p>
                                </EditorSection>
                            ) : null}
                            {kind === "url" && !guest ? (
                                <EditorSection
                                    value="rules"
                                    icon={SplitIcon}
                                    title="Redirection selon le visiteur"
                                    description="Une destination par appareil, système, pays ou langue (facultatif)"
                                >
                                    <RulesEditor form={form} />
                                </EditorSection>
                            ) : null}
                            <EditorSection
                                value="name"
                                icon={PencilIcon}
                                title="Nom du QR code"
                                description={
                                    guest
                                        ? "Sert de nom au fichier téléchargé (facultatif)"
                                        : "Pour le retrouver dans votre liste (facultatif)"
                                }
                            >
                                <form.AppField
                                    name="name"
                                    validators={{
                                        onSubmit: ({ value }) =>
                                            value.length > 120 ? "120 caractères au maximum." : undefined,
                                    }}
                                >
                                    {(field) => (
                                        <field.TextField
                                            label="Nom du QR code"
                                            placeholder="p. ex., Menu du restaurant"
                                            className="h-11"
                                        />
                                    )}
                                </form.AppField>
                            </EditorSection>
                        </Accordion>
                    ) : null}

                    {step === 3 && kind ? (
                        <Accordion type="multiple" defaultValue={["presets"]} className="grid gap-4">
                            <DesignSections design={design} onChange={setDesign} limited={guest} />
                            {isDynamic(kind) && !guest ? (
                                <EditorSection
                                    value="password"
                                    icon={LockIcon}
                                    title="Mot de passe"
                                    description="Demander un mot de passe pour ouvrir ce QR code"
                                >
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
                    {guest && step === 3 ? <GuestUpsell /> : null}
                    <PhonePreview
                        kind={kind}
                        content={kind ? values.content[kind] : null}
                        name={values.name}
                        design={design}
                        payload={payload}
                        mode={previewMode}
                        onModeChange={setMode}
                        locked={values.protect}
                    />
                    {step === 3 && payload ? <ScanCheck design={design} data={payload} className="mt-4" /> : null}
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
                        if (step > 1 && !(editing && step === 2)) go((step - 1) as Step)
                        else if (existing) void navigate({ to: "/qr-codes/$id", params: { id: existing.id } })
                        else void navigate({ to: guest ? "/" : "/qr-codes" })
                    }}
                >
                    <ArrowLeftIcon aria-hidden />
                    Retour
                </Button>
                <nav
                    aria-label="Étapes"
                    className="order-last flex w-full justify-center md:order-none md:w-auto md:flex-1"
                >
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
                                        onClick={() => go(item.step)}
                                        className={cn(
                                            "flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm disabled:cursor-default",
                                            current
                                                ? "font-medium"
                                                : "text-muted-foreground enabled:hover:text-foreground",
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
                    <Button
                        type="submit"
                        className="ml-auto min-h-11 min-w-40 md:ml-0"
                        disabled={save.isPending || download.isPending}
                    >
                        {save.isPending || download.isPending ? (
                            <Loader2Icon className="animate-spin" aria-hidden />
                        ) : null}
                        {step === 2 && !editing ? (
                            <>
                                Suivant <ArrowRightIcon aria-hidden />
                            </>
                        ) : guest ? (
                            <>
                                <DownloadIcon aria-hidden /> Télécharger (PNG {GUEST_PNG_SIZE} px)
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

function KindPicker({
    current,
    kinds,
    hints,
    onPick,
}: {
    current: Kind | null
    kinds: ReadonlyArray<Kind>
    hints?: Partial<Record<Kind, string>>
    onPick: (kind: Kind) => void
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {kinds.map((kind) => (
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
                        <span className="text-muted-foreground text-sm">{hints?.[kind] ?? KIND_LABELS[kind].hint}</span>
                    </span>
                    {kind === "url" ? (
                        <Badge className="absolute -top-2.5 right-4 text-[10px] uppercase">Le plus utilisé</Badge>
                    ) : null}
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
                <form.AppField
                    name="content.text.text"
                    validators={of(
                        (v) =>
                            requiredProblem(v, "Le texte est obligatoire.") ??
                            (v.length > 2000 ? "2000 caractères au maximum." : undefined),
                    )}
                >
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
                        {(field) => (
                            <field.TextField label="Organisation" autoComplete="organization" className="h-11" />
                        )}
                    </form.AppField>
                    <form.AppField name="content.vcard.title">
                        {(field) => (
                            <field.TextField label="Fonction" autoComplete="organization-title" className="h-11" />
                        )}
                    </form.AppField>
                    <form.AppField name="content.vcard.phone" validators={of((v) => phoneProblem(v, false))}>
                        {(field) => (
                            <field.TextField label="Téléphone" type="tel" autoComplete="tel" className="h-11" />
                        )}
                    </form.AppField>
                    <form.AppField name="content.vcard.email" validators={of((v) => emailProblem(v, false))}>
                        {(field) => (
                            <field.TextField label="E-mail" type="email" autoComplete="email" className="h-11" />
                        )}
                    </form.AppField>
                    <form.AppField
                        name="content.vcard.website"
                        validators={of((v) => (v.trim() ? urlProblem(v) : undefined))}
                    >
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
                    <form.AppField
                        name="content.wifi.ssid"
                        validators={of((v) => requiredProblem(v, "Le nom du réseau est obligatoire."))}
                    >
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
                                    {(field) => (
                                        <field.TextField
                                            label="Mot de passe du réseau *"
                                            className="h-11"
                                            autoComplete="off"
                                        />
                                    )}
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
                    {(field) => (
                        <field.TextField
                            label="Numéro de téléphone *"
                            type="tel"
                            autoComplete="tel"
                            placeholder="+229 97 00 00 00"
                            className="h-11"
                        />
                    )}
                </form.AppField>
            )
        case "sms":
            return (
                <div className="grid gap-4">
                    <form.AppField name="content.sms.phone" validators={of((v) => phoneProblem(v))}>
                        {(field) => (
                            <field.TextField
                                label="Numéro de téléphone *"
                                type="tel"
                                placeholder="+229 97 00 00 00"
                                className="h-11"
                            />
                        )}
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
                                    return value.length < 6 || value.length > 72
                                        ? "Entre 6 et 72 caractères."
                                        : undefined
                                },
                            }}
                        >
                            {(field) => (
                                <field.TextField
                                    label={alreadyProtected ? "Nouveau mot de passe" : "Mot de passe"}
                                    type="password"
                                    autoComplete="new-password"
                                    className="h-11 max-w-sm"
                                    description={
                                        alreadyProtected
                                            ? "Laissez vide pour garder le mot de passe actuel."
                                            : "À communiquer aux personnes autorisées."
                                    }
                                />
                            )}
                        </form.AppField>
                    ) : null}
                </div>
            )}
        </form.Subscribe>
    )
}

/** What an account adds, shown where a guest feels the limit: next to the download. */
function GuestUpsell() {
    return (
        <div className="bg-accent text-accent-foreground mb-5 grid gap-2 rounded-xl p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
                <SparklesIcon className="size-4" aria-hidden="true" />
                Avec un compte gratuit
            </p>
            <p>
                Destination modifiable après impression, statistiques de scans, logo, cadres « Scannez-moi » et export
                PNG 4096 px ou SVG.
            </p>
            <Link to="/inscription" className="font-semibold underline">
                Créer un compte
            </Link>
        </div>
    )
}

/** Specialised link types, below the base ones: the brand mark makes them easy to spot. */
function SocialPicker({ current, onPick }: { current: SocialId | null; onPick: (id: SocialId) => void }) {
    return (
        <section aria-labelledby="types-reseaux" className="grid gap-3">
            <h2 id="types-reseaux" className="font-heading text-lg font-semibold">
                Réseaux et messageries
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {SOCIAL_IDS.map((id) => {
                    const social = SOCIALS[id]
                    const logo = social.logo ? presetLogo(social.logo) : null
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onPick(id)}
                            aria-pressed={current === id}
                            className={cn(
                                "bg-card hover:border-primary/60 flex min-h-16 items-center gap-3 rounded-xl border-2 p-3 text-left shadow-xs transition-colors",
                                current === id ? "border-primary" : "border-transparent",
                            )}
                        >
                            {logo ? (
                                <img src={logo} alt="" className="size-10 shrink-0" />
                            ) : (
                                <span className="bg-accent text-accent-foreground font-heading grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold">
                                    {social.title.slice(0, 2)}
                                </span>
                            )}
                            <span className="grid gap-0.5">
                                <span className="font-semibold">{social.title}</span>
                                <span className="text-muted-foreground text-xs">{social.hint}</span>
                            </span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}

/** The handle or number a specialised type needs; the link itself is built as the person types. */
function SocialFields({ form, preset }: { form: EditorForm; preset: SocialId }) {
    const labels = SOCIAL_LABELS[preset]
    const sync = () => {
        const social = form.getFieldValue("social")
        form.setFieldValue("content.url.url", buildSocialUrl(preset, social))
    }
    return (
        <div className="grid gap-4">
            <form.AppField
                name="social.value"
                validators={{
                    onSubmit: ({ value }) =>
                        form.getFieldValue("preset") !== preset
                            ? undefined
                            : !value.trim()
                              ? "Ce champ est obligatoire."
                              : urlProblem(buildSocialUrl(preset, form.getFieldValue("social"))),
                }}
                listeners={{ onChange: sync }}
            >
                {(field) => (
                    <field.TextField
                        label={`${labels.label} *`}
                        placeholder={labels.placeholder}
                        description={labels.description}
                        type={preset === "whatsapp" ? "tel" : "text"}
                        className="h-11"
                    />
                )}
            </form.AppField>
            {preset === "whatsapp" ? (
                <form.AppField name="social.message" listeners={{ onChange: sync }}>
                    {(field) => <field.TextareaField label="Message prérempli (facultatif)" rows={3} maxLength={500} />}
                </form.AppField>
            ) : null}
            <form.Subscribe selector={(state) => state.values.content.url.url}>
                {(url) =>
                    url ? (
                        <p className="text-muted-foreground text-sm break-all">
                            Lien créé : <span className="text-foreground font-medium">{url}</span>
                        </p>
                    ) : null
                }
            </form.Subscribe>
        </div>
    )
}

const RULE_FIELDS = [
    { value: "os", label: "Système" },
    { value: "device", label: "Appareil" },
    { value: "country", label: "Pays (code)" },
    { value: "language", label: "Langue (code)" },
] as const

const RULE_CHOICES: Record<string, Array<{ value: string; label: string }>> = {
    os: ["iOS", "Android", "Windows", "macOS", "Linux", "ChromeOS"].map((v) => ({ value: v, label: v })),
    device: [
        { value: "mobile", label: "Mobile" },
        { value: "tablet", label: "Tablette" },
        { value: "desktop", label: "Ordinateur" },
    ],
}

/** First matching rule wins; no match keeps the main destination. Checked again by the API. */
function RulesEditor({ form }: { form: EditorForm }) {
    return (
        <form.Field
            name="rules"
            validators={{
                onSubmit: ({ value }) => {
                    for (const [index, rule] of value.entries()) {
                        if (!rule.value.trim()) return `Règle ${index + 1} : choisissez une valeur.`
                        const problem = urlProblem(rule.url)
                        if (problem) return `Règle ${index + 1} : ${problem}`
                    }
                    return undefined
                },
            }}
        >
            {(field) => {
                const rules = field.state.value
                const update = (index: number, patch: Partial<RuleValue>) =>
                    field.handleChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
                const errors = field.state.meta.errors.filter(Boolean)
                return (
                    <div className="grid gap-4">
                        <p className="text-muted-foreground text-sm">
                            Exemple : les iPhone vers l'App Store, les Android vers le Play Store, les autres vers votre
                            site. La première règle qui correspond s'applique.
                        </p>
                        {rules.map((rule, index) => (
                            <fieldset
                                key={index}
                                className="bg-muted/50 grid gap-3 rounded-xl p-4 sm:grid-cols-[10rem_10rem_minmax(0,1fr)_auto] sm:items-end"
                            >
                                <legend className="sr-only">Règle {index + 1}</legend>
                                <label className="grid gap-1.5 text-sm font-medium">
                                    Critère
                                    <select
                                        className="bg-card h-11 rounded-md border px-3 text-sm"
                                        value={rule.field}
                                        onChange={(event) => update(index, { field: event.target.value, value: "" })}
                                    >
                                        {RULE_FIELDS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="grid gap-1.5 text-sm font-medium">
                                    Valeur
                                    {Object.hasOwn(RULE_CHOICES, rule.field) ? (
                                        <select
                                            className="bg-card h-11 rounded-md border px-3 text-sm"
                                            value={rule.value}
                                            onChange={(event) => update(index, { value: event.target.value })}
                                        >
                                            <option value="">Choisir…</option>
                                            {RULE_CHOICES[rule.field].map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            className="bg-card h-11 rounded-md border px-3 text-sm uppercase"
                                            maxLength={rule.field === "language" ? 3 : 2}
                                            placeholder={rule.field === "country" ? "BJ" : "fr"}
                                            value={rule.value}
                                            onChange={(event) => update(index, { value: event.target.value })}
                                        />
                                    )}
                                </label>
                                <label className="grid gap-1.5 text-sm font-medium">
                                    Destination
                                    <input
                                        className="bg-card h-11 rounded-md border px-3 text-sm"
                                        inputMode="url"
                                        placeholder="apps.apple.com/…"
                                        value={rule.url}
                                        onChange={(event) => update(index, { url: event.target.value })}
                                    />
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-11"
                                    aria-label={`Supprimer la règle ${index + 1}`}
                                    onClick={() => field.handleChange(rules.filter((_, i) => i !== index))}
                                >
                                    <XIcon />
                                </Button>
                            </fieldset>
                        ))}
                        {errors.length > 0 ? (
                            <p role="alert" className="text-destructive text-sm">
                                {String(errors[0])}
                            </p>
                        ) : null}
                        {rules.length < 10 ? (
                            <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 justify-self-start"
                                onClick={() => field.handleChange([...rules, { field: "os", value: "", url: "" }])}
                            >
                                <PlusIcon aria-hidden /> Ajouter une règle
                            </Button>
                        ) : null}
                    </div>
                )
            }}
        </form.Field>
    )
}
