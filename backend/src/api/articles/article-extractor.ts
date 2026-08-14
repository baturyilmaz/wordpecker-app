import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import { ArticleError, articleErrorMessages } from './errors';

export interface ExtractedArticleData {
  canonicalUrl: string;
  title: string;
  source: string;
  author?: string;
  publishedAt?: Date;
  language: 'en';
  content: string;
  excerpt?: string;
  wordCount: number;
}

const MIN_WORD_COUNT = 120;
const blockedPagePattern = /\b(subscribe|subscription required|sign in to continue|log in to continue|register to continue|members only|enable cookies to continue)\b/gi;

const readMeta = (document: JSDOM['window']['document'], selectors: string[]): string | undefined => {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.getAttribute('content')?.trim();
    if (value) return value;
  }
  return undefined;
};

const cleanText = (text: string): string => text
  .replace(/\u00a0/g, ' ')
  .split(/\n+/)
  .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .join('\n\n');

const countWords = (text: string): number => text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length || 0;

const isLikelyEnglish = (text: string): boolean => {
  const letters = text.match(/\p{L}/gu) || [];
  if (!letters.length) return false;
  const latinLetters = text.match(/[A-Za-z]/g) || [];
  const commonEnglishWords = text.toLowerCase().match(/\b(the|and|of|to|in|that|is|for|with|on|as|was|are|by|from)\b/g) || [];
  return latinLetters.length / letters.length >= 0.85 && commonEnglishWords.length >= 5;
};

const parsePublishedAt = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const extractArticle = (html: string, pageUrl: string): ExtractedArticleData => {
  const dom = new JSDOM(html, { url: pageUrl, virtualConsole: new VirtualConsole() });
  const { document } = dom.window;
  const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const canonicalUrl = canonicalHref ? new URL(canonicalHref, pageUrl).toString() : pageUrl;
  const siteName = readMeta(document, ['meta[property="og:site_name"]', 'meta[name="application-name"]']);
  const authorMeta = readMeta(document, ['meta[name="author"]', 'meta[property="article:author"]']);
  const publishedMeta = readMeta(document, [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pub_date"]',
    'meta[name="parsely-pub-date"]',
  ]);

  document.querySelectorAll('#comments, .comments-area, ol.comment-list, ul.comment-list, [itemprop="comment"]')
    .forEach((element) => element.remove());

  const parsed = new Readability(document, { charThreshold: 200 }).parse();
  const content = cleanText(parsed?.textContent || '');
  const wordCount = countWords(content);
  const pageSignals = cleanText(document.body?.textContent || '').slice(0, 3000);

  if (wordCount < MIN_WORD_COUNT) {
    const blockedMatches = pageSignals.match(blockedPagePattern)?.length || 0;
    const code = blockedMatches >= 1 ? 'ARTICLE_BLOCKED' : 'ARTICLE_TOO_SHORT';
    throw new ArticleError(code, articleErrorMessages[code]);
  }

  if (!isLikelyEnglish(content)) {
    throw new ArticleError('NOT_ENGLISH', articleErrorMessages.NOT_ENGLISH);
  }

  const title = cleanText(parsed?.title || document.title || '');
  if (!title) {
    throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
  }

  const source = siteName || new URL(pageUrl).hostname.replace(/^www\./, '');
  const excerpt = cleanText(parsed?.excerpt || content.slice(0, 320)).slice(0, 360);

  return {
    canonicalUrl,
    title,
    source,
    author: cleanText(parsed?.byline || authorMeta || '') || undefined,
    publishedAt: parsePublishedAt(publishedMeta),
    language: 'en',
    content,
    excerpt: excerpt || undefined,
    wordCount,
  };
};
