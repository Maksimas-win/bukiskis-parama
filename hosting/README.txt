HRAM.LT — Hostinger publication

Source: Maksimas-win/bukiskis-parama, branch main.
Production: https://hram.lt/ (Hostinger Business Web Hosting).
Compatibility mirror: https://maksimas-win.github.io/bukiskis-parama/.

Hostinger > hram.lt > Advanced > Git:
  Repository: Maksimas-win/bukiskis-parama
  Branch: hostinger
  Target directory: public_html
  Auto-deployment: enabled

Edit src/, scripts/, hosting/ or the relevant source files on a working branch.
Run npm run build and npm test, and commit the updated docs/ output.
After merging into main, GitHub Actions runs unit and browser checks, then
scripts/publish-hostinger.mjs publishes that exact commit's docs tree to the
hostinger branch. Hostinger deploys it automatically. The release branch is
generated: do not edit it directly. No FTP password or SSH key is required.
The workflow compares live public files on both hosts with the tested release.

Only static docs/ files reach public_html. Source, tests, credentials and the
Worker never go into the web root. hosting/.htaccess is included by the build;
it serves the custom 404, redirects HTTP/www to https://hram.lt, disables
directory listings, blocks dotfiles and revalidates stable asset filenames.

AI remains in the separate Cloudflare Worker bukiskis-ai-router. Keep
ALLOWED_ORIGINS=https://hram.lt,https://maksimas-win.github.io
and preserve OPENAI_API_KEY and CHAT_RATE_LIMITER. Worker code changes require
a separate Cloudflare deployment; ordinary site content/design changes deploy
automatically. A changed knowledge snapshot must also be published to the Worker.
Do not change the unrelated parish-assistant Worker.

Rollback: revert the offending main commit and let checks/release run again.
For urgent recovery, Hostinger retains deployment history. The previous hram.lt
files were copied outside public_html to backup-hram-before-parama-2026-10-05.
Keep that directory private and outside the automatically deployed target.
