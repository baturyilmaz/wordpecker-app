import { before as beforeAll, beforeEach, afterEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Model, ModelRequest, ModelResponse, Usage, setDefaultModelProvider, setTracingDisabled } from '@openai/agents';
import type { WordAgentService } from '../../api/words/agent-service';

// Script only the model. The real service, Agent runner, tools and MCP client run.
const sourceUrl = 'https://example.org/dictionary/serendipity';
const textResult = { content: [{ type: 'text', text: `Usage: a happy discovery. Source: ${sourceUrl}` }] };
let service: WordAgentService;
let requests: { url: string; init?: Parameters<typeof fetch>[1]; message: any }[];
let mode: 'ok' | 'http' | 'quota' | 'toolError' | 'empty' | 'hang' | 'missing' | 'modelHang';
let onCall: (() => void) | undefined;
let invalidUrl = false;
let live = false;
let modelCalls = 0;

const model: Model = {
  async getResponse(request: ModelRequest): Promise<ModelResponse> {
    modelCalls++;
    request.signal?.throwIfAborted();
    if (mode === 'modelHang') return new Promise((_, reject) => {
      request.signal?.addEventListener('abort', () => reject(request.signal?.reason), { once: true });
    });
    const input = Array.isArray(request.input) ? request.input : [];
    const results = input.filter(i => i.type === 'function_call_result');
    const tools = request.tools.map(t => t.name);
    if (tools.length && results.length < (live ? 1 : 3)) {
      const step = results.length;
      const name = step === 1 ? 'web_fetch' : 'web_search';
      assert.deepEqual(tools, ['web_search', 'web_fetch']);
      if (step > 0 && !live) assert.ok(JSON.stringify(results).includes(sourceUrl));
      return { usage: new Usage(), output: [{ type: 'function_call', callId: `call-${step}`, name,
        arguments: JSON.stringify(name === 'web_fetch'
          ? { urls: [invalidUrl ? 'file:///etc/passwd' : sourceUrl], objective: 'Read word usage' }
          : { objective: 'Find English dictionary usage for serendipity', search_queries: ['serendipity meaning usage example'] }) }] };
    }
    const note = results.length ? JSON.stringify(results[0]) : 'Generated from language knowledge';
    return { usage: new Usage(), output: [{ type: 'message', role: 'assistant', status: 'completed',
      content: [{ type: 'output_text', text: JSON.stringify({ examples: [
        { sentence: 'It was pure serendipity.', translation: null, context_note: note }
      ] }) }] }] };
  },
  getStreamedResponse() { throw new Error('This test uses non-streaming generation'); }
};

async function generate(signal?: AbortSignal) {
  return service.generateExamples('serendipity', 'a happy discovery', 'daily conversation', 'English', 'English', signal);
}

beforeAll(() => {
  // Isolate real provider credentials and avoid module-level OpenAI initialization errors.
  process.env.OPENAI_API_KEY = 'test-placeholder';
  delete process.env.PARALLEL_API_KEY;
  setTracingDisabled(true);
  setDefaultModelProvider({ getModel: () => model });
  const { WordAgentService } = require('../../api/words/agent-service');
  service = new WordAgentService();
});

beforeEach(() => {
  delete process.env.WEB_SEARCH_PROVIDER;
  requests = [];
  mode = 'ok'; onCall = undefined; invalidUrl = false; live = false; modelCalls = 0;
  mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const message = init?.body ? JSON.parse(String(init.body)) : {};
    requests.push({ url: String(url), init, message });
    if (init?.method === 'GET') return new Response(null, { status: 405 });
    if (!('id' in message)) return new Response(null, { status: 202 });
    let result: unknown;
    if (message.method === 'initialize') result = { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } };
    else if (message.method === 'tools/list') result = { tools: mode === 'missing' ? [] : ['web_search', 'web_fetch'].map(name => ({ name, inputSchema: { type: 'object' } })) };
    else if (message.method === 'tools/call') {
      onCall?.();
      if (mode === 'hang') return new Promise<Response>((_, reject) => {
        const abort = () => reject(init?.signal?.reason ?? new Error('Aborted'));
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener('abort', abort, { once: true });
      });
      if (mode === 'http') return new Response('Unavailable', { status: 503 });
      result = mode === 'quota' ? { isError: true, content: [{ type: 'text', text: 'Anonymous quota exceeded. Retry later.' }] }
        : mode === 'toolError' ? { isError: true, content: [{ type: 'text', text: 'Search failed' }] }
        : mode === 'empty' ? { content: [] } : textResult;
    } else throw new Error(`Unexpected MCP method ${message.method}`);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }), { headers: { 'Content-Type': 'application/json' } });
  });
});

afterEach(() => { mock.restoreAll(); });

function calls() { return requests.filter(r => r.message.method === 'tools/call'); }

