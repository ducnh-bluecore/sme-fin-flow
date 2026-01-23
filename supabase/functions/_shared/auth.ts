/**
 * SECURITY MODULE - MANDATORY FOR ALL EDGE FUNCTIONS
 * 
 * Per Security Manifesto:
 * - All functions MUST validate JWT
 * - Tenant isolation MUST come from JWT claims
 * - Reject unauthenticated or cross-tenant calls
 * - Any public callable function = FAIL
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  authenticated: boolean;
  userId: string | null;
  tenantId: string | null;
  email: string | null;
  role: string | null;
  error: string | null;
}

export interface SecureContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  email: string | null;
  role: string | null;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
};

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message, code: 'UNAUTHORIZED' }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Create forbidden response (authenticated but wrong tenant)
 */
export function forbiddenResponse(message: string = 'Forbidden - Cross-tenant access denied'): Response {
  return new Response(
    JSON.stringify({ error: message, code: 'FORBIDDEN' }),
    { 
      status: 403, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Validate JWT and extract claims
 * Returns AuthResult with user info or error
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authenticated: false,
      userId: null,
      tenantId: null,
      email: null,
      role: null,
      error: 'Missing or invalid Authorization header'
    };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  try {
    // Validate JWT using getClaims
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return {
        authenticated: false,
        userId: null,
        tenantId: null,
        email: null,
        role: null,
        error: claimsError?.message || 'Invalid token'
      };
    }

    const claims = claimsData.claims;
    const userId = claims.sub as string;
    const email = claims.email as string | null;
    const role = claims.role as string | null;

    // Get tenant from tenant_users table (tenant isolation)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tenantUser, error: tenantError } = await serviceClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
      return {
        authenticated: true,
        userId,
        tenantId: null,
        email,
        role,
        error: 'Failed to resolve tenant'
      };
    }

    return {
      authenticated: true,
      userId,
      tenantId: tenantUser?.tenant_id || null,
      email,
      role,
      error: null
    };
  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      authenticated: false,
      userId: null,
      tenantId: null,
      email: null,
      role: null,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Full security check with tenant isolation
 * Use this for user-initiated requests that need tenant context
 */
export async function requireAuth(req: Request): Promise<SecureContext | Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateAuth(req);

  if (!auth.authenticated) {
    console.error('Authentication failed:', auth.error);
    return unauthorizedResponse(auth.error || 'Unauthorized');
  }

  if (!auth.tenantId) {
    console.error('No tenant found for user:', auth.userId);
    return forbiddenResponse('User not associated with any tenant');
  }

  // Create service client for database operations
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  return {
    supabase,
    userId: auth.userId!,
    tenantId: auth.tenantId,
    email: auth.email,
    role: auth.role
  };
}

/**
 * Validate that the requested tenant matches the user's tenant
 * Use when tenant_id is passed in request body/params
 */
export function validateTenantAccess(
  requestedTenantId: string | null | undefined,
  userTenantId: string
): boolean {
  if (!requestedTenantId) return true; // No specific tenant requested
  return requestedTenantId === userTenantId;
}

/**
 * Check if context is a Response (error) or SecureContext
 */
export function isErrorResponse(context: SecureContext | Response): context is Response {
  return context instanceof Response;
}

/**
 * For scheduled/internal functions that use service role
 * Still validates that the call is from a trusted source
 */
export function requireServiceRole(req: Request): { supabase: SupabaseClient } | Response {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // For scheduled functions, check if called with service role key
  if (authHeader === `Bearer ${serviceKey}`) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey!
    );
    return { supabase };
  }

  // Otherwise, this is not authorized for service-level access
  console.error('Service role authentication failed');
  return unauthorizedResponse('Service role authentication required');
}

/**
 * Create a standard JSON response with CORS headers
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(message: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
