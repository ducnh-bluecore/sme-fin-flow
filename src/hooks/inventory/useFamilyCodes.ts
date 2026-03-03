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
  collection_id: string | null;
}

export function useFamilyCodes() {
  const { buildSelectQuery, isReady, tenantId } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['inv-family-codes', tenantId],
    queryFn: async () => {
      const pageSize = 1000;
      let from = 0;
      const allRows: FamilyCode[] = [];

      while (true) {
        const { data, error } = await buildSelectQuery(
          'inv_family_codes',
          'id, fc_code, fc_name, category, season, is_core_hero, is_active, collection_id'
        )
          .eq('is_active', true)
          .order('fc_name', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const batch = ((data || []) as unknown as FamilyCode[]);
        allRows.push(...batch);

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      return allRows;
    },
    enabled: isReady,
  });
}
