/**
 * Host half of the abbreviation-hint bundle.
 *
 * The browser half owns the glossary, the hover card, and the page scan. This
 * half adds the two capabilities the browser cannot have on its own: explaining
 * one abbreviation on demand, and pre-filling the ones the scan just found.
 * There is no other copy of the glossary here — the browser owns it; these
 * endpoints only turn a token plus its surrounding text into Chinese prose.
 *
 * Transport is the app's own authenticated `/api` bridge, not a separate web
 * route: `ctx.connection.fetch.register` claims exact Fetch endpoints there, so
 * the same call works in the browser and in the Desktop shell carrier, and it
 * inherits the bridge's loopback/trust/authentication fence.
 *
 *   GET  /api/abbr-hint.ping     { ok, llm, providers, route }
 *   POST /api/abbr-hint.explain  { key, question, explanation, context }
 *                               -> { ok, text, provider, model }
 *   POST /api/abbr-hint.fill     { items: [{ key, context }] }
 *                               -> { ok, entries: { KEY: text }, missing: [] }
 */

export const name = 'abbr-hint'

export const inject = ['connection']

const PING_PATH = '/api/abbr-hint.ping'
const EXPLAIN_PATH = '/api/abbr-hint.explain'
const FILL_PATH = '/api/abbr-hint.fill'

const EXPLAIN_TOKENS = 600
const FILL_TOKENS = 900
const TIMEOUT_MS = 45_000
const MAX_ITEMS = 12
const MAX_CONTEXT = 1500
const MAX_FIELD = { key: 80, question: 500, explanation: 1000, context: 4000 }

/**
 * Register the three endpoints for this fiber.
 * @param ctx - host context exposing the connection registry, the LLM service, and the default model.
 */
export function apply(ctx) {
  const connection = Reflect.get(ctx, 'connection')
  if (!connection || !connection.fetch) throw new Error('abbr-hint: the connection service is unavailable')

  connection.fetch.register({
    path: PING_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async () => json(await describe(ctx)),
  })

  connection.fetch.register({
    path: EXPLAIN_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await readJson(request)
      if (body === undefined) return json({ ok: false, error: '请求体不是 JSON' }, 400)
      const key = text(body && body.key).slice(0, MAX_FIELD.key)
      if (!key) return json({ ok: false, error: 'missing-key' }, 400)
      const input = {
        key,
        question: text(body.question).slice(0, MAX_FIELD.question),
        explanation: text(body.explanation).slice(0, MAX_FIELD.explanation),
        context: text(body.context).slice(0, MAX_FIELD.context),
      }
      try {
        const prompt = body.kind === 'term' ? buildTermPrompt(input) : buildExplainPrompt(input)
        const result = await runPrompt(ctx, prompt, EXPLAIN_TOKENS)
        return json({ ok: true, text: result.text, provider: result.provider, model: result.model })
      } catch (error) {
        return json(failurePayload(error))
      }
    },
  })

  connection.fetch.register({
    path: FILL_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const body = await readJson(request)
      if (body === undefined) return json({ ok: false, error: '请求体不是 JSON' }, 400)
      const items = normalizeItems(body && body.items)
      if (items.length === 0) return json({ ok: false, error: '没有要补的缩写' }, 400)
      try {
        const result = await runPrompt(ctx, buildFillPrompt(items), FILL_TOKENS)
        const entries = parseEntries(result.text, items)
        const missing = items.map((item) => item.key).filter((key) => entries[key] === undefined)
        if (Object.keys(entries).length === 0) {
          return json({
            ok: false,
            error: '模型没有按格式返回解释',
            provider: result.provider,
            model: result.model,
            raw: result.text.slice(0, 300),
          })
        }
        return json({ ok: true, entries, missing, provider: result.provider, model: result.model })
      } catch (error) {
        return json(failurePayload(error))
      }
    },
  })
}

/* ------------------------------------------------------------------ */
/* Model calls                                                         */
/* ------------------------------------------------------------------ */

/**
 * Run one prompt through the profile's model route.
 * @param ctx - host context.
 * @param prompt - the complete one-shot prompt.
 * @param maxTokens - output cap for this call.
 * @returns the assistant text plus the route that produced it.
 */
