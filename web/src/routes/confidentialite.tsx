import { createFileRoute } from "@tanstack/react-router"

import { LegalPage, Todo } from "@/components/site/site-layout"

export const Route = createFileRoute("/confidentialite")({
    head: () => ({ meta: [{ title: "Confidentialité | qrstats" }] }),
    component: () => (
        <LegalPage title="Politique de confidentialité">
            <p>
                Responsable du traitement : <Todo />.
            </p>
            <h2>Données des titulaires de compte</h2>
            <ul>
                <li>Nom, adresse e-mail et mot de passe (chiffré), pour l'accès au compte.</li>
                <li>Les QR codes créés, leur contenu et leur apparence.</li>
            </ul>
            <h2>Données des personnes qui scannent un code</h2>
            <p>
                À chaque scan, qrstats enregistre la date et l'heure, le type d'appareil, le système, le navigateur, la
                langue préférée, le site de provenance s'il y en a un, les paramètres de campagne (UTM) et le pays et la
                ville déduits par l'hébergeur. <strong>Aucune adresse IP n'est conservée</strong> : un visiteur unique
                est reconnu par une empreinte chiffrée qui change chaque jour et ne permet pas de le suivre d'un jour à
                l'autre. Les robots et les aperçus de messagerie ne sont pas enregistrés.
            </p>
            <h2>Finalités et base légale</h2>
            <p>
                Fournir le service et les statistiques demandées par le titulaire du code. Base légale : <Todo />.
            </p>
            <h2>Durée de conservation</h2>
            <p>
                Données de compte : tant que le compte existe. Scans : <Todo />. Un code supprimé efface ses scans.
            </p>
            <h2>Vos droits</h2>
            <p>
                Accès, rectification, effacement, opposition et portabilité : écrivez à <Todo />. Vous pouvez aussi
                saisir l'autorité de protection des données compétente.
            </p>
        </LegalPage>
    ),
})
