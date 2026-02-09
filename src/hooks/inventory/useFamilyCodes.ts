import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface FamilyCode {
  id: string;
  fc_code: string;
  fc_name: string;
  category: string | null;
  season: string | null;
  is_core_hero: boolean;
  is_active: boolean;
}

export function useFamilyCodes() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-family-codes', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery(
        'inv_family_codes',
        'id, fc_code, fc_name, category, season, is_core_hero, is_active'
      )
        .eq('is_active', true)
        .order('fc_name', { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data || []) as unknown as FamilyCode[];
    },
    enabled: isReady,
  });
}
