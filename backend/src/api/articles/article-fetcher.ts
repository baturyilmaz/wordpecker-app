import http from 'node:http';
import https from 'node:https';
import { LookupFunction } from 'node:net';
import { Readable } from 'node:stream';
import { ArticleError, articleErrorMessages } from './errors';
import { ResolvedPublicUrl, resolvePublicUrl } from './url-validator';

export interface FetchedArticlePage {
  html: string;
  finalUrl: string;
}

export const MAX_REDIRECTS = 5;
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
export const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = 'LangsiftArticleReader/1.0 (+public HTML article extraction)';

export type ArticlePageFetcher = (
  target: ResolvedPublicUrl,
  init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<Response>;

export interface ArticleFetchDependencies {
  fetcher?: ArticlePageFetcher;
  resolveUrl?: typeof resolvePublicUrl;
}

const responseHeaders = (message: http.IncomingMessage): Headers => {
  const headers = new Headers();
  Object.entries(message.headers).forEach(([name, value]) => {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  });
  return headers;
};

export const fetchPinnedPage: ArticlePageFetcher = async (target, init) => {
  const selectedAddress = target.addresses.find(({ family }) => family === 4) || target.addresses[0];
  if (!selectedAddress) throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
  const lookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address: selectedAddress.address, family: selectedAddress.family }]);
      return;
    }
    callback(null, selectedAddress.address, selectedAddress.family);
  };
  const transport = target.url.protocol === 'https:' ? https : http;

  return new Promise<Response>((resolve, reject) => {
    const request = transport.request(target.url, {
      method: 'GET',
      headers: init.headers,
      lookup,
      signal: init.signal,
    }, (message) => {
      const status = message.statusCode || 502;
      const bodyless = status === 204 || status === 205 || status === 304;
      const body = bodyless
        ? null
        : Readable.toWeb(message) as unknown as ConstructorParameters<typeof Response>[0];
      resolve(new Response(body, { status, headers: responseHeaders(message) }));
    });
    request.once('error', reject);
    request.end();
  });
};

const readLimitedText = async (response: Response): Promise<string> => {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  let reading = true;
  while (reading) {
    const { done, value } = await reader.read();
    if (done) {
      reading = false;
      continue;
    }
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

export const fetchArticlePage = async (
  inputUrl: string,
  dependencies: ArticleFetchDependencies = {},
): Promise<FetchedArticlePage> => {
  const fetcher = dependencies.fetcher || fetchPinnedPage;
  const resolveUrl = dependencies.resolveUrl || resolvePublicUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let currentTarget = await resolveUrl(inputUrl);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      let response: Response;
      try {
        response = await fetcher(currentTarget, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml;q=0.9',
          },
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof ArticleError) throw error;
        if (controller.signal.aborted) {
          throw new ArticleError('FETCH_TIMEOUT', articleErrorMessages.FETCH_TIMEOUT);
        }
        throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirectCount === MAX_REDIRECTS) {
          throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
        }
        currentTarget = await resolveUrl(new URL(location, currentTarget.url).toString());
        continue;
      }

      if ([401, 403, 407, 429, 451].includes(response.status)) {
        throw new ArticleError('ARTICLE_BLOCKED', articleErrorMessages.ARTICLE_BLOCKED);
      }
      if (!response.ok) {
        throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new ArticleError('UNSUPPORTED_CONTENT', articleErrorMessages.UNSUPPORTED_CONTENT);
      }

      return { html: await readLimitedText(response), finalUrl: currentTarget.url.toString() };
    }

    throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};
