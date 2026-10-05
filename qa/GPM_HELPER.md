# Public GPM assistant

The 29-topic local guide remains available in all six languages. **Ask AI** sends a free-form question to the bukiskis-ai-router Cloudflare Worker only after the visitor accepts the in-dialog disclosure. Production provider: OpenAI, gpt-4.1-mini, Responses API. Gemini is not called or used as a fallback.

`npm run build` now derives both `workers/ai-router/knowledge.json` and the final `KNOWLEDGE` block in the standalone Worker from the public translations. Do not edit these generated snapshots independently. A content change also requires deploying the rebuilt Worker to `bukiskis-ai-router`; GitHub Pages deployment alone does not update Cloudflare. See `qa/CONTENT_AUDIT_2026-10-05.md` for sources and the remaining verification boundary.

## Data flow

- Only the question, language, consent flag and up to three recent AI message pairs are sent. Earlier long answers are clipped to the server's 500-character history limit. Topic clicks and local searches do not send questions.
- Calculator inputs, private drafts, donor records, contacts and browser storage are never included. Sensitive-input filtering is a limited safeguard, not a guarantee that all personal information is detected.
- Consent and context live in memory. Clear and close revoke consent and discard AI context. Closing cancels waiting for a pending answer but cannot retract a request already received by the provider.
- The Worker sets store:false, does not log message bodies or credentials, and uses a public, server-owned source snapshot. This does not promise zero retention by Cloudflare or OpenAI.
- Output is plain text via textContent. Source links use an exact HTTPS allowlist, independent of model text. No new runtime dependencies, inline scripts or inline styles.
- CSP connect-src permits only https://bukiskis-ai-router.maksimas1982.workers.dev. Secrets stay in Cloudflare encrypted variables.

## Failure handling

One request at a time, no automatic retries, a 28-second client timeout and a 20-second provider timeout. Clear, close, local search and topic selection abort the pending request and suppress late answers. Errors and rate limits offer local materials. The Worker fails closed if its secret or rate limiter is missing. Per-IP limiting is not authentication or a strict global spending cap.

## Verification

- src/assets/gpm-helper.js: accessible dialogue, local search, consent and cancellation.
- src/assets/gpm-ai.js: isolated HTTP transport and response validation.
- src/locales/gpm-helper.ui.json: six-language disclosure and error messages.
- workers/ai-router/: separately deployed backend, public context and tests.
- npm run build and npm test: generated output, local behavior, transport and Worker tests.
- scripts/check-gpm-helper.mjs: desktop/mobile/landscape, all languages, no question requests before consent, mocked success/history/rate errors/cancel/reset, XSS-safe output and no-JS guide.

Browser API scenarios mock only the endpoint; HTML, scripts and CSP remain the production versions. Live smoke tests are separate from mocked results.

The source snapshot is not a live VMI search. Calendar freshness and unverified recipient flags remain unchanged. General GPM answers do not select a recipient.

OpenAI data controls: https://developers.openai.com/api/docs/guides/your-data

Gemini is excluded because its Free tier does not satisfy Google's requirement for serving API clients to EEA users: https://ai.google.dev/gemini-api/terms
