/* eslint-env jest */
import http from 'node:http';
import { ArticleError } from './errors';
import {
  ArticlePageFetcher,
  FETCH_TIMEOUT_MS,
  fetchArticlePage,
  fetchPinnedPage,
  MAX_REDIRECTS,
  MAX_RESPONSE_BYTES,
} from './article-fetcher';

const publicUrl = new URL('https://example.com/article');
const resolve = jest.fn(async (input: string) => ({
  url: new URL(input),
  addresses: [{ address: '93.184.216.34', family: 4 }],
}));
const asFetcher = (implementation: jest.Mock) => implementation as unknown as ArticlePageFetcher;

describe('fetchArticlePage security limits', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    resolve.mockClear();
  });

  it('accepts only a bounded HTML response', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response('<html><body>Article</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }));
    await expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(fetcher), resolveUrl: resolve }))
      .resolves.toEqual({ html: '<html><body>Article</body></html>', finalUrl: publicUrl.toString() });
    expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({
      url: publicUrl,
      addresses: [{ address: '93.184.216.34', family: 4 }],
    }), expect.any(Object));
  });

  it('rejects an oversized declared or streamed response', async () => {
    const declared = jest.fn().mockResolvedValue(new Response('small', {
      status: 200,
      headers: { 'content-type': 'text/html', 'content-length': String(MAX_RESPONSE_BYTES + 1) },
    }));
    await expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(declared), resolveUrl: resolve }))
      .rejects.toMatchObject({ code: 'ARTICLE_UNAVAILABLE' });

    const streamed = jest.fn().mockResolvedValue(new Response('x'.repeat(MAX_RESPONSE_BYTES + 1), {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));
    await expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(streamed), resolveUrl: resolve }))
      .rejects.toMatchObject({ code: 'ARTICLE_UNAVAILABLE' });
  });

  it('rejects non-HTML content before reading the body', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response('{"token":"not-an-article"}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    await expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(fetcher), resolveUrl: resolve }))
      .rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT' });
  });

  it('revalidates every redirect target and blocks a private redirect', async () => {
    const validateEachHop = jest.fn()
      .mockResolvedValueOnce({ url: publicUrl, addresses: [{ address: '93.184.216.34', family: 4 }] })
      .mockRejectedValueOnce(new ArticleError('INVALID_URL', 'blocked'));
    const fetcher = jest.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1/metadata' },
    }));
    await expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(fetcher), resolveUrl: validateEachHop }))
      .rejects.toMatchObject({ code: 'INVALID_URL' });
    expect(validateEachHop).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('enforces the redirect limit', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: '/next' },
    }));
    await expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(fetcher), resolveUrl: resolve }))
      .rejects.toMatchObject({ code: 'ARTICLE_UNAVAILABLE' });
    expect(fetcher).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });

  it('maps unreachable hosts and timeouts to stable article errors', async () => {
    const unreachable = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED private detail'));
    await expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(unreachable), resolveUrl: resolve }))
      .rejects.toMatchObject({ code: 'ARTICLE_UNAVAILABLE' });

    jest.useFakeTimers();
    const hanging = jest.fn((_target, init) => new Promise<Response>((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const pending = expect(fetchArticlePage(publicUrl.toString(), { fetcher: asFetcher(hanging), resolveUrl: resolve }))
      .rejects.toMatchObject({ code: 'FETCH_TIMEOUT' });
    await jest.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS);
    await pending;
  });

  it('connects through the already validated address instead of resolving the hostname again', async () => {
    const server = http.createServer((request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(`<html><body>${request.headers.host}</body></html>`);
    });
    await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server address unavailable');
    const controller = new AbortController();
    try {
      const response = await fetchPinnedPage({
        url: new URL(`http://public.example:${address.port}/article`),
        addresses: [{ address: '127.0.0.1', family: 4 }],
      }, { headers: { Accept: 'text/html' }, signal: controller.signal });
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(`public.example:${address.port}`);
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
    }
  });
});
