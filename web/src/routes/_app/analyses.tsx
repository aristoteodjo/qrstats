import { Link, createFileRoute } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"

import { PageContent, PageHeader } from "@/components/dash/page-header"
import { StatsBoard } from "@/components/stats/stats-board"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app/analyses")({
    head: () => ({ meta: [{ title: "Analyses | qrstats" }] }),
    component: Analyses,
})

function Analyses() {
    return (
        <>
            <PageHeader
                title="Analyses"
                description="Tous vos QR codes : scans, visiteurs, appareils, lieux et campagnes."
                actions={
                    <Button asChild className="min-h-11">
                        <Link to="/qr-codes/nouveau">
                            <PlusIcon aria-hidden />
                            Créer un QR code
                        </Link>
                    </Button>
                }
            />
            <PageContent>
                <StatsBoard />
            </PageContent>
        </>
    )
}
