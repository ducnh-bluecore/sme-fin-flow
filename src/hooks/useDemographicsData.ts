/**
 * Demographics Data Hook - SSOT
 * 
 * Fetches customer demographics from v_cdp_demographics_summary view.
 * Replaces hardcoded mock data in useAudienceData.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain CDP
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['demographics-data', tenantId],
    queryFn: async (): Promise<DemographicsData | null> => {
      if (!tenantId) return null;
      
      const { data, error } = await buildSelectQuery('v_cdp_demographics_summary', '*')
        .maybeSingle();
        
      if (error) throw error;
      
      if (!data) return null;
      
      const row = data as unknown as Record<string, unknown>;
      
      // Parse JSONB arrays from database
      const rawAge = (row.age_distribution as AgeDistribution[] | null) || [];
      const rawGender = (row.gender_distribution as GenderDistribution[] | null) || [];
      const rawDevice = (row.device_distribution as DeviceDistribution[] | null) || [];
      const rawGeo = (row.geographic_distribution as GeographicDistribution[] | null) || [];
      
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