async function runPrompt(ctx, prompt, maxTokens) {
  const llm = ctx.get('llm')
  if (!llm || typeof llm.stream !== 'function') throw new Error('当前组合里没有可用的 llm 服务')
  const route = await pickRoute(ctx, llm)

  const controller = new AbortController()
  const timer = setTimeout(() => {
    try {
      controller.abort()
    } catch (error) {
      /* ignore */
    }
  }, TIMEOUT_MS)

  let output = ''
  let failure = null
  try {
    const stream = llm.stream({
      provider: route.provider,
      model: route.model,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      maxTokens,
      signal: controller.signal,
    })
    for await (const chunk of stream) {
      if (!chunk || typeof chunk !== 'object') continue
      if (chunk.type === 'text-delta' && typeof chunk.text === 'string') output += chunk.text
      else if (chunk.type === 'finish' && chunk.reason) {
        const reason = chunk.reason
        if (reason.kind === 'error' || reason.kind === 'aborted') {
          failure = reason.failure || { code: 'UNKNOWN', message: '模型调用失败' }
        }
      }
    }
  } finally {
    clearTimeout(timer)
  }

  if (failure) {
    const error = new Error(failure.message || failure.code || '模型调用失败')
    if (failure.code) error.code = failure.code
    throw error
  }
  const trimmed = output.trim()
  if (!trimmed) throw new Error('模型没有返回内容')
  return { text: trimmed, provider: route.provider, model: route.model }
}

/**
 * Prefer the profile's own default route; otherwise the first provider that advertises a model.
 * @param ctx - host context.
 * @param llm - the LLM service.
 * @returns the provider and model to call.
 */
async function pickRoute(ctx, llm) {
  try {
    const defaultModel = ctx.get('agentDefaultModel')
    const selection =
      defaultModel && typeof defaultModel.currentSelection === 'function' ? defaultModel.currentSelection() : null
    if (selection && selection.provider && selection.model) {
      return { provider: selection.provider, model: selection.model, source: 'default' }
    }
  } catch (error) {
    /* fall through to the catalog */
  }
  for (const provider of llm.listProviders()) {
    const id = provider && (provider.id || provider.name)
    if (!id) continue
    try {
      const models = await llm.listModels(id)
      if (models && models.length > 0) return { provider: id, model: models[0].id, source: 'catalog' }
    } catch (error) {
      /* next provider */
    }
  }
  throw new Error('没有可用的模型路由')
}

/** Report whether this half can serve an explanation right now. */
async function describe(ctx) {
  const llm = ctx.get('llm')
  if (!llm || typeof llm.stream !== 'function') {
    return { ok: true, llm: false, providers: [], route: null }
  }
  let providers = []
  try {
    providers = llm
      .listProviders()
      .map((provider) => provider && (provider.id || provider.name))
      .filter(Boolean)
  } catch (error) {
    providers = []
  }
  let route = null
  try {
    route = await pickRoute(ctx, llm)
  } catch (error) {
    route = null
  }
  return { ok: true, llm: true, providers, route }
}

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

/**
 * The on-demand prompt: one abbreviation, the user's question, and the reply.
 * @param input - the abbreviation, its current explanation, the reply, and the question.
 * @returns the prompt text.
 */
function buildExplainPrompt(input) {
  const lines = ['你在帮一位中文用户读懂 AI 回复里出现的一个缩写。', '', '缩写：' + input.key]
  if (input.explanation) lines.push('现在卡片上的简短解释：' + input.explanation)
  if (input.context) {
    lines.push('它出现在这条回复里：')
    lines.push('"""')
    lines.push(input.context)
    lines.push('"""')
  }
  lines.push('')
  lines.push(input.question ? '用户追问：' + input.question : '用户想把这个解释展开讲清楚。')
  lines.push('')
  lines.push('要求：')
  lines.push('- 用中文回答，直接给内容，不要客套、不要复述问题。')
  lines.push('- 2~5 句话，可以带一个很短的例子；要能放进一张窄卡片里。')
  lines.push('- 只讲和这个缩写、以及它在这条回复里的用法相关的内容；不确定就说不确定，不要编。')
  lines.push('- 纯文本段落，不要 Markdown 标题或列表。')
  return lines.join('\n')
}

