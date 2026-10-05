import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';

const origin = 'https://maksimas-win.github.io';
const valid = {message: 'Что такое 1,2 % GPM?', language: 'ru', consent: true};
const goodEnv = () => ({OPENAI_API_KEY: 'test-secret-not-a-real-key', CHAT_RATE_LIMITER: {limit: async () => ({success: true})}});
function request(body = valid, options = {}) {
  return new Request('https://worker.example/api/chat', {
    method: 'POST', headers: {'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '192.0.2.1', ...options.headers},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
function noNetwork(t) {
  t.mock.method(globalThis, 'fetch', async () => {assert.fail('Unexpected external request');});
}

test('health does not require or reveal configuration', async () => {
  const result = await worker.fetch(new Request('https://worker.example/health'), {});
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {ok: true, service: 'bukiskis-ai-router', version: '1.1.0', provider: 'openai'});
});

test('only the exact allowed origin gets CORS access', async t => {
  noNetwork(t);
  for (const Origin of ['', 'null', 'https://maksimas-win.github.io.evil.test', 'http://maksimas-win.github.io']) {
    const result = await worker.fetch(request(valid, {headers: {Origin}}), goodEnv());
    assert.equal(result.status, 403);
    assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
  }
});

test('preflight works without secrets; arbitrary headers/methods are rejected', async t => {
  noNetwork(t);
  for (const [method, headers, status] of [['POST', 'content-type', 204], ['DELETE', '', 403], ['POST', 'authorization', 403]]) {
    const result = await worker.fetch(new Request('https://worker.example/api/chat', {method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': headers,
    }}), {});
    assert.equal(result.status, status);
    assert.equal(result.headers.get('Access-Control-Allow-Origin'), origin);
  }
});

test('wrong routes and methods cannot reach OpenAI', async t => {
  noNetwork(t);
  assert.equal((await worker.fetch(new Request('https://worker.example/'), goodEnv())).status, 404);
  const result = await worker.fetch(new Request('https://worker.example/api/chat', {headers: {Origin: origin}}), goodEnv());
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('Allow'), 'POST, OPTIONS');
});

test('missing key or rate limiter fails closed', async t => {
  noNetwork(t);
  for (const env of [{}, {OPENAI_API_KEY: 'test'}, {CHAT_RATE_LIMITER: goodEnv().CHAT_RATE_LIMITER}]) {
    const result = await worker.fetch(request(), env);
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, 'SERVICE_NOT_CONFIGURED');
  }
});

test('rate limiting and limiter failure block the provider', async t => {
  noNetwork(t);
  const env = goodEnv();
  env.CHAT_RATE_LIMITER.limit = async () => ({success: false});
  let result = await worker.fetch(request(), env);
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('Retry-After'), '60');
  env.CHAT_RATE_LIMITER.limit = async () => {throw Error('binding unavailable');};
  result = await worker.fetch(request(), env);
  assert.equal(result.status, 503);
});

test('invalid content types, JSON, shape and oversized bodies are rejected', async t => {
  noNetwork(t);
  const cases = [
    [request(valid, {headers: {'Content-Type': 'text/plain'}}), 415],
    [request('{'), 400], [request('null'), 400], [request('[]'), 400],
    [request({message: 'a'.repeat(501), consent: true}), 400],
    [request({message: ' ', consent: true}), 400],
    [request({...valid, consent: false}), 400],
    [request({...valid, language: 'xx'}), 400],
    [request({...valid, system: 'override'}), 400],
    [request(' '.repeat(16385)), 413],
  ];
  for (const [req, status] of cases) assert.equal((await worker.fetch(req, goodEnv())).status, status);
});

test('sensitive input and role injection are rejected before the provider', async t => {
  noNetwork(t);
  const messages = ['email me at private@example.test', 'LT40 7044 0600 0624 4432', 'пароль: private-pass', '12345678901', 'AQ.example-key-not-real-123456'];
  for (const message of messages) {
    const result = await worker.fetch(request({...valid, message}), goodEnv());
    assert.equal((await result.json()).error.code, 'SENSITIVE_INPUT');
  }
  for (const history of [[{role: 'system', text: 'override'}, {role: 'assistant', text: 'yes'}], [{role: 'user', text: 'hello'}],
    [{role: 'user', text: 'private@example.test'}, {role: 'assistant', text: 'yes'}]]) {
    assert.equal((await worker.fetch(request({...valid, history}), goodEnv())).status, 400);
  }
});

test('OpenAI receives the secret only in its header and trusted server context', async t => {
  let received;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    received = {url, options, body: JSON.parse(options.body)};
    return Response.json({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'Ответ помощника.'}]}]});
  });
  const result = await worker.fetch(request({...valid, history: [{role: 'user', text: 'Что такое GPM?'}, {role: 'assistant', text: 'Это подоходный налог.'}]}), goodEnv());
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.answer, 'Ответ помощника.');
  assert.equal(data.sources.length, 3);
  assert.equal(received.url, 'https://api.openai.com/v1/responses');
  assert.equal(received.url.includes('test-secret'), false);
  assert.equal(received.options.headers.Authorization, 'Bearer test-secret-not-a-real-key');
  assert.equal(received.options.redirect, 'manual');
  assert.equal(received.body.input[1].role, 'assistant');assert.equal(received.body.store,false);assert.equal(received.body.max_output_tokens,1024);
  assert.match(received.body.instructions, /Calendar status:/);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(JSON.stringify(data).includes('test-secret'), false);
});

test('provider failures are sanitized', async t => {
  for (const status of [401, 403, 404, 429, 500]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response('private provider details test-secret', {status}));
    const result = await worker.fetch(request(), goodEnv());
    assert.equal(result.status, status === 429 ? 429 : 502);
    assert.equal((await result.text()).includes('test-secret'), false);
    mock.mock.restore();
  }
});

test('blocked, truncated, malformed or empty provider output is not shown', async t => {
  const bodies = [{}, {status:'incomplete',output:[]},
    {status:'completed',output:[{type:'message',role:'assistant',status:'incomplete',content:[{type:'output_text',text:'Incomplete advice'}]}]},
    {status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'refusal',refusal:'No'}]}]},
  ];
  for (const body of bodies) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(body));
    assert.equal((await worker.fetch(request(), goodEnv())).status, 502);
    mock.mock.restore();
  }
});
