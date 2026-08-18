/* eslint-env jest */
import { sanitizeStoredUrl } from './article-service';

describe('article URL persistence privacy', () => {
  it('removes credential-like query parameters while preserving ordinary article routing parameters', () => {
    expect(sanitizeStoredUrl('https://example.com/read?id=42&utm_source=beta&token=secret&X-Amz-Signature=signed#section'))
      .toBe('https://example.com/read?id=42&utm_source=beta');
  });
});
