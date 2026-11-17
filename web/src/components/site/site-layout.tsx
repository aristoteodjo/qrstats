import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Brand } from "@/components/layout/brand"
import { Button } from "@/components/ui/button"
import { appHref } from "@/lib/current-space"

export function SiteLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-svh flex-col">
            <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
                <Link to="/" aria-label="qrstats, accueil">
                    <Brand />
                </Link>
                <nav aria-label="Compte" className="flex items-center gap-2">
                    <Button asChild variant="ghost" className="min-h-11">
                        <a href={appHref("/connexion")}>Se connecter</a>
                    </Button>
                    <Button asChild className="min-h-11">
                        <a href={appHref("/connexion?mode=inscription")}>Créer un compte</a>
                    </Button>
                </nav>
            </header>
            <main id="contenu" className="flex-1">
                {children}
            </main>
            <SiteFooter />
        </div>
    )
}

export function SiteFooter() {
    return (
        <footer className="border-t">
            <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm sm:px-6">
                <p>© {new Date().getFullYear()} qrstats</p>
                <nav aria-label="Informations légales">
                    <ul className="flex flex-wrap gap-x-5 gap-y-1">
                        <li>
                            <Link to="/mentions-legales" className="inline-flex min-h-11 items-center hover:underline">
                                Mentions légales
                            </Link>
                        </li>
                        <li>
                            <Link to="/confidentialite" className="inline-flex min-h-11 items-center hover:underline">
                                Confidentialité
                            </Link>
                        </li>
                        <li>
                            <Link to="/cgu" className="inline-flex min-h-11 items-center hover:underline">
                                CGU
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    )
}

/** Legal pages: plain prose. Unknown facts stay visibly "[À compléter]", never invented. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
    return (
        <SiteLayout>
            <article className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6 [&_h2]:font-heading [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6">
                <h1 className="font-heading text-3xl font-semibold">{title}</h1>
                {children}
            </article>
        </SiteLayout>
    )
}

export function Todo() {
    return <mark className="bg-warning-soft text-warning rounded px-1 font-medium">[À compléter]</mark>
}
