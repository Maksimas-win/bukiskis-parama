# Public GPM helper v1

Published scope: a local source-based chatbot for the 1.2% GPM information guide, not the owner presentation studio and not a generative model. Responses are matched by topic/phrasing and drawn from the site's existing localized text. No private archive files, contracts, photos, or donor amounts are imported.

The 24-topic structure is derived from the supplied `public/gpm-knowledge.json` archive. The builder regenerates the same public index from `src/locales/*.json` and `src/site.config.json` rather than introducing stale duplicated body text. Official VMI calendar rechecked 2026-10-03: https://www.vmi.lt/evmi/paramos-skyrimas-34-str.-1 (application 2027-01-01 through 2027-05-03 for 2026).

## Implementation
- `src/assets/gpm-helper.js`: local intent matching, redaction, guided steps, native accessible dialog. No network model requests or persistence; the corpus script loads from this site once on opening the dialog.
- `src/locales/gpm-helper.ui.json`: six complete UI translations and explicit non-AI mode disclosures.
- `scripts/build-gpm-helper.mjs`: 24 records per language from authoritative project sources, private-data allowlisting, localized privacy note.
- `tests/gpm-helper.test.cjs`: content isolation, matching, date boundaries, sensitive-input checks and no model calls.
- `scripts/check-gpm-helper.mjs`: development-only Chromium test on the unchanged HTTP-served site, including its CSP. Covers all languages, desktop/mobile/landscape, no-JS, no question-related requests, no overflow, focus return, input safety, and screenshots.

No new server, paid account or paid model request was created. The existing CSP `connect-src 'none'` is unchanged. Actual OpenAI conversational generation requires a separately deployed, authenticated/rate-limited server with a server-side key and reviewed data disclosure; localhost is not a public production endpoint. Do not place an API key in `docs`, JavaScript, GitHub or this chat.

Calendar messages follow the browser's date in Europe/Vilnius; this is not a live VMI lookup. After 90 days a freshness warning appears. Recipient verification flags are not changed. GPM and optional parish support remain distinct; general answers never select the parish for the visitor.