/**
 * The selection prompt: one term the user picked out of a reply, defined in one
 * line so it can head a hover card.
 * @param input - the selected term, the reply, and an optional question.
 * @returns the prompt text.
 */
function buildTermPrompt(input) {
  const lines = ['你在帮一位中文用户读懂 AI 回复里的一个词。', '', '这个词：' + input.key]
  if (input.context) {
    lines.push('它出现的回复：')
    lines.push('"""')
    lines.push(input.context)
    lines.push('"""')
  }
  lines.push('')
  lines.push(input.question ? '用户追问：' + input.question : '用户想要一句话释义。')
  lines.push('')
  lines.push('要求：')
  lines.push('- 用中文，一句话说清它指什么；不超过 40 个汉字，不要重复这个词本身。')
  lines.push('- 只讲和这个词、以及它在这段文字里用法相关的内容；不确定就说不确定，不要编。')
  lines.push('- 纯文本，不要标题、列表或引号。')
  return lines.join('\n')
}

/**
 * The pre-fill prompt: a handful of detected abbreviations and the reply they came from.
 * @param items - the abbreviations with the reply text around them.
 * @returns the prompt text.
 */
function buildFillPrompt(items) {
  const lines = [
    '下面是一条 AI 回复里出现的若干缩写。为每一个写一句中文解释，用来当悬停卡片上的释义。',
    '',
    '缩写：',
  ]
  for (const item of items) lines.push('- ' + item.key)
  const context = items.map((item) => item.context).filter(Boolean)[0]
  if (context) {
    lines.push('')
    lines.push('它们出现的回复：')
    lines.push('"""')
    lines.push(context)
    lines.push('"""')
  }
  lines.push('')
  lines.push('输出要求（严格）：')
  lines.push('- 每个缩写一行，格式：缩写: 解释')
  lines.push('- 解释不超过 40 个汉字，一句话说清它指什么；不要重复缩写本身，不要句号结尾的客套。')
  lines.push('- 只输出这些行，不要标题、编号、空行或额外说明。')
  lines.push('- 不确定的缩写也输出一行，解释写「不确定」。')
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Read `KEY: 解释` lines back into a map keyed by the requested spelling.
 * Unknown keys and empty explanations are dropped.
 * @param raw - the model output.
 * @param items - the requested abbreviations.
 * @returns entries keyed by the exact requested key.
 */
function parseEntries(raw, items) {
  const wanted = new Map()
  for (const item of items) {
    wanted.set(item.key.toLowerCase(), item.key)
  }
  const entries = {}
  for (const rawLine of String(raw).split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, '').trim()
    if (!line) continue
    const match = /^([^\s:：]{1,24})\s*[:：]\s*(.+)$/.exec(line)
    if (!match) continue
    const key = wanted.get(match[1].toLowerCase())
    if (!key) continue
    const value = match[2].trim().replace(/^["“”'']|["“”'']$/g, '').trim()
    if (!value || value === '不确定') continue
    if (entries[key] === undefined) entries[key] = value.slice(0, 300)
  }
  return entries
}

/**
 * Accept and bound the client's item list.
 * @param value - the untrusted `items` field.
 * @returns at most MAX_ITEMS entries with trimmed keys and contexts.
 */
function normalizeItems(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const items = []
  for (const candidate of value) {
    const key = text(candidate && candidate.key).slice(0, 40)
    if (!key || seen.has(key.toLowerCase())) continue
    seen.add(key.toLowerCase())
    items.push({ key, context: text(candidate.context).slice(0, MAX_CONTEXT) })
    if (items.length >= MAX_ITEMS) break
  }
  return items
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Parse a JSON request body; `undefined` means the body was not JSON. */
async function readJson(request) {
  try {
    return await request.json()
  } catch (error) {
    return undefined
  }
}

/** One JSON response. */
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Normalize one model failure into the client's envelope. */
function failurePayload(error) {
  return {
    ok: false,
    error: error && error.message ? error.message : String(error),
    code: error && error.code ? String(error.code) : undefined,
  }
}

/** Coerce one input field to a trimmed string. */
function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}
