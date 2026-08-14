import { ArticleError, articleErrorMessages } from './errors';
import { validatePublicUrl } from './url-validator';

export interface FetchedArticlePage {
  html: string;
  finalUrl: string;
}

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = 'LangsiftArticleReader/1.0 (+public HTML article extraction)';

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

export const fetchArticlePage = async (inputUrl: string): Promise<FetchedArticlePage> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let currentUrl = await validatePublicUrl(inputUrl);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      let response: Response;
      try {
        response = await fetch(currentUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml;q=0.9',
          },
          redirect: 'manual',
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
        currentUrl = await validatePublicUrl(new URL(location, currentUrl).toString());
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

      return { html: await readLimitedText(response), finalUrl: currentUrl.toString() };
    }

    throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};
