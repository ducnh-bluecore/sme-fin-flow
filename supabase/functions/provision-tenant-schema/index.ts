/**
 * Provision Tenant Schema Edge Function
 * 
 * Creates a new schema for a tenant with all required tables.
 * This is an admin-only function called when onboarding a new tenant
 * or migrating an existing tenant to schema-per-tenant architecture.
 * 
 * POST /provision-tenant-schema
 * Body: { tenantId: string, slug: string }
 * 
 * Response: { success: boolean, schema_name: string, tables_created: number }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  requireAuth, 
  isErrorResponse,
  jsonResponse,
  errorResponse 
} from "../_shared/auth.ts";

interface ProvisionRequest {
  tenantId: string;
  slug: string;
}

interface ProvisionResult {
  success: boolean;
  schema_name?: string;
  tables_created?: number;
  views_created?: number;
  provisioned_at?: string;
  error?: string;
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

    const { supabase, userId, tenantId: userTenantId, role } = authResult;

    // Parse request body
    const body: ProvisionRequest = await req.json();
    const { tenantId, slug } = body;

    if (!tenantId || !slug) {
      return errorResponse('Missing required fields: tenantId and slug', 400);
    }

    // Authorization check: 
    // 1. User can provision their own tenant
    // 2. OR user is an admin/super_admin in ANY tenant (global admin capability)
    // 3. OR user has owner/admin role in the target tenant
    let canProvision = false;
    
    if (tenantId === userTenantId) {
      canProvision = true;
    } else if (role === 'admin' || role === 'super_admin') {
      canProvision = true;
    } else {
      // Check if user has admin/owner role in the target tenant
      const { data: targetTenantUser } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (targetTenantUser && ['owner', 'admin'].includes(targetTenantUser.role)) {
        canProvision = true;
      }
    }

    if (!canProvision) {
      console.error(`[provision-tenant-schema] Unauthorized: User ${userId} (tenant ${userTenantId}) tried to provision tenant ${tenantId}`);
      return errorResponse('Unauthorized to provision this tenant', 403);
    }

    // Check if schema is already provisioned
    const { data: isProvisioned, error: checkError } = await supabase
      .rpc('is_tenant_schema_provisioned', { p_tenant_id: tenantId });

    if (checkError) {
      console.error('[provision-tenant-schema] Error checking provisioned status:', checkError);
      return errorResponse('Failed to check schema status', 500);
    }

    if (isProvisioned) {
      return jsonResponse({
        success: false,
        error: 'Schema already provisioned',
        schema_name: `tenant_${slug}`
      } as ProvisionResult, 409);
    }

    // Provision the schema using service role
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: result, error: provisionError } = await serviceClient
      .rpc('provision_tenant_schema', { 
        p_tenant_id: tenantId,
        p_slug: slug
      });

    if (provisionError) {
      console.error('[provision-tenant-schema] Error provisioning schema:', provisionError);
      return errorResponse(`Failed to provision schema: ${provisionError.message}`, 500);
    }

    console.log(`[provision-tenant-schema] Successfully provisioned schema for tenant ${tenantId}:`, result);

    return jsonResponse(result as ProvisionResult);

  } catch (error) {
    console.error('[provision-tenant-schema] Unexpected error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
