/**
 * Demographics Data Hook - SSOT
 * 
 * Fetches customer demographics from v_cdp_demographics_summary view.
 * Replaces hardcoded mock data in useAudienceData.
 * 
 * @architecture database-first
 * @domain CDP
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

export interface AgeDistribution {
  range: string;
  value: number;
  color: string;
}

export interface GenderDistribution {
  name: string;
  value: number;
  color: string;
}

export interface DeviceDistribution {
  device: string;
  sessions: number;
  conversions: number;
  revenue: number;
}

export interface GeographicDistribution {
  province: string;
  customers: number;
  percentage: number;
}

export interface DemographicsData {
  age_distribution: AgeDistribution[];
  gender_distribution: GenderDistribution[];
  device_distribution: DeviceDistribution[];
  geographic_distribution: GeographicDistribution[];
}

// Default colors for age ranges
const AGE_COLORS: Record<string, string> = {
  '18-24': '#8b5cf6',
  '25-34': '#a855f7',
  '35-44': '#c084fc',
  '45-54': '#d8b4fe',
  '55+': '#e9d5ff',
  'unknown': '#9ca3af',
};

// Default colors for genders
const GENDER_COLORS: Record<string, string> = {
  'Nữ': '#ec4899',
  'female': '#ec4899',
  'Nam': '#3b82f6',
  'male': '#3b82f6',
  'Khác': '#9ca3af',
  'other': '#9ca3af',
  'unknown': '#9ca3af',
};

export function useDemographicsData() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['demographics-data', tenantId],
    queryFn: async (): Promise<DemographicsData | null> => {
      if (!tenantId) return null;
      
      let query = client
        .from('v_cdp_demographics_summary')
        .select('*');
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query.maybeSingle();
        
      if (error) throw error;
      
      if (!data) return null;
      
      // Parse JSONB arrays from database - cast through unknown first
      const rawAge = (data.age_distribution as unknown as AgeDistribution[] | null) || [];
      const rawGender = (data.gender_distribution as unknown as GenderDistribution[] | null) || [];
      const rawDevice = (data.device_distribution as unknown as DeviceDistribution[] | null) || [];
      const rawGeo = (data.geographic_distribution as unknown as GeographicDistribution[] | null) || [];
      
      // Apply colors if missing
      const age_distribution = rawAge.map(item => ({
        ...item,
        color: item.color || AGE_COLORS[item.range] || '#9ca3af',
      }));
      
      const gender_distribution = rawGender.map(item => ({
        ...item,
        color: item.color || GENDER_COLORS[item.name] || '#9ca3af',
      }));
      
      return {
        age_distribution,
        gender_distribution,
        device_distribution: rawDevice,
        geographic_distribution: rawGeo,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000, // Cache for 1 minute
  });
}
