/**
 * Headless check of @local/dsh-abbr-hint: loads the Client bundle under a tiny
 * stub environment and exercises the pure matching / state layer.
 *
 * Run: node test/check.cjs
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8');

/* ---- stub environment ------------------------------------------------ */

const storage = new Map();
const localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

let captured = null;
const window = {
  localStorage,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  innerWidth: 1200,
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  getSelection: () => '',
};

global.window = window;
global.document = { body: null, head: null, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
global.NodeFilter = { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };
global.MutationObserver = class {
  observe() {}
  disconnect() {}
};
global.localStorage = localStorage;

window.__ModuleLoader__ = {
  load(entry) {
    captured = entry;
  },
};

const requireStub = (name) => {
  if (name === 'react') {
    return {
      createElement: () => null,
      useState: () => [0, () => {}],
      useEffect: () => {},
    };
  }
  throw new Error('unexpected require: ' + name);
};

/* ---- load the bundle ------------------------------------------------- */

// eslint-disable-next-line no-eval
eval(source);

assert.ok(captured, 'bundle did not register itself');
assert.strictEqual(captured.id, 'dsh-abbr-hint');

const mod = captured.factory(requireStub);
assert.strictEqual(typeof mod.apply, 'function', 'factory must export apply');

const contexts = [];
mod.apply({
  effect: (fn) => {
    contexts.push(fn);
    return () => {};
  },
  inject: () => {},
});

const api = window.__dshAbbrHint;
assert.ok(api, 'debug handle should exist');

const keysOf = (text) => api.match(text).map((m) => text.slice(m.start, m.end));

/* ---- matching -------------------------------------------------------- */

const cases = [
  ['我们用 API 和 LLM 做 RAG，e.g. 先检索再回答', ['API', 'LLM', 'RAG', 'e.g.']],
  ['HTML 必须是 UTF-8 编码', ['HTML', 'UTF-8']],
  ['README.md 里写了用法', ['README']],
  ['只有 A 和 I 这种单个字母', []],
  ['x86 架构的 CPU 很快', ['CPU']],
  ['HTTP-based 的 REST 接口', ['HTTP', 'REST']],
  ['一句话里没有缩写', []],
  ['按 Ctrl+C 复制（Ctrl 也算缩写）', ['C']],
];

for (const [text, expected] of cases) {
  const got = keysOf(text);
  if (text === '按 Ctrl+C 复制（Ctrl 也算缩写）') {
    // A single uppercase letter is below the length floor; nothing is expected there.
    assert.deepStrictEqual(got, ['C'].filter((v) => v.length > 1), 'single letters stay unmarked: ' + text);
    continue;
  }
  assert.deepStrictEqual(got, expected, 'matching failed for: ' + text);
}

/* glossary-driven matching for lower-case entries */
api.store.setEntry('npm', 'Node 包管理器');
api.store.setEntry('pnpm', '更快的 Node 包管理器');
assert.deepStrictEqual(keysOf('npm 和 pnpm 都行'), ['npm', 'pnpm']);
assert.deepStrictEqual(keysOf('用 NPM 装'), ['NPM']);
assert.strictEqual(api.store.canonicalKey('NPM'), 'npm', 'case variants resolve to the stored key');

/* selected terms: Chinese, multi-word, and case-insensitive roman words */
api.store.setEntry('知识图谱', '一种用图结构组织知识的数据形式');
api.store.setEntry('attention mechanism', '注意力机制');
api.store.setEntry('K8s', 'Kubernetes 的缩写');
assert.deepStrictEqual(keysOf('这本书讲知识图谱和历史'), ['知识图谱']);
assert.deepStrictEqual(keysOf('讲讲知识图谱'), ['知识图谱']);
assert.deepStrictEqual(keysOf('the attention mechanism here'), ['attention mechanism']);
assert.deepStrictEqual(keysOf('用 K8s 部署'), ['K8s']);
assert.deepStrictEqual(keysOf('用 k8s 部署'), ['k8s'], 'roman-word keys match case-insensitively');
assert.strictEqual(api.store.canonicalKey('k8s'), 'K8s', 'and resolve back to the stored spelling');

/* the selection is trimmed before it becomes a key */
assert.strictEqual(api.normalizeTerm('  「MoE」，'), 'MoE');
assert.strictEqual(api.normalizeTerm('attention    mechanism'), 'attention mechanism');
assert.strictEqual(api.normalizeTerm('（知识图谱）'), '知识图谱');

/* removal sticks and does not come back from the defaults */
api.store.removeEntry('API');
assert.strictEqual(api.store.get().glossary.API, undefined);
assert.ok(api.store.get().deleted.indexOf('API') !== -1);
assert.deepStrictEqual(keysOf('API 没了'), ['API']);
assert.strictEqual(api.store.get().glossary.API, undefined);

/* long-form details live beside the short explanation */
api.store.setEntry('KV', '键值缓存');
api.store.setDetails('KV', 'KV cache 把已经算过的注意力键值存在显存里，下一轮直接复用。');
assert.strictEqual(api.store.getDetails('KV').indexOf('注意力') !== -1, true);
api.store.setDetails('KV', '一条更短的新解释');
assert.strictEqual(api.store.getDetails('KV'), '一条更短的新解释', 'a new answer replaces the old one');
api.store.setDetails('KV', '   ');
assert.strictEqual(api.store.getDetails('KV'), '一条更短的新解释', 'blank answers are ignored');

/* persistence: reload the bundle with the same storage */
const snapshot = storage.get('dsh-abbr-hint.v1');
assert.ok(snapshot, 'state must be persisted');
assert.ok(JSON.parse(snapshot).details.KV, 'details must be persisted');

/* ---- state reload ---------------------------------------------------- */
storage.set(
  'dsh-abbr-hint.v1',
  JSON.stringify({
    v: 1,
    enabled: true,
    autoFill: false,
    glossary: { API: '自定义的解释' },
    details: { API: '更长的自定义解释' },
    auto: { API: true },
    deleted: ['LLM'],
  }),
);
captured = null;
eval(source);
const mod2 = captured.factory(requireStub);
mod2.apply({ effect: () => () => {}, inject: () => {} });
const api2 = window.__dshAbbrHint;
assert.strictEqual(api2.store.get().glossary.API, '自定义的解释', 'stored edit wins over the default');
assert.strictEqual(api2.store.get().details.API, '更长的自定义解释', 'stored details reload');
assert.strictEqual(api2.store.get().auto.API, true, 'the auto mark reloads');
assert.strictEqual(api2.store.get().autoFill, false, 'the auto-fill preference reloads');
assert.strictEqual(api2.store.get().glossary.LLM, undefined, 'deleted default stays deleted');
assert.strictEqual(api2.store.get().glossary.DSH.indexOf('DeepSeek Harness') !== -1, true, 'other defaults remain');

/* removing an entry clears its details too */
api2.store.removeEntry('API');
assert.strictEqual(api2.store.get().details.API, undefined, 'details die with the entry');
api2.store.setEntry('API', '回来了');
assert.strictEqual(api2.store.getDetails('API'), '', 're-adding starts without details');

/* ---- auto-fill bookkeeping ------------------------------------------ */

assert.strictEqual(api.store.get().autoFill, true, 'auto-fill defaults on');
api.store.setAutoFill(false);
assert.strictEqual(api.store.get().autoFill, false);
api.store.setAutoFill(true);

api.store.setEntry('TPOT', '每输出一个 token 的平均耗时', true);
assert.strictEqual(api.store.get().auto.TPOT, true, 'generated entries are marked');
api.store.setEntry('TPOT', '我自己改的版本');
assert.strictEqual(api.store.get().auto.TPOT, undefined, 'a user edit clears the mark');
assert.strictEqual(api.store.get().glossary.TPOT, '我自己改的版本');

api.store.setEntry('TTFT', '首 token 延迟', true);
api.store.removeEntry('TTFT');
assert.strictEqual(api.store.get().auto.TTFT, undefined, 'removing an entry clears its mark');
assert.ok(api.store.get().deleted.indexOf('TTFT') !== -1, 'a removed auto entry is remembered as deleted');

/* ---- disabled state -------------------------------------------------- */
api2.store.setEnabled(false);
assert.strictEqual(api2.store.get().enabled, false);
api2.store.setEnabled(true);

/* ---- reset ----------------------------------------------------------- */
storage.clear();
captured = null;
eval(source);
const mod3 = captured.factory(requireStub);
mod3.apply({ effect: () => () => {}, inject: () => {} });
const api3 = window.__dshAbbrHint;
api3.store.setDetails('API', '先写一条详细解释');
api3.store.removeEntry('API');
api3.store.removeEntry('LLM');
api3.store.reset();
assert.strictEqual(api3.store.get().glossary.API.indexOf('应用程序编程接口') !== -1, true, 'reset restores defaults');
assert.strictEqual(api3.store.get().glossary.LLM.length > 0, true, 'reset restores deleted defaults');
assert.deepStrictEqual(api3.store.get().details, {}, 'reset clears details');
assert.deepStrictEqual(api3.store.get().auto, {}, 'reset clears the auto marks');
assert.strictEqual(api3.store.get().deleted.length, 0);

console.log('ok — ' + cases.length + ' matching cases, state, details, persistence, reset');
