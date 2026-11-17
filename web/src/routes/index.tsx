import { createFileRoute, redirect } from "@tanstack/react-router"
import { BarChart3Icon, GlobeIcon, LockIcon, PaletteIcon, RefreshCwIcon, SmartphoneIcon } from "lucide-react"

import { SiteLayout } from "@/components/site/site-layout"
import { Button } from "@/components/ui/button"
import { appHref } from "@/lib/current-space"

export const Route = createFileRoute("/")({
    beforeLoad: ({ context }) => {
        if (context.space.kind === "app") throw redirect({ to: "/analyses" })
    },
    component: Landing,
})

const FEATURES = [
    { icon: RefreshCwIcon, title: "Destination modifiable", text: "Changez le lien, le texte ou la carte de visite après impression. Le code reste le même." },
    { icon: BarChart3Icon, title: "Chaque scan mesuré", text: "Scans, visiteurs uniques, heures, jours, tendances par rapport à la période précédente." },
    { icon: SmartphoneIcon, title: "Appareils et navigateurs", text: "Mobile, tablette ou ordinateur, iOS ou Android, Safari, Chrome ou navigateur intégré." },
    { icon: GlobeIcon, title: "Pays, villes, langues", text: "Où vos codes sont scannés, et dans quelle langue lisent vos visiteurs." },
    { icon: PaletteIcon, title: "À vos couleurs", text: "Motifs, coins, couleurs, logo et cadres « Scannez-moi » pour attirer l'œil." },
    { icon: LockIcon, title: "Mot de passe et pause", text: "Protégez un contenu, suspendez un code le temps d'une campagne." },
]

function Landing() {
    return (
        <SiteLayout>
            <section className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-16">
                <div className="grid gap-6">
                    <p className="label text-primary">QR codes dynamiques</p>
                    <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
                        Imprimez une fois. Changez la destination quand vous voulez.
                    </h1>
                    <p className="text-muted-foreground max-w-xl text-lg">
                        qrstats génère des QR codes à votre image, dont vous modifiez le contenu sans les réimprimer, et
                        vous montre qui les scanne, quand, où et avec quoi.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild size="lg" className="min-h-12 px-6 text-base">
                            <a href={appHref("/connexion?mode=inscription")}>Créer mon premier QR code</a>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="min-h-12 px-6 text-base">
                            <a href={appHref("/connexion")}>J'ai déjà un compte</a>
                        </Button>
                    </div>
                </div>
                <div aria-hidden="true" className="bg-card relative grid gap-4 rounded-3xl border p-6 shadow-xl">
                    <div className="flex items-center justify-between">
                        <span className="font-heading font-semibold">Menu du restaurant</span>
                        <span className="bg-positive-soft text-positive rounded-full px-2 py-0.5 text-xs font-medium">Actif</span>
                    </div>
                    <div className="flex items-end gap-1.5">
                        {[18, 26, 22, 34, 30, 46, 40, 58, 52, 66, 61, 74].map((h, i) => (
                            <span key={i} className="bg-chart-1 flex-1 rounded-t-[4px]" style={{ height: h * 2 }} />
                        ))}
                    </div>
                    <dl className="grid grid-cols-3 gap-3 text-sm">
                        {[
                            ["Scans", "1 284"],
                            ["Uniques", "903"],
                            ["Mobile", "94 %"],
                        ].map(([label, value]) => (
                            <div key={label} className="bg-muted rounded-xl p-3">
                                <dt className="text-muted-foreground">{label}</dt>
                                <dd className="font-heading text-xl font-semibold">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="text-muted-foreground text-xs">Exemple d'illustration</p>
                </div>
            </section>
            <section aria-labelledby="fonctions" className="bg-card border-y">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6">
                    <h2 id="fonctions" className="font-heading text-3xl font-semibold">
                        Tout ce qu'un code imprimé ne vous disait pas
                    </h2>
                    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="grid content-start gap-2">
                                <span className="bg-accent text-accent-foreground grid size-11 place-items-center rounded-xl">
                                    <Icon className="size-5" aria-hidden="true" />
                                </span>
                                <h3 className="font-heading text-lg font-semibold">{title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </SiteLayout>
    )
}
