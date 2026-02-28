/**
 * useActivityTracker - Global activity tracking hook
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @plane Control Plane (Platform Schema)
 * 
 * Note: Uses tenant-aware RPC for tracking events to platform schema.
 * The RPC handles tenant routing internally, so we use supabase directly.
 * This is intentional and should NOT be migrated to useTenantQueryBuilder.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

interface TrackedEvent {
  event_type: 'page_view' | 'feature_use' | 'decision' | 'export' | 'error' | 'login' | 'logout';
  event_name: string;
  module?: string | null;
  route?: string | null;
  metadata?: Record<string, unknown>;
  duration_ms?: number | null;
}

interface PendingEvent extends TrackedEvent {
  tenant_id: string;
  timestamp: number;
}

// Generate a unique session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('bluecore_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('bluecore_session_id', sessionId);
  }
  return sessionId;
};

// Determine module from route
const getModuleFromRoute = (route: string): string | null => {
  if (route.startsWith('/fdp')) return 'fdp';
  if (route.startsWith('/mdp')) return 'mdp';
  if (route.startsWith('/cdp')) return 'cdp';
  if (route.startsWith('/control-tower')) return 'control_tower';
  if (route.startsWith('/settings')) return 'settings';
  if (route.startsWith('/onboarding')) return 'onboarding';
  if (route.startsWith('/admin')) return 'admin';
  return 'other';
};

// Batch queue for events
let eventQueue: PendingEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_BATCH_SIZE = 50;

const flushEvents = async () => {
  if (eventQueue.length === 0) return;

  const eventsToSend = eventQueue.splice(0, MAX_BATCH_SIZE);
  const sessionId = getSessionId();

  try {
    // Group events by tenant
    const eventsByTenant: Record<string, PendingEvent[]> = {};
    for (const event of eventsToSend) {
      if (!eventsByTenant[event.tenant_id]) eventsByTenant[event.tenant_id] = [];
      eventsByTenant[event.tenant_id].push(event);
    }

    // Send events for each tenant
    for (const [tenantId, events] of Object.entries(eventsByTenant)) {
      for (const event of events) {
        await supabase.rpc('track_tenant_event', {
          p_tenant_id: tenantId,
          p_event_type: event.event_type,
          p_event_name: event.event_name,
          p_module: event.module || null,
          p_route: event.route || null,
          p_metadata: (event.metadata || {}) as Record<string, string | number | boolean | null>,
          p_session_id: sessionId,
          p_duration_ms: event.duration_ms || null,
        });
      }
    }
  } catch (error) {
    // Re-queue failed events
    eventQueue.unshift(...eventsToSend);
    console.error('[ActivityTracker] Failed to flush events:', error);
  }
};

const scheduleFlush = () => {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushEvents();
  }, FLUSH_INTERVAL);
};

const queueEvent = (event: PendingEvent) => {
  eventQueue.push(event);
  
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
};

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliability on page close
      const data = JSON.stringify({ events: eventQueue, session_id: getSessionId() });
      navigator.sendBeacon?.('/api/track-events', data);
    }
  });

  // Also flush on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}

/**
 * Global activity tracking hook
 * Automatically tracks page views and provides manual tracking methods
 */
export function useActivityTracker() {
  const location = useLocation();
  const { data: tenantId } = useActiveTenantId();
  const pageEnterTime = useRef<number>(Date.now());
  const lastRoute = useRef<string>('');

  // Track page view with duration
  const trackPageView = useCallback((route: string, duration?: number) => {
    if (!tenantId) return;

    queueEvent({
      tenant_id: tenantId,
      event_type: 'page_view',
      event_name: `view:${route}`,
      module: getModuleFromRoute(route),
      route,
      duration_ms: duration || null,
      timestamp: Date.now(),
    });
  }, [tenantId]);

  // Track feature usage
  const trackFeatureUse = useCallback((featureName: string, metadata?: Record<string, unknown>) => {
    if (!tenantId) return;

    const route = location.pathname;
    queueEvent({
      tenant_id: tenantId,
      event_type: 'feature_use',
      event_name: featureName,
      module: getModuleFromRoute(route),
      route,
      metadata,
      timestamp: Date.now(),
    });
  }, [tenantId, location.pathname]);

  // Track decision/action taken
  const trackDecision = useCallback((decisionName: string, metadata?: Record<string, unknown>) => {
    if (!tenantId) return;

    const route = location.pathname;
    queueEvent({
      tenant_id: tenantId,
      event_type: 'decision',
      event_name: decisionName,
      module: getModuleFromRoute(route),
      route,
      metadata,
      timestamp: Date.now(),
    });
  }, [tenantId, location.pathname]);

  // Track export
  const trackExport = useCallback((exportType: string, metadata?: Record<string, unknown>) => {
    if (!tenantId) return;

    const route = location.pathname;
    queueEvent({
      tenant_id: tenantId,
      event_type: 'export',
      event_name: `export:${exportType}`,
      module: getModuleFromRoute(route),
      route,
      metadata,
      timestamp: Date.now(),
    });
  }, [tenantId, location.pathname]);

  // Track error
  const trackError = useCallback((errorName: string, metadata?: Record<string, unknown>) => {
    if (!tenantId) return;

    const route = location.pathname;
    queueEvent({
      tenant_id: tenantId,
      event_type: 'error',
      event_name: errorName,
      module: getModuleFromRoute(route),
      route,
      metadata,
      timestamp: Date.now(),
    });
  }, [tenantId, location.pathname]);

  // Auto-track page views on route change
  useEffect(() => {
    const currentRoute = location.pathname;
    
    // Track duration for previous page
    if (lastRoute.current && lastRoute.current !== currentRoute) {
      const duration = Date.now() - pageEnterTime.current;
      trackPageView(lastRoute.current, duration);
    }

    // Reset timer for new page
    pageEnterTime.current = Date.now();
    lastRoute.current = currentRoute;

    // Track new page view without duration (duration will be calculated on leave)
    if (tenantId) {
      trackPageView(currentRoute);
    }
  }, [location.pathname, tenantId, trackPageView]);

  return {
    trackFeatureUse,
    trackDecision,
    trackExport,
    trackError,
  };
}

/**
 * Activity Tracker Context Provider
 * Use this to provide tracking methods throughout the app
 */
export type ActivityTracker = ReturnType<typeof useActivityTracker>;
