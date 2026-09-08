import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Non-sensitive cache (fetched anchor catalogs, corridor lists, last-known
 * balances for offline display). Never store keys or tokens here — see
 * secureStore.ts for the boundary.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function cacheRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const CacheKeys = {
  anchors: 'cache.anchors',
  corridors: 'cache.corridors',
  lastBalances: (account: string) => `cache.balances.${account}`,
  lastActivity: 'cache.activity',
} as const;