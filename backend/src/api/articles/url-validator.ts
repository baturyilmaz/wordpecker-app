import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { ArticleError, articleErrorMessages } from './errors';

export type LookupAddress = { address: string; family: number };
export type HostResolver = (hostname: string) => Promise<LookupAddress[]>;

export interface ResolvedPublicUrl {
  url: URL;
  addresses: LookupAddress[];
}

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

const parseMappedIpv4 = (address: string): number[] | null => {
  const dotted = address.match(/^(?:::ffff:|0:0:0:0:0:ffff:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (dotted) return parseIpv4(dotted);
  const hexadecimal = address.match(/^(?:::ffff:|0:0:0:0:0:ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hexadecimal) return null;
  const high = Number.parseInt(hexadecimal[1], 16);
  const low = Number.parseInt(hexadecimal[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255];
};

export const isPrivateAddress = (rawAddress: string): boolean => {
  const address = rawAddress.toLowerCase().split('%')[0];
  const ipv4 = parseIpv4(address) || parseMappedIpv4(address);

  if (ipv4) {
    const [a, b, c] = ipv4;
    return a === 0
      || a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 192 && b === 0 && (c === 0 || c === 2))
      || (a === 198 && b === 51 && c === 100)
      || (a === 203 && b === 0 && c === 113)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224;
  }

  if (isIP(address) === 6) {
    return address === '::'
      || address === '::1'
      || address.startsWith('fc')
      || address.startsWith('fd')
      || /^fe[89a-f]/.test(address)
      || address.startsWith('ff')
      || address.startsWith('2001:db8:');
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

export const resolvePublicUrl = async (
  input: string,
  resolver: HostResolver = resolveHost,
): Promise<ResolvedPublicUrl> => {
  let url: URL;

  try {
    if (input.length > 4096) throw new Error('URL_TOO_LONG');
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

  let addresses: LookupAddress[];
  if (!literalFamily) {
    try {
      addresses = await resolver(hostname);
    } catch {
      throw new ArticleError('ARTICLE_UNAVAILABLE', articleErrorMessages.ARTICLE_UNAVAILABLE);
    }

    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new ArticleError('INVALID_URL', articleErrorMessages.INVALID_URL);
    }
  } else {
    addresses = [{ address: hostname, family: literalFamily }];
  }

  url.hash = '';
  return { url, addresses };
};

export const validatePublicUrl = async (
  input: string,
  resolver: HostResolver = resolveHost,
): Promise<URL> => (await resolvePublicUrl(input, resolver)).url;
