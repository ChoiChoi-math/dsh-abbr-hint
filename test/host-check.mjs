/**
 * Headless check of the Host half: endpoint registration, request parsing, the
 * model call loop, and the failure envelope. No Cordis and no HTTP server — the
 * test drives the registered Fetch handlers with real Request/Response objects.
 *
 * Run: node test/host-check.mjs
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const mod = await import(pathToFileURL(join(here, '..', 'index.js')).href)

assert.equal(typeof mod.apply, 'function', 'host half must export apply')
assert.deepEqual(mod.inject, ['connection'], 'host half waits for the connection registry')

/* ---- fakes ---------------------------------------------------------- */

function makeCtx(overrides = {}) {
  const routes = []
  return {
    routes,
    get(name) {
      return overrides[name]
    },
    connection: {
      fetch: {
        register(route) {
          routes.push(route)
          return () => {
            const index = routes.indexOf(route)
            if (index !== -1) routes.splice(index, 1)
          }
        },
      },
    },
  }
}

const routeFor = (ctx, path) => {
  const route = ctx.routes.find((candidate) => candidate.path === path)
  assert.ok(route, 'route ' + path + ' must be registered')
  return route
}

function postRequest(body) {
  return new Request('http://127.0.0.1/api/abbr-hint.explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function fillRequest(body) {
  return new Request('http://127.0.0.1/api/abbr-hint.fill', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function streamingLlm(chunks) {
  return {
    stream(options) {
      this.lastOptions = options
      return (async function* () {
        for (const chunk of chunks) yield chunk
      })()
    },
    listProviders() {
      return [{ id: 'deepseek-official', name: 'DeepSeek' }]
    },
    async listModels(provider) {
      return provider === 'deepseek-official' ? [{ provider, id: 'deepseek-flash', name: 'Flash' }] : []
    },
  }
}

const defaultModel = {
  currentSelection: () => ({ provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'max' }),
}

/* ---- registration --------------------------------------------------- */

{
  const ctx = makeCtx()
  mod.apply(ctx)
  assert.deepEqual(
    ctx.routes.map((route) => route.path).sort(),
    ['/api/abbr-hint.explain', '/api/abbr-hint.fill', '/api/abbr-hint.ping'],
    'all endpoints register under /api',
  )
  assert.deepEqual(routeFor(ctx, '/api/abbr-hint.explain').methods, ['POST'])
  assert.deepEqual(routeFor(ctx, '/api/abbr-hint.ping').methods, ['GET'])
  assert.ok(ctx.routes.every((route) => route.requestBody === 'buffered'))
}

{
  assert.throws(() => mod.apply({ get() {}, connection: undefined }), /connection service/, 'a missing service fails loudly')
}

/* ---- ping ----------------------------------------------------------- */

{
  const ctx = makeCtx({ llm: streamingLlm([]), agentDefaultModel: defaultModel })
  mod.apply(ctx)
  const response = await routeFor(ctx, '/api/abbr-hint.ping').fetch(new Request('http://127.0.0.1/api/abbr-hint.ping'))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.equal(body.llm, true)
  assert.deepEqual(body.providers, ['deepseek-official'])
  assert.deepEqual(body.route, { provider: 'deepseek-official', model: 'deepseek-flash', source: 'default' })
}

{
  const ctx = makeCtx({})
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.ping')
    .fetch(new Request('http://127.0.0.1/api/abbr-hint.ping'))
    .then((response) => response.json())
  assert.equal(body.llm, false)
  assert.equal(body.route, null)
}

/* ---- explain: success ----------------------------------------------- */

{
  const llm = streamingLlm([
    { type: 'text-delta', text: 'KV cache 把' },
    { type: 'text-delta', text: '算过的键值留在显存里。' },
    { type: 'finish', reason: { kind: 'stop' } },
  ])
  const ctx = makeCtx({ llm, agentDefaultModel: defaultModel })
  mod.apply(ctx)
  const response = await routeFor(ctx, '/api/abbr-hint.explain').fetch(
    postRequest({ key: 'KV', question: '为什么省显存', explanation: '键值缓存', context: '一轮对话里 KV 会一直涨。' }),
  )
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.equal(body.text, 'KV cache 把算过的键值留在显存里。')
  assert.equal(body.model, 'deepseek-flash')

  const sent = llm.lastOptions
  assert.equal(sent.provider, 'deepseek-official')
  assert.equal(sent.model, 'deepseek-flash')
  assert.equal(sent.messages.length, 1)
  assert.equal(sent.messages[0].role, 'user')
  const prompt = sent.messages[0].content[0].text
  assert.ok(prompt.includes('KV'), 'prompt names the abbreviation')
  assert.ok(prompt.includes('为什么省显存'), 'prompt carries the question')
  assert.ok(prompt.includes('一轮对话里 KV 会一直涨。'), 'prompt carries the context')
  assert.ok(prompt.includes('键值缓存'), 'prompt carries the current explanation')
  assert.equal(typeof sent.maxTokens, 'number')
  assert.ok(sent.signal, 'the call carries an abort signal')
}

/* ---- explain: catalog fallback when no default selection ------------ */

{
  const llm = streamingLlm([{ type: 'text-delta', text: '答案' }, { type: 'finish', reason: { kind: 'stop' } }])
  const ctx = makeCtx({ llm })
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.explain')
    .fetch(postRequest({ key: 'API' }))
    .then((response) => response.json())
  assert.equal(body.ok, true)
  assert.equal(body.provider, 'deepseek-official')
  assert.equal(body.model, 'deepseek-flash')
}

/* ---- explain: an empty question still asks -------------------------- */

{
  const llm = streamingLlm([{ type: 'text-delta', text: '展开的解释' }, { type: 'finish', reason: { kind: 'stop' } }])
  const ctx = makeCtx({ llm })
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.explain')
    .fetch(postRequest({ key: 'API' }))
    .then((response) => response.json())
  assert.equal(body.ok, true)
  assert.ok(
    llm.lastOptions.messages[0].content[0].text.includes('展开讲清楚'),
    'an empty question uses the expansion instruction',
  )
}

/* ---- explain: failure envelopes ------------------------------------- */

{
  const llm = streamingLlm([
    { type: 'text-delta', text: '一半' },
    { type: 'finish', reason: { kind: 'error', failure: { code: 'AUTH', message: '凭据无效' } } },
  ])
  const ctx = makeCtx({ llm })
  mod.apply(ctx)
  const response = await routeFor(ctx, '/api/abbr-hint.explain').fetch(postRequest({ key: 'API' }))
  assert.equal(response.status, 200, 'model failures ride the JSON envelope')
  const body = await response.json()
  assert.equal(body.ok, false)
  assert.equal(body.code, 'AUTH')
  assert.equal(body.error, '凭据无效')
}

{
  const ctx = makeCtx({})
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.explain')
    .fetch(postRequest({ key: 'API' }))
    .then((response) => response.json())
  assert.equal(body.ok, false)
  assert.ok(body.error.includes('llm'), 'the missing service is reported: ' + body.error)
}

{
  const ctx = makeCtx({ llm: streamingLlm([]) })
  mod.apply(ctx)
  const response = await routeFor(ctx, '/api/abbr-hint.explain').fetch(postRequest({}))
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, 'missing-key')
}

{
  const ctx = makeCtx({ llm: streamingLlm([]) })
  mod.apply(ctx)
  const response = await routeFor(ctx, '/api/abbr-hint.explain').fetch(
    new Request('http://127.0.0.1/api/abbr-hint.explain', { method: 'POST', body: 'not json' }),
  )
  assert.equal(response.status, 400)
  assert.ok((await response.json()).error.includes('JSON'))
}

{
  const llm = streamingLlm([{ type: 'text-delta', text: '   ' }, { type: 'finish', reason: { kind: 'stop' } }])
  const ctx = makeCtx({ llm })
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.explain')
    .fetch(postRequest({ key: 'API' }))
    .then((response) => response.json())
  assert.equal(body.ok, false)
  assert.ok(body.error.includes('没有返回内容'), 'a blank answer fails loudly')
}

/* ---- explain: a selected term uses the one-line prompt --------------- */

{
  const llm = streamingLlm([
    { type: 'text-delta', text: '一种让模型聚焦局部信息的结构。' },
    { type: 'finish', reason: { kind: 'stop' } },
  ])
  const ctx = makeCtx({ llm, agentDefaultModel: defaultModel })
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.explain')
    .fetch(postRequest({ kind: 'term', key: 'attention mechanism', context: '这条回复讲了 attention mechanism。' }))
    .then((response) => response.json())
  assert.equal(body.ok, true)
  assert.equal(body.text, '一种让模型聚焦局部信息的结构。')
  const prompt = llm.lastOptions.messages[0].content[0].text
  assert.ok(prompt.includes('这个词：attention mechanism'), 'the term prompt names the selection')
  assert.ok(!prompt.includes('缩写：'), 'the term prompt does not call a selection an abbreviation')
  assert.ok(prompt.includes('不超过 40 个汉字'), 'the term prompt asks for one short line')
}

/* ---- fill: one batch, several abbreviations ------------------------- */

{
  const llm = streamingLlm([
    { type: 'text-delta', text: '1. SSE：服务器单向推送事件流。\n' },
    { type: 'text-delta', text: '- KV: 键值缓存，把算过的结果留下来复用。\n' },
    { type: 'text-delta', text: 'TTFT: 首 token 延迟。\n' },
    { type: 'finish', reason: { kind: 'stop' } },
  ])
  const ctx = makeCtx({ llm, agentDefaultModel: defaultModel })
  mod.apply(ctx)
  const response = await routeFor(ctx, '/api/abbr-hint.fill').fetch(
    fillRequest({
      items: [
        { key: 'SSE', context: '这条回复提到了 SSE 和 KV。' },
        { key: 'KV' },
        { key: 'TTFT' },
      ],
    }),
  )
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.deepEqual(body.entries, {
    SSE: '服务器单向推送事件流。',
    KV: '键值缓存，把算过的结果留下来复用。',
    TTFT: '首 token 延迟。',
  })
  assert.deepEqual(body.missing, [])
  assert.equal(body.model, 'deepseek-flash')

  const prompt = llm.lastOptions.messages[0].content[0].text
  assert.ok(prompt.includes('- SSE') && prompt.includes('- KV') && prompt.includes('- TTFT'), 'prompt lists the keys')
  assert.ok(prompt.includes('这条回复提到了 SSE 和 KV。'), 'prompt carries the reply excerpt')
}

/* ---- fill: case-insensitive keys, missing entries ------------------- */

{
  const llm = streamingLlm([
    { type: 'text-delta', text: 'sse: 小写也能对回请求里的写法。\n' },
    { type: 'finish', reason: { kind: 'stop' } },
  ])
  const ctx = makeCtx({ llm })
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.fill')
    .fetch(fillRequest({ items: [{ key: 'SSE' }, { key: 'QPS' }] }))
    .then((response) => response.json())
  assert.equal(body.ok, true)
  assert.deepEqual(body.entries, { SSE: '小写也能对回请求里的写法。' })
  assert.deepEqual(body.missing, ['QPS'], 'keys the model skipped are reported')
}

/* ---- fill: unusable output ------------------------------------------ */

{
  const llm = streamingLlm([{ type: 'text-delta', text: '这是一段没有按格式来的话。' }, { type: 'finish', reason: { kind: 'stop' } }])
  const ctx = makeCtx({ llm })
  mod.apply(ctx)
  const body = await routeFor(ctx, '/api/abbr-hint.fill')
    .fetch(fillRequest({ items: [{ key: 'SSE' }] }))
    .then((response) => response.json())
  assert.equal(body.ok, false)
  assert.ok(body.error.includes('格式'), 'a malformed answer is reported: ' + body.error)
}

/* ---- fill: input bounds --------------------------------------------- */

{
  const llm = streamingLlm([{ type: 'text-delta', text: 'A1: 一\n' }, { type: 'finish', reason: { kind: 'stop' } }])
  const ctx = makeCtx({ llm })
  mod.apply(ctx)
  const items = [{ key: 'A1' }, { key: 'A1' }, ...Array.from({ length: 20 }, (_, index) => ({ key: 'B' + index }))]
  const body = await routeFor(ctx, '/api/abbr-hint.fill')
    .fetch(fillRequest({ items }))
    .then((response) => response.json())
  assert.equal(body.ok, true)
  const prompt = llm.lastOptions.messages[0].content[0].text
  assert.ok(prompt.includes('- A1'), 'the duplicate is kept once')
  assert.equal((prompt.match(/^- [A-Z0-9]/gm) || []).length, 12, 'a batch is capped at 12 keys')
  assert.ok(!prompt.includes('- B11'), 'keys past the cap are dropped')
}

{
  const ctx = makeCtx({ llm: streamingLlm([]) })
  mod.apply(ctx)
  const response = await routeFor(ctx, '/api/abbr-hint.fill').fetch(fillRequest({ items: [] }))
  assert.equal(response.status, 400)
  assert.ok((await response.json()).error.includes('没有要补'))
}

console.log('ok — host endpoints, model call, prompt, failures, fill')
