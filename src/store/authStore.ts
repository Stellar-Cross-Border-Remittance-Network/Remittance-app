import { create } from 'zustand';

import { getSecure, setSecure, SecureKeys, deleteSecure } from '../lib/secureStore';

export type CustodyModel = 'non_custodial' | 'custodial';

export interface Session {
  token: string;
  account: string;
  custody: CustodyModel;
  userId?: string;
}

interface AuthState {
  session: Session | null;
  /** Restored lazily at startup; gates the loading screen. */
  hydrated: boolean;
  restore: () => Promise<void>;
  setSession: (session: Session) => Promise<void>;
  clearSession: () => Promise<void>;
  token: () => Promise<string | null>;
}

/**
 * Session store. The JWT lives in SecureStore; this keeps only the in-memory
 * copy needed by screens. `clearSession` wipes the token and the account
 * secret for the current custody model.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,

  async restore() {
    const [token, account, custody] = await Promise.all([
      getSecure(SecureKeys.sessionToken),
      getSecure(SecureKeys.activeAccount),
      getSecure(SecureKeys.custodyModel),
    ]);
    if (token && account && custody) {
      set({ session: { token, account, custody: custody as CustodyModel }, hydrated: true });
    } else {
      set({ session: null, hydrated: true });
    }
  },

  async setSession(session) {
    await Promise.all([
      setSecure(SecureKeys.sessionToken, session.token),
      setSecure(SecureKeys.activeAccount, session.account),
      setSecure(SecureKeys.custodyModel, session.custody),
    ]);
    set({ session });
  },

  async clearSession() {
    await Promise.all([
      deleteSecure(SecureKeys.sessionToken),
      deleteSecure(SecureKeys.activeAccount),
      deleteSecure(SecureKeys.custodyModel),
      deleteSecure(SecureKeys.custodialSecret),
      deleteSecure(SecureKeys.localSecret),
    ]);
    set({ session: null });
  },

  async token() {
    return getSecure(SecureKeys.sessionToken);
  },
}));