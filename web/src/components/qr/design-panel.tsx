import { useMutation } from "@tanstack/react-query"
import {
    SparklesIcon,
    ArrowLeftRightIcon,
    BanIcon,
    FrameIcon,
    Grid3x3Icon,
    ImagePlusIcon,
    ScanIcon,
    Trash2Icon,
} from "lucide-react"
import { useId } from "react"
import type { ReactNode } from "react"

import { ChoiceGrid } from "@/components/qr/choice-grid"
import { ColorField } from "@/components/qr/color-field"
import { EditorSection } from "@/components/qr/editor-section"
import { QrImage } from "@/components/qr/qr-image"
import { STYLE_PRESETS, applyPreset } from "@/lib/style-presets"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { LOGO_PRESETS, presetLogo, resizeLogo } from "@/lib/logos"
import type { Design } from "@/lib/qr"
import { cn } from "@/lib/utils"

type Props = { design: Design; onChange: (design: Design) => void }

const none = <BanIcon className="size-7" strokeWidth={1.5} />

/** A 3x3 sample of a dot style, drawn the way qr-code-styling draws it. */
function DotSample({ style }: { style: Design["dots"]["style"] }) {
    const cells = [
        [0, 0],
        [1, 0],
        [0, 1],
        [2, 1],
        [1, 2],
        [2, 2],
        [0, 2],
    ]
    return (
        <svg viewBox="0 0 30 30" className="size-9">
            {cells.map(([x, y]) => {
                const px = x * 10 + 1
                const py = y * 10 + 1
                switch (style) {
                    case "dots":
                        return <circle key={`${x}${y}`} cx={px + 4} cy={py + 4} r={4} />
                    case "rounded":
                        return <rect key={`${x}${y}`} x={px} y={py} width={8} height={8} rx={2.5} />
                    case "extra-rounded":
                        return <rect key={`${x}${y}`} x={px} y={py} width={8} height={8} rx={4} />
                    case "classy":
                        return <path key={`${x}${y}`} d={`M${px} ${py}h5a3 3 0 0 1 3 3v5h-5a3 3 0 0 1-3-3z`} />
                    case "classy-rounded":
                        return <path key={`${x}${y}`} d={`M${px} ${py + 4}a4 4 0 0 1 4-4h4v4a4 4 0 0 1-4 4h-4z`} />
                    default:
                        return <rect key={`${x}${y}`} x={px} y={py} width={9} height={9} />
                }
            })}
        </svg>
    )
}

function CornerSample({
    square,
    dot,
}: {
    square?: Design["cornersSquare"]["style"]
    dot?: Design["cornersDot"]["style"]
}) {
    if (square) {
        if (square === "default") return none
        const rx = square === "dot" ? 14 : square === "extra-rounded" ? 7 : 0
        return (
            <svg viewBox="0 0 32 32" className="size-8">
                <rect x="3" y="3" width="26" height="26" rx={rx} fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
        )
    }
    if (dot === "default") return none
    return (
        <svg viewBox="0 0 32 32" className="size-8">
            {dot === "dot" ? <circle cx="16" cy="16" r="8" /> : <rect x="8" y="8" width="16" height="16" />}
        </svg>
    )
}

function FrameSample({ style }: { style: Design["frame"]["style"] }) {
    if (style === "none") return none
    const qr = (
        <rect x="9" y={style === "speech" ? 15 : 6} width="22" height="22" rx="1" fill="currentColor" opacity="0.85" />
    )
    const shapes: Record<Exclude<Design["frame"]["style"], "none">, ReactNode> = {
        label: (
            <>
                {qr}
                <rect x="9" y="32" width="22" height="3" rx="1.5" fill="currentColor" />
            </>
        ),
        box: (
            <>
                <rect x="5" y="2" width="30" height="36" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                {qr}
                <rect x="5" y="31" width="30" height="7" fill="currentColor" />
            </>
        ),
        badge: (
            <>
                <rect x="5" y="2" width="30" height="36" rx="4" fill="currentColor" />
                <rect x="7" y="4" width="26" height="26" rx="2" fill="var(--card)" />
                {qr}
            </>
        ),
        speech: (
            <>
                <rect x="5" y="2" width="30" height="8" rx="4" fill="currentColor" />
                <path d="M18 9.5 L20 13 L22 9.5 Z" fill="currentColor" />
                {qr}
            </>
        ),
    }
    return (
        <svg viewBox="0 0 40 40" className="size-10">
            {shapes[style]}
        </svg>
    )
}

