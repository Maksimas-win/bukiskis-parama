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
