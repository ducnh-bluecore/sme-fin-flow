/**
 * Migrate Tenant Data Edge Function
 * 
 * Migrates data from public schema to tenant-specific schema.
 * Processes one table at a time to avoid timeouts.
 * 
 * POST /migrate-tenant-data
 * Body: { tenantId: string, tableName: string }
 * 
 * Response: { success: boolean, table: string, rows_migrated: number }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  requireAuth, 
  isErrorResponse,
  jsonResponse,
  errorResponse 
} from "../_shared/auth.ts";

interface MigrateRequest {
  tenantId: string;
  tableName: string;
}

interface MigrateResult {
  success: boolean;
  table: string;
  rows_migrated: number;
  migrated_at: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate user
    const authResult = await requireAuth(req);
    
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { userId, tenantId: userTenantId, role } = authResult;

    // Parse request body
    const body: MigrateRequest = await req.json();
    const { tenantId, tableName } = body;

    if (!tenantId || !tableName) {
      return errorResponse('Missing required fields: tenantId and tableName', 400);
    }

    // Authorization: Only allow migrating own tenant OR admin role
    if (tenantId !== userTenantId && role !== 'admin' && role !== 'super_admin') {
      console.error(`[migrate-tenant-data] Unauthorized: User ${userId} tried to migrate tenant ${tenantId}`);
      return errorResponse('Unauthorized to migrate this tenant', 403);
    }

    // Use service role for migration
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if schema is provisioned
    const { data: isProvisioned, error: checkError } = await serviceClient
      .rpc('is_tenant_schema_provisioned', { p_tenant_id: tenantId });

    if (checkError || !isProvisioned) {
      return errorResponse('Tenant schema not provisioned. Run provision-tenant-schema first.', 400);
    }

    // Migrate the table data
    const { data: result, error: migrateError } = await serviceClient
      .rpc('migrate_tenant_data', { 
        p_tenant_id: tenantId,
        p_table_name: tableName
      });

    if (migrateError) {
      console.error('[migrate-tenant-data] Error migrating table:', migrateError);
      return errorResponse(`Failed to migrate table: ${migrateError.message}`, 500);
    }

    console.log(`[migrate-tenant-data] Successfully migrated ${tableName} for tenant ${tenantId}:`, result);

    return jsonResponse(result as MigrateResult);

  } catch (error) {
    console.error('[migrate-tenant-data] Unexpected error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
