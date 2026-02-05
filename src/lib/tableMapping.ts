/**
 * Table Mapping - Legacy to Schema-per-Tenant Translation
 * 
 * Part of Architecture v1.4.1 - Data Flow Migration
 * 
 * Maps legacy table names (public schema) to new table names (tenant schema).
 * Used by useTenantQueryBuilder to auto-translate queries.
 * 
 * Pattern:
 * - If isSchemaProvisioned = true → Use new master_* tables (tenant schema)
 * - If isSchemaProvisioned = false → Use legacy cdp_* tables (public schema with RLS)
 */

// =====================================================
// Table Mappings
// =====================================================

/**
 * Map of legacy table names to new schema-per-tenant table names
 */
export const TABLE_MAP = {
  // ============ Master Model (Layer 2) ============
  // Orders
  cdp_orders: 'master_orders',
  cdp_order_items: 'master_order_items',
  orders: 'master_orders',
  order_items: 'master_order_items',
  
  // Customers
  cdp_customers: 'master_customers',
  customers: 'master_customers',
  
  // Products
  products: 'master_products',
  product_variants: 'master_product_variants',
  external_products: 'master_products',
  
  // Refunds & Payments
  cdp_refunds: 'master_refunds',
  refunds: 'master_refunds',
  payments: 'master_payments',
  invoices: 'master_payments',
  
  // Fulfillment & Inventory
  fulfillments: 'master_fulfillments',
  inventory: 'master_inventory',
  inventory_movements: 'master_inventory',
  
  // Costs & Suppliers
  product_costs: 'master_costs',
  suppliers: 'master_suppliers',
  vendor_bills: 'master_suppliers',
  
  // ============ Events & Marketing (Layer 2.5) ============
  commerce_events: 'commerce_events',
  ad_accounts: 'master_ad_accounts',
  campaigns: 'master_campaigns',
  ad_spend: 'master_ad_spend_daily',
  marketing_spend: 'master_ad_spend_daily',
  
  // ============ Foundation (Layer 1) ============
  organizations: 'organizations',
  organization_members: 'organization_members',
  channel_accounts: 'channel_accounts',
  
  // ============ KPI (Layer 3) ============
  kpi_definitions: 'kpi_definitions',
  kpi_thresholds: 'kpi_thresholds',
  kpi_facts: 'kpi_facts_daily',
  
  // ============ Alert & Decision (Layer 4) ============
  alert_rules: 'alert_rules',
  alert_instances: 'alert_instances',
  decision_cards: 'decision_cards',
  card_actions: 'card_actions',
  evidence_logs: 'evidence_logs',
  
  // ============ AI Query (Layer 5) ============
  ai_conversations: 'ai_conversations',
  ai_messages: 'ai_messages',
  ai_query_history: 'ai_query_history',
  ai_favorites: 'ai_favorites',
  ai_insights: 'ai_insights',
  
  // ============ Audit (Layer 6) ============
  sync_jobs: 'sync_jobs',
  sync_errors: 'sync_errors',
  audit_logs: 'audit_logs',
  
  // ============ BigQuery (Layer 10) ============
  bigquery_connections: 'bigquery_connections',
  bigquery_sync_configs: 'bigquery_sync_configs',
  query_cache: 'query_cache',
} as const;

/**
 * Tables that exist ONLY in platform schema (global, cross-tenant)
 * These should NOT be translated and should be accessed via platform schema
 */
export const PLATFORM_TABLES = [
  'ai_metric_definitions',
  'ai_dimension_catalog',
  'ai_semantic_models',
  'ai_query_templates',
  'ai_model_registry',
  'kpi_definition_templates',
  'alert_rule_templates',
  'decision_taxonomy',
  'insight_taxonomy',
  'global_source_platforms',
  'feature_flags',
  'enterprise_provisioning_requests',
] as const;

/**
 * Tables that should ALWAYS use public schema (tenant management)
 * These are NOT migrated to tenant schemas
 */
export const PUBLIC_ONLY_TABLES = [
  'profiles',
  'tenants',
  'tenant_users',
  'tenant_roles',
  'tenant_schema_migrations',
  'tenant_migration_log',
] as const;

// =====================================================
// Type Definitions
// =====================================================

export type LegacyTableName = keyof typeof TABLE_MAP;
export type NewTableName = typeof TABLE_MAP[LegacyTableName];
export type PlatformTableName = typeof PLATFORM_TABLES[number];
export type PublicTableName = typeof PUBLIC_ONLY_TABLES[number];

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get the actual table name based on provisioning status
 * 
 * @param legacyName - The legacy/current table name
 * @param isProvisioned - Whether tenant has dedicated schema
 * @returns The actual table name to use in query
 */
export function getTableName(
  legacyName: string,
  isProvisioned: boolean
): string {
  // Platform tables are always accessed via platform schema
  if (PLATFORM_TABLES.includes(legacyName as PlatformTableName)) {
    return legacyName;
  }
  
  // Public-only tables always use public schema
  if (PUBLIC_ONLY_TABLES.includes(legacyName as PublicTableName)) {
    return legacyName;
  }
  
  // If not provisioned, use legacy name (public schema with RLS)
  if (!isProvisioned) {
    return legacyName;
  }
  
  // If provisioned, translate to new table name
  return TABLE_MAP[legacyName as LegacyTableName] ?? legacyName;
}

/**
 * Check if a table exists in the mapping
 */
export function isKnownTable(tableName: string): boolean {
  return (
    tableName in TABLE_MAP ||
    PLATFORM_TABLES.includes(tableName as PlatformTableName) ||
    PUBLIC_ONLY_TABLES.includes(tableName as PublicTableName)
  );
}

/**
 * Check if table is a platform table (global, cross-tenant)
 */
export function isPlatformTable(tableName: string): boolean {
  return PLATFORM_TABLES.includes(tableName as PlatformTableName);
}

/**
 * Check if table is public-only (tenant management)
 */
export function isPublicOnlyTable(tableName: string): boolean {
  return PUBLIC_ONLY_TABLES.includes(tableName as PublicTableName);
}

/**
 * Get the reverse mapping (new → legacy)
 */
export function getLegacyTableName(newName: string): string | null {
  const entries = Object.entries(TABLE_MAP);
  const found = entries.find(([_, value]) => value === newName);
  return found ? found[0] : null;
}

// =====================================================
// Column Mappings (for when columns have different names)
// =====================================================

/**
 * Column name mappings for tables with renamed columns
 * Format: { tableName: { legacyColumn: newColumn } }
 */
export const COLUMN_MAP: Record<string, Record<string, string>> = {
  master_orders: {
    order_id: 'id',
    order_code: 'order_number',
    total_amount: 'gross_revenue',
    // Add more column mappings as needed
  },
  master_customers: {
    customer_id: 'id',
    customer_code: 'customer_code',
    // Add more column mappings as needed
  },
};

/**
 * Get the actual column name
 */
export function getColumnName(
  tableName: string,
  legacyColumn: string,
  isProvisioned: boolean
): string {
  if (!isProvisioned) {
    return legacyColumn;
  }
  
  const tableColumns = COLUMN_MAP[tableName];
  if (!tableColumns) {
    return legacyColumn;
  }
  
  return tableColumns[legacyColumn] ?? legacyColumn;
}
