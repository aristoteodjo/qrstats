import { createFileRoute } from "@tanstack/react-router"

import { LegalPage } from "@/components/site/site-layout"

const CONTACT = "oaristote@gmail.com"

export const Route = createFileRoute("/confidentialite")({
    head: () => ({ meta: [{ title: "Politique de confidentialité | qrstats" }] }),
    component: () => (
        <LegalPage title="Politique de confidentialité">
            <p className="text-muted-foreground">Dernière mise à jour : 18 novembre 2026.</p>
            <p>
                Cette politique explique quelles données qrstats traite, pourquoi, combien de temps et quels sont vos
                droits. Elle s'applique conformément à la loi n° 2017-20 du 20 avril 2018 portant Code du numérique en
                République du Bénin.
            </p>

            <h2>Responsable du traitement</h2>
            <p>
                Aristote ODJO, éditeur de qrstats. Contact : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>

            <h2>Si vous avez un compte</h2>
            <ul>
                <li>Votre nom et votre adresse e-mail, pour vous identifier et vous connecter.</li>
                <li>
                    Votre mot de passe, conservé uniquement sous forme chiffrée (empreinte irréversible) : personne ne
                    peut le lire.
                </li>
                <li>
                    Vos QR codes : nom, type, destination, apparence (couleurs, logo importé) et, si vous en définissez
                    un, l'empreinte chiffrée de leur mot de passe.
                </li>
                <li>Vos sessions de connexion (date, appareil), pour vous garder connecté et sécuriser le compte.</li>
            </ul>
            <p>
                Finalité : fournir le service que vous utilisez (créer, modifier et mesurer vos QR codes). Base légale :
                l'exécution du service que vous avez demandé en créant votre compte.
            </p>

            <h2>Si vous scannez un QR code</h2>
            <p>
                Quand un téléphone ouvre un QR code qrstats, le service enregistre, pour le titulaire du code, une ligne
                de statistiques :
            </p>
            <ul>
                <li>la date et l'heure du scan ;</li>
                <li>
                    le type d'appareil (mobile, tablette, ordinateur), le système et le navigateur, déduits de l'en-tête
                    « User-Agent » ;
                </li>
                <li>la langue préférée du navigateur ;</li>
                <li>le pays et la ville approximatifs, déduits par l'hébergeur à partir de l'adresse réseau ;</li>
                <li>
                    le site de provenance s'il y en a un, et les paramètres de campagne (UTM) présents dans le lien.
                </li>
            </ul>
            <p>
                <strong>Votre adresse IP n'est jamais enregistrée.</strong> Pour compter les visiteurs uniques, qrstats
                calcule une empreinte chiffrée (à partir de l'adresse réseau et du navigateur, avec une clé secrète) qui
                change chaque jour : elle ne permet ni de vous identifier, ni de vous suivre d'un jour à l'autre. Les
                robots et les aperçus de liens des messageries ne sont pas enregistrés.
            </p>
            <p>
                Finalité : permettre au titulaire du code de mesurer l'usage de ses QR codes. Base légale : l'intérêt
                légitime du titulaire à connaître l'audience de ses supports, avec des données réduites au strict
                nécessaire.
            </p>

            <h2>Cookies</h2>
            <p>
                qrstats n'utilise aucun cookie publicitaire ni de mesure d'audience tierce. Seuls des cookies
                nécessaires au fonctionnement sont déposés : le cookie de session (connexion à votre compte,
                inaccessible aux scripts) et un cookie qui mémorise l'état ouvert ou réduit du menu. Une personne qui
                scanne un QR code ne reçoit aucun cookie.
            </p>

            <h2>Durée de conservation</h2>
            <ul>
                <li>Compte, sessions et QR codes : tant que le compte existe.</li>
                <li>Statistiques de scans : tant que le QR code concerné existe ; elles sont effacées avec lui.</li>
                <li>
                    Empreinte de visiteur : elle change chaque jour et ne peut pas être rapprochée d'une autre journée.
                </li>
            </ul>
            <p>
                Pour supprimer votre compte et toutes ses données, écrivez à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>{" "}
                depuis l'adresse liée au compte.
            </p>

            <h2>Destinataires et sous-traitants</h2>
            <p>
                Les données ne sont ni vendues ni partagées à des fins commerciales. Elles sont traitées par deux
                prestataires techniques : Vercel Inc. (hébergement de l'application, États-Unis) et Neon Inc. (base de
                données). Ces prestataires étant établis hors du Bénin, les données peuvent être transférées à
                l'étranger, dans le cadre de leurs engagements contractuels de sécurité et de confidentialité.
            </p>
            <p>Les statistiques d'un QR code ne sont visibles que par le titulaire de ce code.</p>

            <h2>Sécurité</h2>
            <p>
                Échanges chiffrés (HTTPS), mots de passe conservés sous forme d'empreinte, accès aux données de chaque
                compte réservé à son titulaire, nombre d'essais limité sur les mots de passe des QR codes protégés.
            </p>

            <h2>Vos droits</h2>
            <p>
                Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, ou vous opposer à leur
                traitement, en écrivant à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Les statistiques de scan ne
                contenant ni nom ni adresse IP, elles ne permettent généralement pas de retrouver les données d'une
                personne qui a scanné un code.
            </p>
            <p>
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l'Autorité de Protection des
                Données à caractère Personnel (APDP) du Bénin, apdp.bj.
            </p>
        </LegalPage>
    ),
})
