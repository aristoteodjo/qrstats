import { createFileRoute } from "@tanstack/react-router"

import { PageContent, PageHeader } from "@/components/dash/page-header"

export const Route = createFileRoute("/_app/aide")({
    head: () => ({ meta: [{ title: "Aide | qrstats" }] }),
    component: Help,
})

const FAQ = [
    {
        q: "Puis-je changer la destination d'un QR code déjà imprimé ?",
        a: "Oui. Le code imprimé contient un lien court qrstats qui ne change jamais. Modifiez la destination, ou même le type (lien, texte, carte de visite…), et les exemplaires imprimés suivent immédiatement.",
    },
    {
        q: "Comment sont comptés les scans ?",
        a: "Chaque ouverture du lien court est un scan. Les aperçus des messageries et les robots ne sont pas comptés. Un visiteur unique est reconnu par une empreinte chiffrée qui change chaque jour : aucune adresse IP n'est conservée.",
    },
    {
        q: "D'où viennent le pays et la ville ?",
        a: "De la géolocalisation fournie par l'hébergeur (Vercel ou Cloudflare) au moment du scan. En local, ces informations ne sont pas disponibles.",
    },
    {
        q: "À quoi servent les paramètres UTM ?",
        a: "Ils sont ajoutés au lien de destination pour vos outils d'analyse. Vous pouvez aussi imprimer des variantes : ajoutez ?utm_source=affiche au lien court, et chaque variante est comptée à part.",
    },
    {
        q: "Pourquoi un QR code Wi-Fi n'a pas de statistiques ?",
        a: "Pour rejoindre un réseau sans saisie, le téléphone doit lire le réseau directement dans le motif. Le code ne passe donc pas par qrstats : il est statique et ses scans ne sont pas visibles.",
    },
    {
        q: "Que se passe-t-il quand je mets un code en pause ?",
        a: "Le visiteur voit une page indiquant que le code est désactivé, et aucun scan n'est compté. Réactivez-le quand vous voulez.",
    },
    {
        q: "Mon code ne se scanne pas, que faire ?",
        a: "Gardez des points plus foncés que le fond avec un bon contraste, un logo de taille raisonnable, et imprimez le code à 2 cm de côté au minimum.",
    },
]

function Help() {
    return (
        <>
            <PageHeader title="Aide" description="Les réponses aux questions les plus fréquentes." />
            <PageContent>
                <div className="bg-card grid max-w-3xl divide-y rounded-xl border">
                    {FAQ.map((item) => (
                        <details key={item.q} className="group px-5">
                            <summary className="font-heading flex min-h-14 cursor-pointer items-center py-3 font-semibold">{item.q}</summary>
                            <p className="text-muted-foreground pb-5 text-sm leading-relaxed">{item.a}</p>
                        </details>
                    ))}
                </div>
            </PageContent>
        </>
    )
}
