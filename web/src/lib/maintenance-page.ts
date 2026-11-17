/** The maintenance page is plain HTML: it must render even when the app itself cannot. */
export const MAINTENANCE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Maintenance en cours | qrstats</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f3f5fa;color:#10131c;padding:24px}
main{max-width:28rem;text-align:center}
h1{font-size:1.6rem;margin:0 0 .75rem}
p{color:#5b6274;line-height:1.5;margin:.5rem 0}
@media (prefers-color-scheme:dark){body{background:#0d1017;color:#eef1f8}p{color:#a2a9ba}}
</style>
</head>
<body>
<main id="contenu">
<h1>Le site revient bientôt</h1>
<p>qrstats est en maintenance. Les QR codes imprimés continuent de fonctionner.</p>
<p>Contact : [À compléter]</p>
</main>
</body>
</html>`
