import { StatusPage } from "@/components/shared/status-page"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
    return (
        <>
            <title>Page introuvable | qrstats</title>
            <meta name="robots" content="noindex" />
            <StatusPage
                code="404"
                title="Ce lien ne mène nulle part"
                text="La page n'existe pas, a été déplacée, ou vous n'y avez pas accès. Vérifiez l'adresse, ou repartez de vos QR codes."
                actions={
                    <>
                        <Button asChild size="lg" className="h-12 px-6">
                            <a href="/qr-codes">Mes QR codes</a>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-12 px-6">
                            <a href="/">Accueil</a>
                        </Button>
                    </>
                }
            />
        </>
    )
}