test('fresh no-key config dispatches search, fetch and follow-up through the agent into examples', async () => {
  const examples = await generate();
  assert.ok(examples[0].context_note.includes(sourceUrl));
  assert.equal(examples[0].sentence, 'It was pure serendipity.');
  assert.equal(modelCalls, 4);
  assert.deepEqual(calls().map(r => r.message.params.name), ['web_search', 'web_fetch', 'web_search']);
  const ids = calls().map(r => r.message.params.arguments.session_id);
  assert.equal(new Set(ids).size, 1);
  assert.match(ids[0], /^[0-9a-f-]{36}$/);
  assert.deepEqual(calls()[1].message.params.arguments.urls, [sourceUrl]);
  for (const r of requests) {
    assert.equal(r.url, 'https://search.parallel.ai/mcp');
    const headers = new Headers(r.init?.headers);
    assert.equal(headers.get('User-Agent'), 'WordPecker/1.0 (+https://github.com/baturyilmaz/wordpecker-app)');
    assert.equal(headers.has('Authorization'), false);
  }
});

test('explicit none makes no network requests and retains the sentence response', async () => {
  process.env.WEB_SEARCH_PROVIDER = 'none';
  assert.equal((await generate())[0].context_note, 'Generated from language knowledge');
  assert.equal(requests.length, 0);
});

test('explicit parallel is preserved and invalid selections never fall back', async () => {
  process.env.WEB_SEARCH_PROVIDER = 'parallel';
  await generate();
  assert.equal(calls().length, 3);
  process.env.WEB_SEARCH_PROVIDER = 'other-provider';
  const before = requests.length;
  await assert.rejects(generate(), /WEB_SEARCH_PROVIDER/);
  assert.equal(requests.length, before);
});

test('concurrent independent generations and a new generation keep isolated identities', async () => {
  await Promise.all([generate(), generate()]);
  const ids = calls().map(r => r.message.params.arguments.session_id);
  assert.equal(new Set(ids).size, 2);
  for (const id of new Set(ids)) assert.equal(ids.filter(v => v === id).length, 3);
  await generate();
  assert.equal(new Set(calls().map(r => r.message.params.arguments.session_id)).size, 3);
});

for (const failure of ['http', 'quota', 'toolError', 'empty', 'missing'] as const) {
  test(`${failure} fails the run without a model-only fallback`, async () => {
  mode = failure;
  await assert.rejects(generate());
  assert.equal(modelCalls, failure === 'missing' ? 0 : 1);
  assert.equal(calls().length, failure === 'missing' ? 0 : 1);
  });
}

test('a retry after quota creates a new standalone generation without automatic retries', async () => {
  mode = 'quota';
  await assert.rejects(generate(), /quota/);
  const original = calls()[0].message.params.arguments.session_id;
  mode = 'ok';
  await generate();
  const retried = calls().slice(1).map(r => r.message.params.arguments.session_id);
  assert.equal(new Set(retried).size, 1);
  assert.notEqual(retried[0], original);
});

test('unsafe fetch URL schemes fail before a fetch tool request', async () => {
  invalidUrl = true;
  await assert.rejects(generate());
  assert.equal(calls().length, 1);
});

test('caller cancellation aborts an in-flight MCP request', async () => {
  mode = 'hang';
  const controller = new AbortController();
  onCall = () => setTimeout(() => controller.abort(new Error('Browser disconnected')), 5);
  await assert.rejects(generate(controller.signal));
  assert.equal(calls()[0].init?.signal?.aborted, true);
  assert.equal(modelCalls, 1);
});

test('already cancelled runs do not connect', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(generate(controller.signal));
  assert.equal(requests.length, 0);
});

test('transport deadlines abort a stalled request', async () => {
  mode = 'hang';
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  mock.method(AbortSignal, 'timeout', (ms: number) => timeout(Math.min(ms, 20)));
  await assert.rejects(generate());
  assert.equal(calls()[0].init?.signal?.aborted, true);
});

test('the overall deadline also cancels a stalled model', async () => {
  mode = 'modelHang';
  const realSetTimeout = globalThis.setTimeout;
  mock.method(globalThis, 'setTimeout', (fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) =>
    realSetTimeout(fn, ms === 60000 ? 20 : ms, ...args));
  await assert.rejects(generate(), /Sentence generation timed out/);
  assert.equal(modelCalls, 1);
});

const liveTest = process.env.RUN_PARALLEL_LIVE === '1' ? test : test.skip;
liveTest('live anonymous MCP search through the production examples service with a scripted model', async () => {
  mock.restoreAll(); live = true;
  const realFetch = globalThis.fetch;
  mock.method(globalThis, 'fetch', (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    requests.push({ url: String(url), init, message: init?.body ? JSON.parse(String(init.body)) : {} });
    return realFetch(url, init);
  });
  const result = await generate();
  assert.ok(result[0].context_note.length > 100);
  assert.equal(calls().length, 1);
  for (const request of requests) {
    assert.equal(request.url, 'https://search.parallel.ai/mcp');
    assert.equal(new Headers(request.init?.headers).get('User-Agent'),
      'WordPecker/1.0 (+https://github.com/baturyilmaz/wordpecker-app)');
    assert.equal(new Headers(request.init?.headers).has('Authorization'), false);
  }
  process.stdout.write(`Live MCP source content consumed: ${result[0].context_note.slice(0, 800)}\n`);
});
