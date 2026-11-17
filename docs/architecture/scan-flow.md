# Parcours d'un scan

1. Le téléphone lit `https://<domaine-court>/r/<slug>` (seul contenu du code imprimé, sauf Wi-Fi).
2. `handler.Public.Redirect` résout le slug (`service.QRCodes.Resolve`).
3. Code inconnu, en pause ou statique : 302 vers `WEB_URL/q/<slug>`, rien n'est compté.
4. Sinon : campagne lue dans la requête (`ScanCampaign`), destination résolue (`ResolveTarget`) si c'est un lien sans mot de passe.
5. `Scans.BuildScan` ignore les bots, déduit appareil/OS/navigateur/langue/provenance, la géoloc (si `TRUST_PROXY_HEADERS`) et le hash visiteur du jour. Écriture avec un délai de 2 s.
6. 302 (`Cache-Control: no-store`) vers la destination ou la page `/q/<slug>`.
7. La page `/q/<slug>` lit `GET /api/v1/public/qr/<slug>` (contenu masqué si protégé ou en pause) et, si besoin, `POST .../unlock`.
