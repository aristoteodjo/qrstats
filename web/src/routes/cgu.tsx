import { createFileRoute } from "@tanstack/react-router"

import { LegalPage, Todo } from "@/components/site/site-layout"

export const Route = createFileRoute("/cgu")({
    head: () => ({ meta: [{ title: "Conditions d'utilisation | qrstats" }] }),
    component: () => (
        <LegalPage title="Conditions générales d'utilisation">
            <h2>Objet</h2>
            <p>
                qrstats permet de créer des QR codes dont la destination reste modifiable et de consulter les
                statistiques de leurs scans.
            </p>
            <h2>Compte</h2>
            <p>Vous êtes responsable de la confidentialité de votre mot de passe et des contenus liés à vos codes.</p>
            <h2>Usages interdits</h2>
            <p>
                Il est interdit de lier un code à un contenu illicite, trompeur (hameçonnage), malveillant ou portant
                atteinte aux droits d'autrui. qrstats peut suspendre un code ou un compte qui enfreint ces règles.
            </p>
            <h2>Disponibilité</h2>
            <p>
                Le service est fourni en l'état. Engagements de disponibilité : <Todo />.
            </p>
            <h2>Tarifs</h2>
            <p>
                <Todo />
            </p>
            <h2>Droit applicable</h2>
            <p>
                <Todo />
            </p>
        </LegalPage>
    ),
})
