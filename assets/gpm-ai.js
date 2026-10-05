/* Optional AI transport. No API keys, persistence, or automatic requests. */
(function (host) {
  'use strict';
  const ENDPOINT = 'https://bukiskis-ai-router.maksimas1982.workers.dev/api/chat';
  const SOURCES = new Set([
    'https://www.vmi.lt/evmi/paramos-skyrimas-34-str.-1',
    'https://deklaravimas.vmi.lt/',
    'https://hram.lt/',
    'https://maksimas-win.github.io/bukiskis-parama/'
  ]);
  function remember(history, message, answer) {
    // Keep only complete pairs, within the deployed server's 500-character limit.
    return [...history, {role: 'user', text: message},
      {role: 'assistant', text: answer.slice(0, 500)}].slice(-6);
  }
  async function request({message, language, history, consent, signal}, fetcher = host.fetch.bind(host)) {
    if (consent !== true) throw new Error('CONSENT_REQUIRED');
    const response = await fetcher(ENDPOINT, {
      method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
      referrerPolicy: 'no-referrer', redirect: 'error', signal,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message, language, history, consent: true})
    });
    if (!response.ok) {
      const error = new Error('AI_UNAVAILABLE');
      error.status = response.status;
      throw error;
    }
    const value = await response.json();
    if (typeof value.answer !== 'string' || !value.answer.trim() || value.answer.length > 6000 ||
        !['gemini', 'openai'].includes(value.provider)) throw new Error('INVALID_AI_RESPONSE');
    return {
      answer: value.answer.trim(), provider: value.provider,
      sources: (Array.isArray(value.sources) ? value.sources : []).slice(0, 5)
        .filter(source => source && typeof source.title === 'string' && source.title.length <= 80 && SOURCES.has(source.url)),
      sourceSnapshotDate: /^\d{4}-\d{2}-\d{2}$/.test(value.sourceSnapshotDate || '') ? value.sourceSnapshotDate : ''
    };
  }
  const api = {request, remember};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (host.document) host.GpmAI = api;
})(typeof window === 'undefined' ? globalThis : window);
