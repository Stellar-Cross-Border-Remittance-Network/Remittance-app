import AsyncStorage from '@react-native-async-storage/async-storage';

import { CacheKeys, cacheGet, cacheRemove, cacheSet } from '../src/lib/cache';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      removeItem: jest.fn(async (k: string) => {
        store.delete(k);
      }),
      clear: jest.fn(async () => {
        store.clear();
      }),
    },
  };
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('non-sensitive cache', () => {
  it('round-trips JSON values', async () => {
    await cacheSet(CacheKeys.anchors, [{ code: 'USDC' }]);
    expect(await cacheGet<Array<{ code: string }>>(CacheKeys.anchors)).toEqual([{ code: 'USDC' }]);
  });

  it('returns null for a missing key', async () => {
    expect(await cacheGet('cache.nope')).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', async () => {
    await AsyncStorage.setItem('cache.broken', '{not json');
    expect(await cacheGet('cache.broken')).toBeNull();
  });

  it('removes a key', async () => {
    await cacheSet('cache.tmp', 1);
    await cacheRemove('cache.tmp');
    expect(await cacheGet('cache.tmp')).toBeNull();
  });

  it('builds per-account balance keys', () => {
    expect(CacheKeys.lastBalances('GABC')).toBe('cache.balances.GABC');
  });
});