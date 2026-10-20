import { randomUUID } from 'crypto';
import { tool } from '@openai/agents';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const endpoint = 'https://search.parallel.ai/mcp';
const userAgent = 'WordPecker/1.0 (+https://github.com/baturyilmaz/wordpecker-app)';
const requestTimeoutMs = 15000;

/** One standalone sentence-generation run owns one identity and connection. */
export async function createExampleSearch(signal: AbortSignal) {
  const provider = process.env.WEB_SEARCH_PROVIDER ?? 'parallel';
  if (provider === 'none') return { tools: [], close: async () => {} };
  if (provider !== 'parallel') throw new Error('WEB_SEARCH_PROVIDER must be parallel or none');
  signal.throwIfAborted();

  const sessionId = randomUUID();
  const client = new Client({ name: 'wordpecker', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: { 'User-Agent': userAgent } },
    // The transport owns its own cancellation signal; combine it with the run's.
    fetch: (url, init) => fetch(url, {
      ...init,
      signal: AbortSignal.any([
        signal, AbortSignal.timeout(requestTimeoutMs),
        ...(init?.signal ? [init.signal] : [])
      ])
    })
  });
  const options = { signal, timeout: requestTimeoutMs };
  try {
    await client.connect(transport);
    const { tools } = await client.listTools({}, options);
    for (const name of ['web_search', 'web_fetch']) {
      if (!tools.some(t => t.name === name)) throw new Error(`Parallel MCP is missing ${name}`);
    }
  } catch (error) {
    await client.close();
    throw error;
  }

  async function call(name: string, args: Record<string, unknown>) {
    signal.throwIfAborted();
    const result = CallToolResultSchema.parse(await client.callTool({
      name, arguments: { ...args, session_id: sessionId }
    }, CallToolResultSchema, options));
    const text = result.content
      .filter((item): item is { type: 'text'; text: string } => item.type === 'text')
      .map(item => item.text).join('\n');
    if (result.isError) throw new Error(`Parallel ${name} failed: ${text}`);
    if (!text) throw new Error(`Parallel ${name} returned no text`);
    return text;
  }

  return {
    tools: [
      tool({
        name: 'web_search',
        description: 'Find real vocabulary usage in reliable dictionaries and other web sources.',
        parameters: z.object({
          objective: z.string().min(1),
          search_queries: z.array(z.string().min(1)).min(1)
        }),
        errorFunction: null,
        execute: args => call('web_search', args)
      }),
      tool({
        name: 'web_fetch',
        description: 'Read usage examples from source URLs found by web_search.',
        parameters: z.object({
          urls: z.array(z.string().url().refine(url => ['http:', 'https:'].includes(new URL(url).protocol),
            'Only HTTP or HTTPS URLs are supported')).min(1).max(20),
          objective: z.string().max(200)
        }),
        errorFunction: null,
        execute: args => call('web_fetch', args)
      })
    ],
    close: () => client.close()
  };
}
