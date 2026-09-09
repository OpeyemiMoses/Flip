/**
 * FLIP Protocol — Wallet & Social Identity Uniqueness Registry
 *
 * Enforces the strict rule:
 * - If a Web3 wallet is bound to an active user account, it CANNOT be used or bound by another user.
 * - If a Google, Twitter, or Discord account is bound to an active user account, it CANNOT be bound by another user.
 */

export interface WalletBindingRecord {
  walletAddress: string; // Normalized lowercase (0x...)
  userId: string;        // Privy user ID (e.g. did:privy:...)
  userEmail?: string;
  boundAt: number;
  active: boolean;       // True if actively bound, false if released/unbound
}

export interface SocialBindingRecord {
  provider: 'google' | 'twitter' | 'discord' | 'email';
  identifier: string;    // Normalized identifier (email or username)
  userId: string;
  boundAt: number;
  active: boolean;
}

const REGISTRY_STORAGE_KEY = 'flip_wallet_binding_registry_v1';
const SOCIAL_REGISTRY_KEY = 'flip_social_binding_registry_v1';

export const WalletRegistry = {
  /**
   * Load current wallet binding registry from persistent local storage
   */
  getRegistry(): Record<string, WalletBindingRecord> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(REGISTRY_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('[WalletRegistry] Error reading registry:', e);
      return {};
    }
  },

  /**
   * Persist wallet binding registry
   */
  saveRegistry(registry: Record<string, WalletBindingRecord>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
    } catch (e) {
      console.warn('[WalletRegistry] Error writing registry:', e);
    }
  },

  /**
   * Load current social binding registry
   */
  getSocialRegistry(): Record<string, SocialBindingRecord> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(SOCIAL_REGISTRY_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('[WalletRegistry] Error reading social registry:', e);
      return {};
    }
  },

  /**
   * Persist social binding registry
   */
  saveSocialRegistry(registry: Record<string, SocialBindingRecord>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SOCIAL_REGISTRY_KEY, JSON.stringify(registry));
    } catch (e) {
      console.warn('[WalletRegistry] Error writing social registry:', e);
    }
  },

  /**
   * Check if a social account (Google / Twitter / Discord) is bound to a DIFFERENT active user
   */
  checkSocialConflict(
    provider: 'google' | 'twitter' | 'discord' | 'email',
    identifier: string,
    currentUserId: string
  ): {
    isConflict: boolean;
    boundToUserId?: string;
  } {
    if (!identifier || !currentUserId) return { isConflict: false };
    const key = `${provider}:${identifier.toLowerCase()}`;
    const registry = this.getSocialRegistry();
    const record = registry[key];

    if (record && record.active && record.userId !== currentUserId) {
      return {
        isConflict: true,
        boundToUserId: record.userId,
      };
    }
    return { isConflict: false };
  },

  /**
   * Bind a social identity to a user
   */
  bindSocial(
    provider: 'google' | 'twitter' | 'discord' | 'email',
    identifier: string,
    userId: string
  ): void {
    if (!identifier || !userId) return;
    const key = `${provider}:${identifier.toLowerCase()}`;
    const registry = this.getSocialRegistry();

    registry[key] = {
      provider,
      identifier: identifier.toLowerCase(),
      userId,
      boundAt: Date.now(),
      active: true,
    };

    this.saveSocialRegistry(registry);
    console.log(`[WalletRegistry] Social ${key} bound to user ${userId}`);
  },

  /**
   * Unbind a social identity
   */
  unbindSocial(
    provider: 'google' | 'twitter' | 'discord' | 'email',
    identifier: string,
    userId: string
  ): void {
    if (!identifier) return;
    const key = `${provider}:${identifier.toLowerCase()}`;
    const registry = this.getSocialRegistry();

    if (registry[key] && registry[key].userId === userId) {
      registry[key].active = false;
      this.saveSocialRegistry(registry);
      console.log(`[WalletRegistry] Social ${key} unlinked by user ${userId}`);
    }
  },

  /**
   * Synchronize all linked social accounts for a user
   */
  syncUserSocials(userId: string, linkedAccounts: any[] = []): void {
    if (!userId || !linkedAccounts || !linkedAccounts.length) return;
    const registry = this.getSocialRegistry();
    let mutated = false;

    for (const acc of linkedAccounts) {
      let provider: 'google' | 'twitter' | 'discord' | null = null;
      let id: string | null = null;

      if (acc.type === 'google_oauth') {
        provider = 'google';
        id = acc.email || acc.subject || acc.name;
      } else if (acc.type === 'twitter_oauth') {
        provider = 'twitter';
        id = acc.username || acc.subject;
      } else if (acc.type === 'discord_oauth') {
        provider = 'discord';
        id = acc.username || acc.email || acc.subject;
      }

      if (provider && id) {
        const key = `${provider}:${id.toLowerCase()}`;
        if (!registry[key] || registry[key].userId === userId) {
          registry[key] = {
            provider,
            identifier: id.toLowerCase(),
            userId,
            boundAt: registry[key]?.boundAt || Date.now(),
            active: true,
          };
          mutated = true;
        }
      }
    }

    if (mutated) {
      this.saveSocialRegistry(registry);
    }
  },

  /**
   * Check if a wallet is bound to a DIFFERENT active user
   */
  checkConflict(
    walletAddress: string,
    currentUserId: string,
    currentUserEmail?: string
  ): {
    isConflict: boolean;
    boundToEmail?: string;
    boundToUserId?: string;
  } {
    if (!walletAddress || !currentUserId) return { isConflict: false };
    const key = walletAddress.toLowerCase();
    const registry = this.getRegistry();
    const record = registry[key];

    if (record && record.active && record.userId !== currentUserId) {
      // If either record.userId or currentUserId is the wallet-derived ID (e.g. user_0x...),
      // then they are the same wallet owner connecting or logging in.
      const walletDerivedId = `user_${key}`;
      if (
        record.userId.toLowerCase() === walletDerivedId ||
        currentUserId.toLowerCase() === walletDerivedId
      ) {
        return { isConflict: false };
      }

      // If the email matches (case-insensitive), it is the same user
      if (
        currentUserEmail &&
        record.userEmail &&
        currentUserEmail.trim().toLowerCase() === record.userEmail.trim().toLowerCase()
      ) {
        return { isConflict: false };
      }

      return {
        isConflict: true,
        boundToEmail: record.userEmail,
        boundToUserId: record.userId,
      };
    }
    return { isConflict: false };
  },

  /**
   * Register or claim an external wallet for a user
   */
  bindWallet(walletAddress: string, userId: string, userEmail?: string): void {
    if (!walletAddress || !userId) return;
    const key = walletAddress.toLowerCase();
    const registry = this.getRegistry();

    registry[key] = {
      walletAddress: key,
      userId,
      userEmail: userEmail || registry[key]?.userEmail,
      boundAt: Date.now(),
      active: true,
    };

    this.saveRegistry(registry);
    console.log(`[WalletRegistry] Wallet ${key} bound to user ${userId} (${userEmail || 'no email'})`);
  },

  /**
   * Unbind a wallet, allowing it to be used by another account if explicitly released
   */
  unbindWallet(walletAddress: string, userId: string): void {
    if (!walletAddress) return;
    const key = walletAddress.toLowerCase();
    const registry = this.getRegistry();

    if (registry[key] && registry[key].userId === userId) {
      registry[key].active = false;
      this.saveRegistry(registry);
      console.log(`[WalletRegistry] Wallet ${key} released/unbound by user ${userId}`);
    }
  },

  /**
   * Synchronize all linked accounts of the authenticated user to ensure registry freshness
   */
  syncUserWallets(
    userId: string,
    userEmail: string | undefined,
    linkedAccounts: any[] = []
  ): void {
    if (!userId || !linkedAccounts || !linkedAccounts.length) return;
    const registry = this.getRegistry();
    let mutated = false;

    for (const acc of linkedAccounts) {
      if (acc.type === 'wallet' && acc.walletClientType !== 'privy' && acc.address) {
        const key = acc.address.toLowerCase();
        if (!registry[key] || registry[key].userId === userId) {
          registry[key] = {
            walletAddress: key,
            userId,
            userEmail: userEmail || registry[key]?.userEmail,
            boundAt: registry[key]?.boundAt || Date.now(),
            active: true,
          };
          mutated = true;
        }
      }
    }
    if (mutated) {
      this.saveRegistry(registry);
    }
  },

  /**
   * Get previously bound active wallet for a given userId or email
   */
  getUserBoundWallet(userId?: string, userEmail?: string): string | null {
    if (!userId && !userEmail) return null;
    const registry = this.getRegistry();
    for (const key in registry) {
      const record = registry[key];
      if (!record.active) continue;
      if (userId && record.userId === userId) {
        return record.walletAddress;
      }
      if (userEmail && record.userEmail?.toLowerCase() === userEmail.toLowerCase()) {
        return record.walletAddress;
      }
    }
    return null;
  },
};
