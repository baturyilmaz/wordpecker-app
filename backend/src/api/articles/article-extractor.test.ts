/* eslint-env jest */
import fs from 'node:fs';
import path from 'node:path';
import { extractArticle } from './article-extractor';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, '__fixtures__', name), 'utf8');

describe('extractArticle', () => {
  it('extracts a normal English article and metadata', () => {
    const result = extractArticle(fixture('article.html'), 'https://example.com/source');
    expect(result).toMatchObject({
      title: 'How Urban Trees Help Cities Breathe',
      source: 'Example Journal',
      author: 'Maya Green',
      canonicalUrl: 'https://example.com/urban-trees',
      language: 'en',
    });
    expect(result.wordCount).toBeGreaterThanOrEqual(120);
    expect(result.content).not.toContain('reader discussion');
  });

  it('keeps article text while removing navigation-heavy noise', () => {
    const result = extractArticle(fixture('navigation-heavy.html'), 'https://news.example.com/wetlands');
    expect(result.content).toContain('wetlands form a living boundary');
    expect(result.content).not.toContain('Cookie preferences');
    expect(result.content).not.toContain('Newsletter signup');
  });

  it('rejects content that is too short', () => {
    expect(() => extractArticle(fixture('too-short.html'), 'https://example.com/brief'))
      .toThrow(expect.objectContaining({ code: 'ARTICLE_TOO_SHORT' }));
  });

  it('classifies a login or paywall-like page as blocked', () => {
    expect(() => extractArticle(fixture('blocked.html'), 'https://example.com/subscribers'))
      .toThrow(expect.objectContaining({ code: 'ARTICLE_BLOCKED' }));
  });

  it('rejects a sufficiently long non-English article', () => {
    const paragraph = 'La ciudad conserva sus árboles porque ofrecen sombra y mejoran la vida de las familias durante el verano. ';
    const html = `<html><head><title>Una historia extensa</title></head><body><article><h1>Una historia extensa</h1><p>${paragraph.repeat(20)}</p></article></body></html>`;
    expect(() => extractArticle(html, 'https://example.com/historia'))
      .toThrow(expect.objectContaining({ code: 'NOT_ENGLISH' }));
  });
});
