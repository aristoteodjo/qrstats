import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"

import { Brand } from "@/components/layout/brand"
import { QrEditor } from "@/components/qr/qr-editor"
import { PlanComparison } from "@/components/site/plan-comparison"
import { SiteFooter } from "@/components/site/site-layout"
import { Button } from "@/components/ui/button"
import { editorSearch } from "@/lib/editor-search"
import { isGuestKind } from "@/lib/qr"

export const Route = createFileRoute("/creer")({
    validateSearch: editorSearch,
    // The editor and its draft live in the browser.
    ssr: false,
    head: () => ({
        meta: [
            { title: "Créer un QR code gratuit sans compte | qrstats" },
            {
                name: "description",
                content:
                    "Générez un QR code gratuit sans inscription : lien, texte, Wi-Fi, e-mail ou appel, à vos couleurs.",
            },
        ],
    }),
    component: GuestCreate,
})

function GuestCreate() {
    const { etape, type } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    return (
        <div className="flex min-h-svh flex-col">
            <header className="bg-card flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 lg:px-10">
                <Link to="/" aria-label="qrstats, accueil">
                    <Brand />
                </Link>
                <nav aria-label="Compte" className="flex items-center gap-2">
                    <span className="text-muted-foreground hidden text-sm md:inline">
                        Sans compte : code fixe, PNG 512 px
                    </span>
                    <Button asChild variant="ghost" className="min-h-11">
                        <Link to="/connexion">Se connecter</Link>
                    </Button>
                    <Button asChild className="min-h-11">
                        <Link to="/inscription">Créer un compte</Link>
                    </Button>
                </nav>
            </header>
            <main id="contenu" className="flex-1">
                <QrEditor
                    mode="guest"
                    step={etape}
                    kindHint={type && isGuestKind(type) ? type : undefined}
                    onRoute={({ step, kind }) => void navigate({ search: { etape: step, type: kind } })}
                />
                {(etape ?? 1) === 1 ? (
                    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
                        <PlanComparison showGuestAction={false} />
                    </div>
                ) : null}
            </main>
            <SiteFooter />
        </div>
    )
}
