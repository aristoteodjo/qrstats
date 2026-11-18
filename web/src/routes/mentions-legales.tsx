import { createFileRoute } from "@tanstack/react-router"

import { LegalPage } from "@/components/site/site-layout"

const CONTACT = "oaristote@gmail.com"

export const Route = createFileRoute("/mentions-legales")({
    head: () => ({ meta: [{ title: "Mentions légales | qrstats" }] }),
    component: () => (
        <LegalPage title="Mentions légales">
            <p className="text-muted-foreground">Dernière mise à jour : 18 novembre 2026.</p>

            <h2>Éditeur du site</h2>
            <p>
                qrstats est un projet personnel édité par Aristote ODJO, personne physique. Conformément à la loi,
                l'adresse postale de l'éditeur n'est pas publiée ; elle est communiquée à l'hébergeur et à toute
                autorité qui en fait la demande.
            </p>
            <p>
                Contact : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
            </p>
            <p>Directeur de la publication : Aristote ODJO.</p>

            <h2>Hébergement</h2>
            <p>
                Le site et l'application (https://qrstats-web.vercel.app) ainsi que le service de redirection des QR
                codes (https://qrstats-api.vercel.app) sont hébergés par Vercel Inc., 440 N Barranca Avenue #4133,
                Covina, CA 91723, États-Unis (vercel.com).
            </p>
            <p>
                Les données (comptes, QR codes, statistiques) sont stockées dans une base de données gérée par Neon Inc.
                (neon.com).
            </p>

            <h2>Propriété intellectuelle</h2>
            <p>
                Les textes, l'interface et le code de qrstats sont protégés. Le code source est publié sur
                github.com/aristoteodjo/qrstats. Les logos de marques proposés dans l'éditeur proviennent du projet
                Simple Icons (licence CC0) et restent la propriété de leurs titulaires.
            </p>

            <h2>Contenus des QR codes</h2>
            <p>
                Chaque titulaire de compte est responsable de la destination et du contenu de ses QR codes. Pour
                signaler un code qui mène vers un contenu illicite ou trompeur, écrivez à{" "}
                <a href={`mailto:${CONTACT}`}>{CONTACT}</a> en indiquant le lien du code.
            </p>

            <h2>Données personnelles</h2>
            <p>
                Le traitement des données est décrit dans la <a href="/confidentialite">politique de confidentialité</a>
                .
            </p>
        </LegalPage>
    ),
})
