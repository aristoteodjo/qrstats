import { EyeIcon, GlobeIcon, LockIcon, MailIcon, MessageSquareIcon, PhoneIcon, QrCodeIcon, WifiIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Initials } from "@/components/dash/initials"
import { QrImage } from "@/components/qr/qr-image"
import { readContent } from "@/lib/qr"
import type { Design, Kind } from "@/lib/qr"
import { cn } from "@/lib/utils"

export type PreviewMode = "preview" | "qr"

type Props = {
    kind: Kind | null
    content: unknown
    name: string
    design: Design
    payload: string
    mode: PreviewMode
    onModeChange: (mode: PreviewMode) => void
    locked?: boolean
}

/** What a scanner sees, in a phone, next to the editor. Decorative chrome; the QR image itself is labelled. */
export function PhonePreview({ kind, content, name, design, payload, mode, onModeChange, locked }: Props) {
    return (
        <div className="grid justify-items-center gap-5">
            {kind ? (
                <div role="radiogroup" aria-label="Aperçu" className="bg-card grid grid-cols-2 gap-1 rounded-full border-2 border-primary/30 p-1">
                    {(
                        [
                            ["preview", "Aperçu", EyeIcon],
                            ["qr", "QR code", QrCodeIcon],
                        ] as const
                    ).map(([value, label, Icon]) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={mode === value}
                            onClick={() => onModeChange(value)}
                            className={cn(
                                "flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                                mode === value ? "bg-primary text-primary-foreground" : "text-primary hover:bg-accent",
                            )}
                        >
                            <Icon className="size-4" aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            ) : null}
            <div className="bg-foreground w-full max-w-[290px] rounded-[2.75rem] p-2.5 shadow-xl">
                <div className="bg-card relative flex aspect-[9/18.5] flex-col overflow-hidden rounded-[2.25rem]">
                    <div aria-hidden="true" className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold">
                        <span>18:45</span>
                        <span className="bg-foreground h-5 w-20 rounded-full" />
                        <span className="flex gap-0.5">
                            <span className="bg-foreground h-2.5 w-4 rounded-sm" />
                        </span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col">
                        {!kind ? (
                            <Empty />
                        ) : mode === "qr" ? (
                            <div className="grid flex-1 place-items-center p-6">
                                <QrImage design={design} data={payload} label={`Aperçu du QR code ${name}`} className="w-full" />
                            </div>
                        ) : locked ? (
                            <Screen address="qrstats">
                                <div className="grid place-items-center gap-3 px-4 pt-10 text-center">
                                    <LockIcon className="text-primary size-8" aria-hidden="true" />
                                    <p className="font-heading font-semibold">Contenu protégé</p>
                                    <p className="text-muted-foreground text-xs">Le visiteur saisit le mot de passe avant d'y accéder.</p>
                                </div>
                            </Screen>
                        ) : (
                            <ContentPreview kind={kind} content={content} name={name} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Empty() {
    return (
        <div className="text-muted-foreground grid flex-1 place-items-center content-center gap-4 p-8 text-center text-sm">
            <QrCodeIcon className="size-20 opacity-40" strokeWidth={1.2} aria-hidden="true" />
            <p>Choisissez un type de QR code dans la colonne de gauche.</p>
        </div>
    )
}

function Screen({ address, children }: { address: string; children: ReactNode }) {
    return (
        <div className="flex flex-1 flex-col">
            <div className="bg-muted mx-3 mt-3 flex items-center justify-center gap-1.5 truncate rounded-full px-3 py-1.5 text-[11px]">
                <GlobeIcon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{address}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
    )
}

const bar = (width: string) => <span className={cn("bg-muted block h-2 rounded-full", width)} />

function ContentPreview({ kind, content, name }: { kind: Kind; content: unknown; name: string }) {
    switch (kind) {
        case "url": {
            const { url } = readContent("url", content)
            let host = "www.monsite.com"
            try {
                if (url.trim()) host = new URL(url.includes("://") ? url : `https://${url}`).hostname
            } catch {
                host = url
            }
            return (
                <Screen address={host}>
                    <div className="from-accent grid gap-3 bg-gradient-to-b to-transparent p-3">
                        <div className="bg-card grid gap-2 rounded-xl border p-2">
                            <div className="bg-muted grid aspect-video place-items-center rounded-lg">
                                <GlobeIcon className="text-muted-foreground size-8" aria-hidden="true" />
                            </div>
                            {bar("w-full")}
                            {bar("w-4/5")}
                        </div>
                        {[0, 1].map((i) => (
                            <div key={i} className="bg-card flex items-center gap-2 rounded-xl border p-2">
                                <span className="bg-muted size-8 shrink-0 rounded-full" />
                                <span className="grid flex-1 gap-1.5">
                                    {bar("w-full")}
                                    {bar("w-2/3")}
                                </span>
                            </div>
                        ))}
                        <span className="bg-primary/50 block h-8 rounded-lg" />
                    </div>
                </Screen>
            )
        }
        case "text": {
            const { text } = readContent("text", content)
            return (
                <Screen address="qrstats">
                    <div className="grid gap-2 p-4">
                        <p className="font-heading text-sm font-semibold">{name || "Message"}</p>
                        <p className="text-sm whitespace-pre-wrap">{text || "Votre texte s'affichera ici."}</p>
                    </div>
                </Screen>
            )
        }
        case "vcard": {
            const c = readContent("vcard", content)
            const full = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.organization || "Votre nom"
            return (
                <div className="flex-1 overflow-hidden">
                    <div className="bg-primary text-primary-foreground grid justify-items-center gap-2 px-4 pt-8 pb-5 text-center">
                        <span className="bg-card text-foreground grid size-14 place-items-center rounded-full">
                            <Initials name={full} />
                        </span>
                        <p className="font-heading font-semibold">{full}</p>
                        {c.title || c.organization ? (
                            <p className="text-xs opacity-90">{[c.title, c.organization].filter(Boolean).join(" · ")}</p>
                        ) : null}
                    </div>
                    <ul className="grid gap-2 p-3 text-xs">
                        {[c.phone, c.email, c.website, c.address].filter(Boolean).map((line) => (
                            <li key={line} className="bg-muted truncate rounded-lg px-3 py-2">
                                {line}
                            </li>
                        ))}
                        <li className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-center font-medium">
                            Ajouter aux contacts
                        </li>
                    </ul>
                </div>
            )
        }
        case "wifi": {
            const c = readContent("wifi", content)
            return (
                <div className="grid flex-1 place-items-center content-center gap-3 p-6 text-center">
                    <WifiIcon className="text-primary size-10" aria-hidden="true" />
                    <p className="font-heading font-semibold">{c.ssid || "Nom du réseau"}</p>
                    <p className="text-muted-foreground text-xs">L'appareil photo propose de rejoindre ce réseau.</p>
                </div>
            )
        }
        case "email": {
            const c = readContent("email", content)
            return (
                <div className="grid content-start gap-2 p-4 text-xs">
                    <MailIcon className="text-primary size-6" aria-hidden="true" />
                    <p className="border-b pb-2">
                        <span className="text-muted-foreground">À : </span>
                        {c.to || "adresse@exemple.com"}
                    </p>
                    <p className="border-b pb-2 font-medium">{c.subject || "Objet"}</p>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
            )
        }
        case "phone":
        case "sms": {
            const c = readContent(kind, content)
            const Icon = kind === "phone" ? PhoneIcon : MessageSquareIcon
            return (
                <div className="grid flex-1 place-items-center content-center gap-3 p-6 text-center">
                    <span className="bg-positive text-card grid size-14 place-items-center rounded-full">
                        <Icon className="size-6" aria-hidden="true" />
                    </span>
                    <p className="font-heading text-lg font-semibold">{c.phone || "+229 00 00 00 00"}</p>
                    {"message" in c && c.message ? <p className="bg-muted rounded-xl px-3 py-2 text-xs">{c.message}</p> : null}
                </div>
            )
        }
    }
}
