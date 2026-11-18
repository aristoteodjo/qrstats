import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowDownIcon, BarChart3Icon, LockIcon, PaletteIcon, PauseIcon, RefreshCwIcon } from "lucide-react"

import { QrImage } from "@/components/qr/qr-image"
import { PlanComparison } from "@/components/site/plan-comparison"
import { SiteLayout } from "@/components/site/site-layout"
import { Button } from "@/components/ui/button"
import { defaultDesign } from "@/lib/qr"

export const Route = createFileRoute("/")({
    component: Landing,
})

const FEATURES = [
    {
        icon: RefreshCwIcon,
        title: "Une destination qui bouge",
        text: "Lien, texte, carte de visite, e-mail : changez ce que le code ouvre, même après l'impression.",
    },
    {
        icon: BarChart3Icon,
        title: "Chaque scan compté",
        text: "Jour, heure, pays, ville, appareil, navigateur, langue et campagne, comparés à la période précédente.",
    },
    {
        icon: PaletteIcon,
        title: "À vos couleurs",
        text: "Forme des points, coins, couleurs, logo et cadre « Scannez-moi », en PNG ou SVG pour l'imprimeur.",
    },
    {
        icon: LockIcon,
        title: "Protégé si besoin",
        text: "Un mot de passe avant d'ouvrir le contenu, pour un document interne ou une offre privée.",
    },
    {
        icon: PauseIcon,
        title: "En pause, pas perdu",
        text: "Suspendez un code entre deux campagnes, réactivez-le sans réimprimer.",
    },
]

const DEMO_DESIGN = {
    ...defaultDesign(),
    dots: { style: "rounded" as const, color: "#14161f" },
    cornersDot: { style: "dot" as const, color: "#2d3cf0" },
}

/** The page's one moment: a printed code whose destination changes, told in three lines. */
function DestinationDemo() {
    const steps = [
        { when: "Lundi", where: "menu-du-midi.pdf" },
        { when: "Vendredi", where: "soiree-concert.fr" },
        { when: "Été", where: "terrasse-ouverte.fr" },
    ]
    return (
        <div aria-hidden="true" className="bg-hero text-hero-foreground rounded-[2rem] p-8 sm:p-10">
            <div className="grid gap-6">
                <div className="grid size-36 place-items-center rounded-2xl bg-white p-2">
                    <QrImage design={DEMO_DESIGN} data="https://qrstats.app/r/m8pGDBg" label="" className="w-full" />
                </div>
                <p className="text-hero-foreground/60 text-sm">Le même code imprimé, trois destinations :</p>
                <ol className="grid gap-2">
                    {steps.map((step, index) => (
                        <li key={step.when} className="grid gap-2">
                            <div className="bg-hero-foreground/8 flex items-baseline justify-between gap-4 rounded-xl px-4 py-3">
                                <span className="text-hero-foreground/60 text-sm">{step.when}</span>
                                <span className="font-medium">{step.where}</span>
                            </div>
                            {index < steps.length - 1 ? (
                                <ArrowDownIcon className="text-primary mx-auto size-4" />
                            ) : null}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    )
}

function Landing() {
    return (
        <SiteLayout>
            <section className="mx-auto grid max-w-6xl gap-12 px-5 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-16">
                <div className="grid gap-7">
                    <h1 className="font-heading text-5xl leading-[0.98] font-bold tracking-tight text-balance sm:text-7xl">
                        Imprimez une fois. Changez tout le reste.
                    </h1>
                    <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
                        qrstats crée des QR codes à votre image dont vous modifiez la destination sans les réimprimer,
                        et vous montre qui les scanne, quand, où et sur quel appareil.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild size="lg" className="h-13 rounded-xl px-7 text-base">
                            <Link to="/inscription">Créer mon premier QR code</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-13 rounded-xl px-7 text-base">
                            <Link to="/creer">Essayer sans compte</Link>
                        </Button>
                    </div>
                </div>
                <DestinationDemo />
            </section>
            <section aria-labelledby="fonctions" className="border-t">
                <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
                    <h2 id="fonctions" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                        Ce qu'un code imprimé ne vous disait pas
                    </h2>
                    <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                        {FEATURES.map(({ icon: Icon, title, text }) => (
                            <div key={title} className="grid content-start gap-2">
                                <dt className="flex items-center gap-3 font-semibold">
                                    <Icon className="text-primary size-5" aria-hidden="true" />
                                    {title}
                                </dt>
                                <dd className="text-muted-foreground leading-relaxed">{text}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>
            <div className="border-t">
                <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
                    <PlanComparison />
                </div>
            </div>
        </SiteLayout>
    )
}
