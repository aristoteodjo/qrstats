import { Link } from "@tanstack/react-router"
import { CheckIcon, MinusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const ROWS: Array<{ label: string; guest: string | false; account: string }> = [
    {
        label: "Types de QR code",
        guest: "Lien, texte, Wi-Fi, e-mail, appel",
        account: "Les 7 types, dont carte de visite et SMS",
    },
    { label: "Changer la destination après impression", guest: false, account: "Oui, à tout moment" },
    { label: "Statistiques de scans", guest: false, account: "Jours, heures, pays, appareils, campagnes" },
    { label: "Couleurs, motifs et coins", guest: "Oui", account: "Oui" },
    { label: "Logo et cadre « Scannez-moi »", guest: false, account: "Oui" },
    { label: "Téléchargement", guest: "PNG 512 px", account: "PNG jusqu'à 4096 px et SVG vectoriel" },
    { label: "Mot de passe, pause, historique", guest: false, account: "Oui" },
]

/** Account or not, side by side: the guest path is honest about what it cannot do. */
export function PlanComparison({ showGuestAction = true }: { showGuestAction?: boolean }) {
    return (
        <section aria-labelledby="comparatif" className="grid gap-6">
            <div className="grid gap-2">
                <h2 id="comparatif" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                    Avec ou sans compte
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                    Sans compte, le contenu est écrit dans le motif du code : il fonctionne pour toujours, mais ne peut
                    plus changer et ses scans ne sont pas comptés. Avec un compte gratuit, le code passe par qrstats :
                    vous changez sa destination quand vous voulez et voyez chaque scan.
                </p>
            </div>
            <div className="bg-card overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[36rem] text-left text-sm">
                    <caption className="sr-only">Comparaison entre un QR code sans compte et avec un compte</caption>
                    <thead>
                        <tr className="border-b">
                            <th scope="col" className="w-2/5 px-5 py-4 font-medium">
                                <span className="sr-only">Fonction</span>
                            </th>
                            <th scope="col" className="px-5 py-4 font-heading text-base font-semibold">
                                Sans compte
                            </th>
                            <th
                                scope="col"
                                className="bg-accent text-accent-foreground px-5 py-4 font-heading text-base font-semibold"
                            >
                                Compte gratuit
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row) => (
                            <tr key={row.label} className="border-b last:border-b-0">
                                <th scope="row" className="px-5 py-3.5 font-medium">
                                    {row.label}
                                </th>
                                <td className="text-muted-foreground px-5 py-3.5">
                                    {row.guest === false ? (
                                        <span className="inline-flex items-center gap-2">
                                            <MinusIcon className="size-4" aria-hidden="true" />
                                            Non
                                        </span>
                                    ) : (
                                        row.guest
                                    )}
                                </td>
                                <td className="bg-accent/40 px-5 py-3.5">
                                    <span className="inline-flex items-center gap-2">
                                        <CheckIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
                                        {row.account}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl px-6">
                    <Link to="/inscription">Créer un compte gratuit</Link>
                </Button>
                {showGuestAction ? (
                    <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6">
                        <Link to="/creer">Essayer sans compte</Link>
                    </Button>
                ) : null}
            </div>
        </section>
    )
}
