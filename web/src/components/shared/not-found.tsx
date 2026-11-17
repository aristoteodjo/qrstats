import { Button } from "@/components/ui/button"

export function NotFoundPage() {
    return (
        <main id="contenu" className="grid min-h-svh place-items-center p-6">
            <title>Page introuvable | qrstats</title>
            <meta name="robots" content="noindex" />
            <div className="grid max-w-sm gap-4 text-center">
                <p className="text-muted-foreground font-mono text-sm">404</p>
                <h1 className="font-heading text-2xl font-semibold">Page introuvable</h1>
                <p className="text-muted-foreground text-sm">
                    Cette adresse ne correspond à aucune page, ou vous n'y avez pas accès.
                </p>
                <Button asChild className="min-h-11 justify-self-center">
                    <a href="/">Retour à l'accueil</a>
                </Button>
            </div>
        </main>
    )
}
