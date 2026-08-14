import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { ArticleError, articleErrorMessages } from './errors';

type LookupAddress = { address: string; family: number };
export type HostResolver = (hostname: string) => Promise<LookupAddress[]>;

const blockedHostnames = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

const resolveHost: HostResolver = async (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

const parseIpv4 = (address: string): number[] | null => {
  const parts = address.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : null;
};

export const isPrivateAddress = (rawAddress: string): boolean => {
  const address = rawAddress.toLowerCase().split('%')[0];
  const mappedIpv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = parseIpv4(mappedIpv4 || address);

  if (ipv4) {
    const [a, b] = ipv4;
    return a === 0
      || a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224;
  }

  if (isIP(address) === 6) {
    return address === '::'
      || address === '::1'
      || address.startsWith('fc')
      || address.startsWith('fd')
      || /^fe[89ab]/.test(address);
  }

  return true;
};

const hasBlockedHostname = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return blockedHostnames.has(normalized)
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.internal')
    || normalized.endsWith('.home')
    || normalized.endsWith('.lan');
};

export const validatePublicUrl = async (
  input: string,
  resolver: HostResolver = resolveHost,
): Promise<URL> => {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new ArticleError('INVALID_URL', articleErrorMessages.INVALID_URL);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ArticleError('INVALID_URL', articleErrorMessages.INVALID_URL);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname || hasBlockedHostname(hostname)) {
    throw new ArticleError('INVALID_URL', articleErrorMessages.INVALID_URL);
  }

  const literalFamily = isIP(hostname);
  if (literalFamily && isPrivateAddress(hostname)) {
    throw new ArticleError('INVALID_URL', articleErrorMessages.INVALID_URL);
  }

  if (!literalFamily) {
    let addresses: LookupAddress[];
    try {
      addresses = await resolver(hostname);
    } catch {
      throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
    }

    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new ArticleError('INVALID_URL', articleErrorMessages.INVALID_URL);
    }
  }

  url.hash = '';
  return url;
};
