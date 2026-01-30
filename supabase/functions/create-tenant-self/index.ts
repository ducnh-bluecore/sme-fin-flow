/**
 * create-tenant-self
 *
 * Allows an authenticated user to create their own tenant during onboarding.
 * Uses service role internally to bypass RLS, but validates the caller's JWT.
 *
 * POST /create-tenant-self
 * Body: { name: string, slug?: string }
 * Response: { success: true, tenant: Tenant }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  validateAuth,
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from '../_shared/auth.ts';

type CreateTenantSelfRequest = {
  name: string;
  slug?: string;
};

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await validateAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return unauthorizedResponse(auth.error || 'Unauthorized');
  }

  try {
    const body: CreateTenantSelfRequest = await req.json();
    const name = (body?.name || '').trim();
    const slug = (body?.slug || generateSlug(name)).trim();

    if (!name) return errorResponse('Missing required field: name', 400);
    if (!slug) return errorResponse('Invalid slug', 400);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Enforce slug uniqueness
    const { data: existingTenant, error: existingTenantError } = await serviceClient
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingTenantError) {
      console.error('[create-tenant-self] Error checking slug:', existingTenantError);
      return errorResponse('Failed to validate tenant slug', 500);
    }

    if (existingTenant?.id) {
      return errorResponse('Slug đã tồn tại, vui lòng chọn slug khác', 400);
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await serviceClient
      .from('tenants')
      .insert({
        name,
        slug,
        is_active: true,
        plan: 'free',
      })
      .select('*')
      .single();

    if (tenantError) {
      console.error('[create-tenant-self] Error creating tenant:', tenantError);
      return errorResponse(`Lỗi khi tạo công ty: ${tenantError.message}`, 400);
    }

    // Add caller as owner
    const { error: tenantUserError } = await serviceClient
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: auth.userId,
        role: 'owner',
        is_active: true,
        joined_at: new Date().toISOString(),
      });

    if (tenantUserError) {
      console.error('[create-tenant-self] Error creating tenant_users:', tenantUserError);
      // Rollback tenant to avoid orphan
      await serviceClient.from('tenants').delete().eq('id', tenant.id);
      return errorResponse(`Lỗi khi gán owner: ${tenantUserError.message}`, 400);
    }

    // Ensure active_tenant_id is set
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({ active_tenant_id: tenant.id })
      .eq('id', auth.userId);

    if (profileError) {
      console.error('[create-tenant-self] Error updating profile:', profileError);
      // Non-fatal; UI can still switch tenant via hook if needed
    }

    // Auto-provision dedicated schema for tenant
    console.log(`[create-tenant-self] Auto-provisioning schema for tenant ${tenant.id} (${slug})`);
    try {
      const { data: provisionResult, error: provisionError } = await serviceClient
        .rpc('provision_tenant_schema', {
          p_tenant_id: tenant.id,
          p_slug: slug
        });

      if (provisionError) {
        console.error('[create-tenant-self] Error provisioning schema:', provisionError);
        // Non-fatal - schema can be provisioned later by admin
      } else {
        console.log('[create-tenant-self] Schema provisioned successfully:', provisionResult);
      }
    } catch (provisionErr) {
      console.error('[create-tenant-self] Exception during schema provisioning:', provisionErr);
      // Non-fatal - continue with tenant creation
    }

    return jsonResponse({ success: true, tenant });
  } catch (err) {
    console.error('[create-tenant-self] Unexpected error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});
