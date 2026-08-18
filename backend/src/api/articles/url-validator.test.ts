/* eslint-env jest */
import { HostResolver, validatePublicUrl } from './url-validator';

const publicResolver: HostResolver = async () => [{ address: '93.184.216.34', family: 4 }];

const expectInvalidUrl = async (url: string, resolver: HostResolver = publicResolver) => {
  await expect(validatePublicUrl(url, resolver)).rejects.toMatchObject({ code: 'INVALID_URL' });
};

describe('validatePublicUrl', () => {
  it.each(['https://example.com/story', 'http://example.com/story'])('accepts public %s', async (url) => {
    await expect(validatePublicUrl(url, publicResolver)).resolves.toBeInstanceOf(URL);
  });

  it.each([
    'http://localhost/story',
    'http://127.0.0.1/story',
    'http://10.0.0.1/story',
    'http://172.16.10.2/story',
    'http://172.31.255.254/story',
    'http://192.168.1.1/story',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/story',
    'http://[fc00::1]/story',
    'http://[fe80::1]/story',
    'http://[::ffff:127.0.0.1]/story',
    'http://[::ffff:7f00:1]/story',
    'http://[ff02::1]/story',
  ])('blocks private or metadata address %s', async (url) => expectInvalidUrl(url));

  it('blocks a hostname that resolves to a private address', async () => {
    await expectInvalidUrl('https://example.com/story', async () => [{ address: '10.0.0.8', family: 4 }]);
  });

  it.each(['file:///etc/passwd', 'ftp://example.com/file', 'not a url'])('rejects invalid input %s', async (url) => {
    await expectInvalidUrl(url);
  });

  it('rejects an excessively long URL before DNS resolution', async () => {
    const resolver = jest.fn(publicResolver);
    await expectInvalidUrl(`https://example.com/${'x'.repeat(5000)}`, resolver);
    expect(resolver).not.toHaveBeenCalled();
  });
});
