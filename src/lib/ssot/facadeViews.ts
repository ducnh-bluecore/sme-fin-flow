/**
 * ============================================
 * SSOT FACADE VIEWS
 * ============================================
 * 
 * Single entry point per domain for dashboard metrics.
 * 
 * ARCHITECTURE RULE:
 * - Hooks SHOULD use facade views for dashboard metrics
 * - Hooks MAY use canonical views for detail pages
 * - Hooks MUST NOT join multiple views client-side
 * - Hooks MUST NOT compute aggregations (.reduce, .filter.reduce)
 * 
 * @see docs/SSOT_ENFORCEMENT_SPEC.md
 */

/**
 * Facade views - ONE entry point per domain
 * These aggregate canonical views into a single dashboard-ready structure
 */
export const FACADE_VIEWS = {
  FDP: 'v_fdp_truth_snapshot',
  MDP: 'v_mdp_truth_snapshot',
  CDP: 'v_cdp_truth_snapshot',
  CONTROL_TOWER: 'v_ct_truth_snapshot',
} as const;

export type FacadeViewDomain = keyof typeof FACADE_VIEWS;
export type FacadeViewName = typeof FACADE_VIEWS[FacadeViewDomain];

/**
 * Canonical views - Approved SSOT sources per domain
 * Detail pages MAY query these directly
 */
export const CANONICAL_VIEWS = {
  FDP: [
    'v_fdp_finance_summary',
    'v_fdp_daily_metrics',
    'v_fdp_sku_summary',
    'v_fdp_cash_position',
    'v_fdp_working_capital',
    'v_fdp_ar_aging',
    'v_fdp_ap_aging',
    'ar_aging',
    'ap_aging',
  ],
  MDP: [
    'v_mdp_channel_performance',
    'v_mdp_campaign_summary',
    'v_mdp_attribution',
    'v_mdp_budget_utilization',
    'v_mdp_channel_pl',
  ],
  CDP: [
    'v_cdp_customer_research',
    'v_cdp_ltv_rules',
    'v_cdp_equity',
    'v_cdp_data_quality',
    'v_cdp_population_summary',
    'v_cdp_ltv_decay_alerts',
  ],
  CONTROL_TOWER: [
    'v_control_tower_summary',
    'v_decision_pending_followup',
    'v_decision_effectiveness',
    'v_active_alerts_hierarchy',
    'v_alerts_pending_escalation',
    'v_alerts_with_resolution',
  ],
} as const;

export type CanonicalViewDomain = keyof typeof CANONICAL_VIEWS;

/**
 * All canonical views as a flat array
 */
export const ALL_CANONICAL_VIEWS = Object.values(CANONICAL_VIEWS).flat();

/**
 * Validate if a view is SSOT-compliant (canonical)
 * 
 * @param viewName - The view name to check
 * @returns true if the view is in the canonical list
 */
export function isCanonicalView(viewName: string): boolean {
  return ALL_CANONICAL_VIEWS.includes(viewName as any);
}

/**
 * Check if a view is a facade view
 * 
 * @param viewName - The view name to check
 * @returns true if the view is a facade view
 */
export function isFacadeView(viewName: string): boolean {
  return Object.values(FACADE_VIEWS).includes(viewName as any);
}

/**
 * Get domain for a view
 * 
 * @param viewName - The view name to look up
 * @returns The domain name or null if not found
 */
export function getViewDomain(viewName: string): CanonicalViewDomain | null {
  // Check facade views first
  for (const [domain, facade] of Object.entries(FACADE_VIEWS)) {
    if (facade === viewName) {
      return domain as CanonicalViewDomain;
    }
  }
  
  // Check canonical views
  for (const [domain, views] of Object.entries(CANONICAL_VIEWS)) {
    if ((views as readonly string[]).includes(viewName)) {
      return domain as CanonicalViewDomain;
    }
  }
  
  return null;
}

/**
 * Get the facade view for a domain
 * 
 * @param domain - The domain to get facade for
 * @returns The facade view name
 */
export function getFacadeView(domain: FacadeViewDomain): string {
  return FACADE_VIEWS[domain];
}

/**
 * Get all canonical views for a domain
 * 
 * @param domain - The domain to get views for
 * @returns Array of canonical view names
 */
export function getCanonicalViews(domain: CanonicalViewDomain): readonly string[] {
  return CANONICAL_VIEWS[domain];
}

/**
 * Development mode warning for non-canonical view usage
 * 
 * @param viewName - The view being accessed
 * @param hookName - The hook making the access (for debugging)
 */
export function warnIfNonCanonical(viewName: string, hookName?: string): void {
  if (process.env.NODE_ENV === 'development') {
    if (!isCanonicalView(viewName) && !isFacadeView(viewName)) {
      console.warn(
        `[SSOT WARNING] Non-canonical view "${viewName}" used`,
        hookName ? `in hook "${hookName}"` : '',
        '\n→ Consider using a canonical view from CANONICAL_VIEWS',
        '\n→ See docs/SSOT_ENFORCEMENT_SPEC.md'
      );
    }
  }
}

/**
 * View registry for runtime introspection
 */
export const VIEW_REGISTRY = {
  facades: FACADE_VIEWS,
  canonical: CANONICAL_VIEWS,
  
  /**
   * Get summary of all registered views
   */
  getSummary(): { facades: number; canonical: number; total: number } {
    const facadeCount = Object.keys(FACADE_VIEWS).length;
    const canonicalCount = ALL_CANONICAL_VIEWS.length;
    return {
      facades: facadeCount,
      canonical: canonicalCount,
      total: facadeCount + canonicalCount,
    };
  },
  
  /**
   * Validate a query's view usage
   */
  validateViewUsage(viewName: string): {
    valid: boolean;
    type: 'facade' | 'canonical' | 'unknown';
    domain: CanonicalViewDomain | null;
    warning?: string;
  } {
    if (isFacadeView(viewName)) {
      return {
        valid: true,
        type: 'facade' as const,
        domain: getViewDomain(viewName),
      };
    }
    
    if (isCanonicalView(viewName)) {
      return {
        valid: true,
        type: 'canonical' as const,
        domain: getViewDomain(viewName),
      };
    }
    
    return {
      valid: false,
      type: 'unknown' as const,
      domain: null,
      warning: `View "${viewName}" is not registered as canonical. Add to CANONICAL_VIEWS if valid.`,
    };
  },
} as const;
