import { Article, IArticle } from './model';
import { extractArticle } from './article-extractor';
import { fetchArticlePage } from './article-fetcher';

export const extractAndSaveArticle = async (originalUrl: string, ownerId: string): Promise<IArticle> => {
  const { html, finalUrl } = await fetchArticlePage(originalUrl);
  const extracted = extractArticle(html, finalUrl);

  const existing = await Article.findOne({
    ownerId,
    canonicalUrl: extracted.canonicalUrl,
    status: 'extracted',
  });
  if (existing) return existing;

  try {
    return await Article.create({
      ownerId,
      originalUrl,
      ...extracted,
      status: 'extracted',
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      const duplicate = await Article.findOne({ ownerId, canonicalUrl: extracted.canonicalUrl, status: 'extracted' });
      if (duplicate) return duplicate;
    }
    throw error;
  }
};
