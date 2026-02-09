export interface StoreMetadata {
  region: string;
  tier: string;
  address: string;
}

export type StoreMap = Record<string, StoreMetadata>;

export function buildStoreMap(stores: any[]): StoreMap {
  const map: StoreMap = {};
  for (const s of stores) {
    if (s.id) {
      map[s.id] = {
        region: s.region || 'Không rõ',
        tier: s.tier || '',
        address: s.address || '',
      };
    }
  }
  return map;
}

export const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  S: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  A: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  B: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  C: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

export function getTierStyle(tier: string) {
  return TIER_STYLES[tier?.toUpperCase()] || TIER_STYLES.C;
}
