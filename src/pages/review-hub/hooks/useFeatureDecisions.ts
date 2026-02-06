/**
 * useFeatureDecisions - Feature decision management for Review Hub
 * 
 * NOTE: This hook uses localStorage for feature decisions, not database.
 * The supabase import is currently unused but kept for future migration.
 * 
 * @architecture Local Storage - No tenant context needed
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  FeatureDecision, 
  SystemType, 
  SYSTEM_ROUTES,
  DataEntities,
  RequiredTables,
  Dependencies
} from '../types';
import { toast } from 'sonner';

const LOCAL_STORAGE_KEY = 'review_hub_feature_decisions';

export function useFeatureDecisions(system?: SystemType) {
  const [decisions, setDecisions] = useState<FeatureDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(true);

  const loadFromLocalStorage = useCallback(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const allDecisions = JSON.parse(stored) as FeatureDecision[];
      if (system) {
        setDecisions(allDecisions.filter(d => d.system === system));
      } else {
        setDecisions(allDecisions);
      }
    } else {
      setDecisions([]);
    }
    setLoading(false);
  }, [system]);

  const saveToLocalStorage = (allDecisions: FeatureDecision[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allDecisions));
  };

  // Initialize default decisions for a system
  const initializeSystemDecisions = async (targetSystem: SystemType) => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allDecisions = stored ? JSON.parse(stored) as FeatureDecision[] : [];
    const existingRoutes = allDecisions.filter(d => d.system === targetSystem).map(d => d.route);
    
    const routes = SYSTEM_ROUTES[targetSystem];
    const newDecisions: FeatureDecision[] = [];

    for (const route of routes) {
      if (!existingRoutes.includes(route.route)) {
        newDecisions.push({
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tenant_id: 'local',
          system: targetSystem,
          route: route.route,
          feature_name: route.feature_name,
          status: 'PENDING',
          target_version: null,
          priority: null,
          persona: null,
          is_live: route.is_live,
          data_entities: { entities: [], grain: null },
          required_tables: { serve_tables: [], dims: [] },
          dependencies: { pipelines: [], upstream: [] },
          rationale: null,
          owner: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (newDecisions.length > 0) {
      const updated = [...allDecisions, ...newDecisions];
      saveToLocalStorage(updated);
      if (system) {
        setDecisions(updated.filter(d => d.system === system));
      } else {
        setDecisions(updated);
      }
    }
  };

  // Update a decision
  const updateDecision = async (id: string, updates: Partial<FeatureDecision>) => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const allDecisions = stored ? JSON.parse(stored) as FeatureDecision[] : [];
    
    const updatedAll = allDecisions.map((d) => 
      d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
    );
    saveToLocalStorage(updatedAll);

    setDecisions(prev => 
      prev.map(d => d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d)
    );
    return true;
  };

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return {
    decisions,
    loading,
    useLocalStorage,
    initializeSystemDecisions,
    updateDecision,
    refresh: loadFromLocalStorage,
  };
}
