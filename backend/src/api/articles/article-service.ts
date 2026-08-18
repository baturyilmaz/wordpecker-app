import { Article, IArticle } from './model';
import { extractArticle } from './article-extractor';
import { fetchArticlePage } from './article-fetcher';

const sensitiveQueryKey = /(token|secret|signature|credential|authorization|auth|api[-_]?key|x-amz|sig|expires)/i;

export const sanitizeStoredUrl = (value: string): string => {
  const url = new URL(value);
  [...url.searchParams.keys()].forEach((key) => {
    if (sensitiveQueryKey.test(key)) url.searchParams.delete(key);
  });
  url.hash = '';
  return url.toString();
};

export const extractAndSaveArticle = async (originalUrl: string, ownerId: string): Promise<IArticle> => {
  const { html, finalUrl } = await fetchArticlePage(originalUrl);
  const extracted = extractArticle(html, finalUrl);
  const storedOriginalUrl = sanitizeStoredUrl(originalUrl);
  const storedCanonicalUrl = sanitizeStoredUrl(extracted.canonicalUrl);

  const existing = await Article.findOne({
    ownerId,
    canonicalUrl: storedCanonicalUrl,
    status: 'extracted',
  });
  if (existing) return existing;

  try {
    return await Article.create({
      ownerId,
      originalUrl: storedOriginalUrl,
      ...extracted,
      canonicalUrl: storedCanonicalUrl,
      status: 'extracted',
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      const duplicate = await Article.findOne({ ownerId, canonicalUrl: storedCanonicalUrl, status: 'extracted' });
      if (duplicate) return duplicate;
    }
    throw error;
  }
};
