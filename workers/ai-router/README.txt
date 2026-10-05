BUKISKIS AI ROUTER — OpenAI version 1.1.0 (prepared 2026-10-05)

Endpoint: POST https://bukiskis-ai-router.maksimas1982.workers.dev/api/chat
Health: GET /health
Model: gpt-4.1-mini (same model as the existing Bukiskis Project Studio).
Secret: OPENAI_API_KEY, encrypted Cloudflare variable. No key is included here.
CHAT_RATE_LIMITER: namespace 2026100501, 10 requests / 60 seconds per IP.
Allowed browser origin: https://maksimas-win.github.io

This code uses only OpenAI. It does not call Gemini or switch providers automatically.
The existing GEMINI_API_KEY can remain unused in Cloudflare. The separate
parish-assistant Worker and the local project studio are not changed.

Request: {"message":"Что такое 1,2 % GPM?","language":"ru","consent":true}
Optional history: up to 3 complete user/assistant pairs, each text <= 500 characters.
Languages: ru, lt, en, pl, de, uk. Message limit: 500 characters. Body: <= 16384 bytes.
Success: {answer, sources, sourceSnapshotDate, provider:"openai"}.
Errors: 400 invalid/sensitive input; 403 origin; 429 limit; 502 provider error;
503 missing configuration; 504 provider timeout. Errors never expose credentials.

The server supplies the public snapshot as context and calls /v1/responses
with store:false, a 1024-token output cap, no tools, and a 20-second timeout.
Only completed text responses are returned. Fixed sources are returned separately;
render answer via textContent and validate source URLs in the client.

CORS is not authentication. Cloudflare rate limits are not strict global spending
caps. Sensitive-text filtering is incomplete: visitors must not submit personal,
tax or confidential data. Calculator values must never be included. The Worker
does not log messages or keys; providers may retain operational data under their
own terms. Cancelling a browser request may not stop upstream processing.

Run tests: npm test (Node 22+, no runtime dependencies).
Deployment: update only bukiskis-ai-router after adding OPENAI_API_KEY.
Then check /health version 1.1.0 and a real POST from the allowed site origin.
The public site must be built and tested before publishing its AI interface.

Source snapshot: 2026-10-05. Calendar source checked 2026-10-03; this is not a
live VMI lookup. Recipient verification flags are unchanged.

References:
https://developers.openai.com/api/docs/guides/text
https://developers.openai.com/api/docs/guides/your-data
https://developers.cloudflare.com/workers/configuration/secrets/
https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
https://ai.google.dev/gemini-api/terms
