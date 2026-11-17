import { createFileRoute } from "@tanstack/react-router"

import { LegalPage, Todo } from "@/components/site/site-layout"

export const Route = createFileRoute("/mentions-legales")({
    head: () => ({ meta: [{ title: "Mentions légales | qrstats" }] }),
    component: () => (
        <LegalPage title="Mentions légales">
            <h2>Éditeur</h2>
            <p>
                Raison sociale : <Todo />. Forme juridique et capital : <Todo />. Siège : <Todo />. Immatriculation : <Todo />.
                Directeur de la publication : <Todo />.
            </p>
            <h2>Hébergeur</h2>
            <p>
                Le site et l'application sont hébergés par <Todo /> (adresse : <Todo />).
            </p>
            <h2>Contact</h2>
            <p>
                Adresse e-mail : <Todo />.
            </p>
        </LegalPage>
    ),
})
