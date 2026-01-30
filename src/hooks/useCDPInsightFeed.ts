import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
// Types matching v_cdp_insight_feed view
export type InsightTopic = 'demand' | 'value' | 'timing' | 'risk' | 'equity';
export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low';
export type InsightStatus = 'active' | 'cooldown';

export interface InsightFeedItem {
  event_id: string;
  code: string;
  title: string;
  topic: InsightTopic;
  population_name: string;
  population_size: number;
  revenue_contribution: number;
  severity: InsightSeverity;
  confidence: 'high' | 'medium' | 'low';
  change_percent: number;
  change_direction: 'up' | 'down' | 'stable';
  status: InsightStatus;
  detected_at: string;
  as_of_date: string;
  cooldown_until: string | null;
}

export interface TopicCount {
  topic: InsightTopic;
  total_count: number;
  active_count: number;
}

// Hook for insight feed list
export function useCDPInsightFeed() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-insight-feed', tenantId],
    queryFn: async (): Promise<InsightFeedItem[]> => {
      if (!tenantId) return [];

      let query = client.from('v_cdp_insight_feed').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.order('detected_at', { ascending: false });

      if (error) {
        console.error('Error fetching insight feed:', error);
        return [];
      }

      return (data || []).map(row => ({
        event_id: row.event_id,
        code: row.code,
        title: row.title,
        topic: row.topic as InsightTopic,
        population_name: row.population_name,
        population_size: row.population_size || 0,
        revenue_contribution: row.revenue_contribution || 0,
        severity: row.severity as InsightSeverity,
        confidence: (row.confidence || 'medium') as 'high' | 'medium' | 'low',
        change_percent: row.change_percent || 0,
        change_direction: row.change_direction as 'up' | 'down' | 'stable',
        status: row.status as InsightStatus,
        detected_at: row.detected_at,
        as_of_date: row.as_of_date,
        cooldown_until: row.cooldown_until,
      }));
    },
    enabled: isReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for topic counts (sidebar summary)
export function useCDPInsightTopicCounts() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-insight-topic-counts', tenantId],
    queryFn: async (): Promise<Record<InsightTopic, TopicCount>> => {
      const defaultCounts: Record<InsightTopic, TopicCount> = {
        demand: { topic: 'demand', total_count: 0, active_count: 0 },
        value: { topic: 'value', total_count: 0, active_count: 0 },
        timing: { topic: 'timing', total_count: 0, active_count: 0 },
        risk: { topic: 'risk', total_count: 0, active_count: 0 },
        equity: { topic: 'equity', total_count: 0, active_count: 0 },
      };

      if (!tenantId) return defaultCounts;

      let query = client.from('v_cdp_insight_topic_counts').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching topic counts:', error);
        return defaultCounts;
      }

      const counts = { ...defaultCounts };
      (data || []).forEach(row => {
        const topic = row.topic as InsightTopic;
        if (counts[topic]) {
          counts[topic] = {
            topic,
            total_count: row.total_count || 0,
            active_count: row.active_count || 0,
          };
        }
      });

      return counts;
    },
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
  });
}

// Combined hook for InsightsPage
export function useCDPInsights() {
  const feedQuery = useCDPInsightFeed();
  const topicCountsQuery = useCDPInsightTopicCounts();

  return {
    insights: feedQuery.data || [],
    topicCounts: topicCountsQuery.data || {
      demand: { topic: 'demand' as const, total_count: 0, active_count: 0 },
      value: { topic: 'value' as const, total_count: 0, active_count: 0 },
      timing: { topic: 'timing' as const, total_count: 0, active_count: 0 },
      risk: { topic: 'risk' as const, total_count: 0, active_count: 0 },
      equity: { topic: 'equity' as const, total_count: 0, active_count: 0 },
    },
    isLoading: feedQuery.isLoading || topicCountsQuery.isLoading,
    error: feedQuery.error || topicCountsQuery.error,
  };
}
