import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { FinderArt } from "@/components/auth/finder-art"
import { Brand } from "@/components/layout/brand"

/** Sign-in and sign-up: the promise on the left (wide screens only), the form on the right. */
export function AuthShell({
    title,
    intro,
    children,
    footer,
}: {
    title: string
    intro: string
    children: ReactNode
    footer: ReactNode
}) {
    return (
        <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <aside className="bg-hero text-hero-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
                <Link to="/" className="w-fit" aria-label="qrstats, accueil">
                    <Brand className="text-hero-foreground" />
                </Link>
                <FinderArt className="text-hero-foreground absolute -top-20 -right-28 w-[30rem] opacity-90 xl:w-[34rem]" />
                <div className="relative grid max-w-sm gap-4">
                    <p className="font-heading text-4xl leading-[1.05] font-bold tracking-tight">
                        Imprimez une fois. Changez la destination quand vous voulez.
                    </p>
                    <p className="text-hero-foreground/70">
                        Chaque scan est compté : quand, où, sur quel appareil. Sans jamais garder l'adresse IP de vos
                        visiteurs.
                    </p>
                </div>
            </aside>
            <main id="contenu" className="bg-background flex flex-col px-5 py-8 sm:px-10">
                <Link to="/" className="w-fit lg:hidden" aria-label="qrstats, accueil">
                    <Brand />
                </Link>
                <div className="mx-auto grid w-full max-w-[380px] flex-1 content-center gap-8 py-10">
                    <div className="grid gap-2">
                        <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
                        <p className="text-muted-foreground">{intro}</p>
                    </div>
                    {children}
                    <p className="text-muted-foreground text-sm">{footer}</p>
                </div>
            </main>
        </div>
    )
}
