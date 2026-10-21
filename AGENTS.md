# Development constraints

- Keep this a separate project. Never change the kitchen, gazebo or main parish repositories as part of a task here.
- Static HTML/CSS/JS, zero runtime packages. Node.js >=22 only for build/test/preview.
- Source of truth: src/site.config.json, src/locales/*.json, src/media.json. Rebuild docs after changes.
- Maintain complete RU, LT, EN, PL, DE, UK translations. Do not machine-translate legal entity names, codes or EDS menu labels.
- Never invent a video ID, parish photo, amount raised, completed project or VMI verification.
- Never change the parish code, IBAN or the verification flags without explicit substantiation.
- Distinguish tax year 2026 from application year 2027 and last tax year 2030.
- Do not load YouTube, its thumbnails, analytics or external fonts on initial page load.
- No collection of card numbers, personal codes, passwords, tax information or calculator inputs.
- All concept images must remain labelled as concepts, not completed work.
- Keep reduced-motion, keyboard access, no-JS text and responsive layouts.
- Run npm run build and npm test. Check overflow and interactive behavior after CSS/JS changes.
- Do not claim deployment, live video playback, VMI registration or bank ownership unless actually verified.

- The site is an INFORMATION GUIDE, not a church-themed fundraising landing page. No crosses, religious symbols, church silhouettes or church photographs in the interface, favicon or social preview.
- The GPM explanation, instructions, video, FAQ and official sources must precede optional parish support. Parish legal details remain accurate and visible only in context.
- Do not turn the generic recipient instruction into an instruction to choose one specific recipient. The parish code is an explicitly labelled example.

- Owner-authorized exception (2026-10-04): show the supplied parish-support-appeal.png, including its original symbols, only inside the voluntary parish-support dialog. Preserve the neutral GPM guide and do not use this poster in the hero, favicon or social preview.
- Owner-authorized update (2026-10-05): automatically open that appeal once per tab session on entry. Closing it must restore access to the guide. Show the unacknowledged cookie notice afterward; manual reopening remains available.

## Cross artwork — user decision, 2026-10-21

For parish-related website interface artwork, use the approved decorative four-ended cross with one main horizontal crossbar and trefoil ends. Do not add a lower crossbar, slanted footrest, or a second short upper crossbar. The user explicitly requested: «Делай кресты без нижней перекладины», «просто красивые Кресты»; the two supplied references show the single-horizontal-bar silhouette.

Reuse the project's canonical SVG geometry for headers, footers, decorative interface symbols, favicons, PWA/application icons, and any new promotional artwork. Preserve each site's colors and appropriate sizing. Use SVG rather than the Unicode Orthodox-cross glyph (`☦`, U+2626), whose extra crossbars cannot be controlled. Never mirror, rotate, or add bars to the approved cross.

This rule applies to designed interface artwork. Preserve original photographs, historical illustrations, icons, and quoted/archive content. Do not introduce cross symbols into a project whose existing design policy excludes religious symbols.

Keep this decision in the project's AGENTS.md so future changes retain the approved form. If the SVG is used by a favicon or installation icon, update its versioned references and relevant service-worker caches when its appearance changes.

### Scope for hram.lt

The neutral percent-sign identity and the existing prohibition on religious interface imagery remain in force. This cross-shape rule governs only artwork that a future explicit owner instruction authorizes; it does not authorize adding crosses here. Preserve the original parish-support appeal poster and photographs under their existing exceptions.