/** `limited` (no account): pattern, colours and corners only; frames and logos come with an account. */
function PresetGallery({ design, onChange, limited }: Props & { limited: boolean }) {
    return (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {STYLE_PRESETS.filter((preset) => !limited || preset.design.frame.style === "none").map((preset) => (
                <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChange(applyPreset(design, preset, !limited))}
                    className="bg-card hover:border-primary/60 grid gap-2 rounded-xl border-2 p-2 text-xs font-medium transition-colors"
                >
                    <QrImage
                        design={{ ...preset.design, logo: design.logo }}
                        data="https://qrstats.app"
                        label=""
                        className="w-full"
                    />
                    {preset.name}
                </button>
            ))}
        </div>
    )
}

export function DesignSections({ design, onChange, limited = false }: Props & { limited?: boolean }) {
    // Every design key but `shape` holds an object of settings; `shape` is set directly.
    const set = <TKey extends Exclude<keyof Design, "shape">>(key: TKey, value: Partial<Design[TKey]>) =>
        onChange({ ...design, [key]: { ...design[key], ...value } })
    const frameTextId = useId()

    return (
        <>
            <EditorSection
                value="presets"
                icon={SparklesIcon}
                title="Styles prêts à l'emploi"
                description="Un clic, puis ajustez si besoin"
            >
                <PresetGallery design={design} onChange={onChange} limited={limited} />
            </EditorSection>
            {limited ? null : (
                <EditorSection
                    value="frame"
                    icon={ScanIcon}
                    title="Cadre du QR code"
                    description="Un cadre avec un appel à l'action attire plus de scans"
                >
                    <ChoiceGrid
                        label="Style du cadre"
                        value={design.frame.style}
                        onChange={(style) => set("frame", { style })}
                        options={[
                            { value: "none", label: "Pas de cadre", render: <FrameSample style="none" /> },
                            { value: "label", label: "Texte sous le code", render: <FrameSample style="label" /> },
                            { value: "box", label: "Encadré avec bandeau", render: <FrameSample style="box" /> },
                            { value: "badge", label: "Badge plein", render: <FrameSample style="badge" /> },
                            { value: "speech", label: "Bulle au-dessus", render: <FrameSample style="speech" /> },
                        ]}
                    />
                    {design.frame.style !== "none" ? (
                        <div className="bg-muted/60 grid gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
                            <div className="grid gap-2">
                                <Label htmlFor={frameTextId}>Texte du cadre</Label>
                                <Input
                                    id={frameTextId}
                                    className="h-11"
                                    maxLength={24}
                                    value={design.frame.text}
                                    onChange={(event) => set("frame", { text: event.target.value })}
                                />
                            </div>
                            <ColorField
                                label="Couleur du cadre"
                                value={design.frame.color}
                                onChange={(color) => set("frame", { color })}
                            />
                        </div>
                    ) : null}
                </EditorSection>
            )}

            <EditorSection
                value="pattern"
                icon={Grid3x3Icon}
                title="Motif du QR code"
                description="Forme des points et couleurs"
            >
                <ChoiceGrid
                    label="Forme du code"
                    value={design.shape}
                    size="sm"
                    onChange={(shape) => onChange({ ...design, shape })}
                    options={[
                        {
                            value: "square",
                            label: "Carrée",
                            render: <span className="bg-foreground block size-7 rounded-[3px]" />,
                        },
                        {
                            value: "circle",
                            label: "Ronde",
                            render: <span className="bg-foreground block size-7 rounded-full" />,
                        },
                    ]}
                />
                <ChoiceGrid
                    label="Style de motif"
                    value={design.dots.style}
                    onChange={(style) => set("dots", { style })}
                    options={[
                        { value: "square", label: "Carrés", render: <DotSample style="square" /> },
                        { value: "dots", label: "Points", render: <DotSample style="dots" /> },
                        { value: "rounded", label: "Arrondis", render: <DotSample style="rounded" /> },
                        { value: "extra-rounded", label: "Très arrondis", render: <DotSample style="extra-rounded" /> },
                        { value: "classy", label: "Élégants", render: <DotSample style="classy" /> },
                        {
                            value: "classy-rounded",
                            label: "Élégants arrondis",
                            render: <DotSample style="classy-rounded" />,
                        },
                    ]}
                />
                <div className="bg-muted/60 grid gap-4 rounded-xl p-4 sm:p-5">
                    <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                        <ColorField
                            label="Couleur des points"
                            value={design.dots.color}
                            onChange={(color) => set("dots", { color })}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 justify-self-center"
                            aria-label="Inverser les couleurs"
                            disabled={design.background.transparent}
                            onClick={() =>
                                onChange({
                                    ...design,
                                    dots: { ...design.dots, color: design.background.color },
                                    background: { ...design.background, color: design.dots.color },
                                })
                            }
                        >
                            <ArrowLeftRightIcon />
                        </Button>
                        <ColorField
                            label="Couleur de l'arrière-plan"
                            value={design.background.color}
                            disabled={design.background.transparent}
                            onChange={(color) => set("background", { color })}
                        />
                    </div>
                    <TransparentToggle
                        checked={design.background.transparent}
                        onChange={(transparent) => set("background", { transparent })}
                    />
                    <ContrastWarning design={design} />
                </div>
            </EditorSection>

            <EditorSection
                value="corners"
                icon={FrameIcon}
                title="Coins du QR code"
                description="Style et couleur des trois repères"
            >
                <div className="grid gap-6 lg:grid-cols-2">
                    <ChoiceGrid
                        label="Style des cadres d'angle"
                        value={design.cornersSquare.style}
                        size="sm"
                        onChange={(style) => set("cornersSquare", { style })}
                        options={[
                            { value: "default", label: "Comme le motif", render: <CornerSample square="default" /> },
                            { value: "dot", label: "Rond", render: <CornerSample square="dot" /> },
                            { value: "square", label: "Carré", render: <CornerSample square="square" /> },
                            {
                                value: "extra-rounded",
                                label: "Arrondi",
                                render: <CornerSample square="extra-rounded" />,
                            },
                        ]}
                    />
                    <ChoiceGrid
                        label="Type de points d'angle"
                        value={design.cornersDot.style}
                        size="sm"
                        onChange={(style) => set("cornersDot", { style })}
                        options={[
                            { value: "default", label: "Comme le motif", render: <CornerSample dot="default" /> },
                            { value: "dot", label: "Rond", render: <CornerSample dot="dot" /> },
                            { value: "square", label: "Carré", render: <CornerSample dot="square" /> },
                        ]}
                    />
                </div>
                <div className="bg-muted/60 grid gap-4 rounded-xl p-4 sm:grid-cols-2 sm:p-5">
                    <ColorField
                        label="Couleur des cadres d'angle"
                        value={design.cornersSquare.color}
                        onChange={(color) => set("cornersSquare", { color })}
                    />
                    <ColorField
                        label="Couleur des points d'angle"
                        value={design.cornersDot.color}
                        onChange={(color) => set("cornersDot", { color })}
                    />
                </div>
            </EditorSection>

            {limited ? null : (
                <EditorSection
                    value="logo"
                    icon={ImagePlusIcon}
                    title="Ajoutez un logo"
                    description="Un logo ou une image au centre du code"
                >
                    <LogoPicker design={design} onChange={onChange} />
                </EditorSection>
            )}
        </>
    )
}

function TransparentToggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
    const id = useId()
    return (
        <div className="flex min-h-11 items-center gap-3">
            <Checkbox
                id={id}
                className="size-5"
                checked={checked}
                onCheckedChange={(value) => onChange(value === true)}
            />
            <Label htmlFor={id} className="cursor-pointer font-normal">
                Arrière-plan transparent
            </Label>
        </div>
    )
}

function luminance(hex: string) {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Scanners need dark modules on a light ground with enough contrast; warn before printing a dud. */
function ContrastWarning({ design }: { design: Design }) {
    if (design.background.transparent) return null
    const fg = luminance(design.dots.color)
    const bg = luminance(design.background.color)
    const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
    if (ratio >= 4 && fg < bg) return null
    return (
        <p role="status" className="bg-warning-soft text-warning rounded-lg px-3 py-2 text-sm">
            {fg >= bg
                ? "Des points plus clairs que le fond ne sont pas lus par tous les téléphones."
                : "Contraste faible entre les points et le fond : certains téléphones ne liront pas le code."}
        </p>
    )
}

function LogoPicker({ design, onChange }: Props) {
    const inputId = useId()
    const sizeId = useId()
    const setLogo = (logo: Partial<Design["logo"]>) => onChange({ ...design, logo: { ...design.logo, ...logo } })
    const upload = useMutation({
        mutationFn: resizeLogo,
        onSuccess: (image) => {
            if (typeof image === "string" && image.startsWith("data:image/")) setLogo({ image, preset: null })
        },
    })
    const hasLogo = Boolean(design.logo.image ?? design.logo.preset)

    return (
        <>
            <fieldset className="grid gap-3">
                <legend className="mb-3 text-sm font-medium">Sélectionnez un logo</legend>
                <div className="flex flex-wrap gap-2.5">
                    {LOGO_PRESETS.map((preset) => {
                        const active = !design.logo.image && design.logo.preset === preset.id
                        return (
                            <label
                                key={preset.id}
                                title={preset.title}
                                className={cn(
                                    "bg-card has-[:focus-visible]:ring-ring grid size-14 cursor-pointer place-items-center rounded-xl border-2 has-[:focus-visible]:ring-2",
                                    active ? "border-primary" : "border-border hover:border-primary/60",
                                )}
                            >
                                <input
                                    type="radio"
                                    name="logo-preset"
                                    className="sr-only"
                                    checked={active}
                                    onChange={() => setLogo({ preset: preset.id, image: null })}
                                />
                                <span className="sr-only">{preset.title}</span>
                                <img src={presetLogo(preset.id) ?? ""} alt="" className="size-9" />
                            </label>
                        )
                    })}
                </div>
            </fieldset>

            <div className="grid gap-3">
                <span className="text-sm font-medium">Téléchargez votre propre logo</span>
                <label
                    htmlFor={inputId}
                    className="border-primary/50 bg-muted/40 hover:bg-accent/60 has-[:focus-visible]:ring-ring flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-4 has-[:focus-visible]:ring-2 sm:p-5"
                >
                    <span className="bg-card text-primary grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border">
                        {design.logo.image ? (
                            <img src={design.logo.image} alt="Logo importé" className="size-full object-contain" />
                        ) : (
                            <ImagePlusIcon className="size-7" aria-hidden="true" />
                        )}
                    </span>
                    <span className="grid gap-1">
                        <span className="font-medium">
                            {upload.isPending ? "Préparation de l'image…" : "Importer une image (JPG, PNG, SVG, WebP)"}
                        </span>
                        <span className="text-muted-foreground text-sm">Taille maximale : 5 Mo</span>
                    </span>
                    <input
                        id={inputId}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) upload.mutate(file)
                            event.target.value = ""
                        }}
                    />
                </label>
                {upload.error ? (
                    <p role="alert" className="text-destructive text-sm">
                        {upload.error.message}
                    </p>
                ) : null}
            </div>

            {hasLogo ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="grid gap-3">
                        <Label htmlFor={sizeId}>Taille du logo</Label>
                        <Slider
                            id={sizeId}
                            min={15}
                            max={40}
                            step={1}
                            value={[Math.round(design.logo.size * 100)]}
                            onValueChange={([value]) => setLogo({ size: value / 100 })}
                            aria-label="Taille du logo"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => setLogo({ preset: null, image: null })}
                    >
                        <Trash2Icon aria-hidden />
                        Retirer le logo
                    </Button>
                </div>
            ) : null}
        </>
    )
}
