import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BuildResult {
  tenant_id: string;
  tenant_name: string;
  status: "success" | "error";
  result?: Record<string, unknown>;
  error?: string;
  duration_ms: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: BuildResult[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional params
    let targetDate: string | null = null;
    let targetTenantId: string | null = null;

    try {
      const body = await req.json();
      targetDate = body.as_of_date || null;
      targetTenantId = body.tenant_id || null;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Get active tenants
    let tenantsQuery = supabase
      .from("tenants")
      .select("id, name")
      .eq("is_active", true);

    if (targetTenantId) {
      tenantsQuery = tenantsQuery.eq("id", targetTenantId);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery;

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active tenants to process",
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${tenants.length} tenant(s)...`);

    // Process each tenant
    for (const tenant of tenants) {
      const tenantStart = Date.now();
      
      try {
        // Call the database function
        const { data, error } = await supabase.rpc("cdp_run_daily_build", {
          p_tenant_id: tenant.id,
          ...(targetDate ? { p_as_of_date: targetDate } : {}),
        });

        if (error) {
          throw error;
        }

        results.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          status: "success",
          result: data,
          duration_ms: Date.now() - tenantStart,
        });

        console.log(`✓ Tenant ${tenant.name}: ${data?.daily_customers || 0} daily, ${data?.rolling_customers || 0} rolling`);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        results.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          status: "error",
          error: errorMessage,
          duration_ms: Date.now() - tenantStart,
        });

        console.error(`✗ Tenant ${tenant.name}: ${errorMessage}`);
      }
    }

    // Log build run
    const runSummary = {
      run_at: new Date().toISOString(),
      target_date: targetDate || "yesterday",
      total_tenants: tenants.length,
      successful: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      total_duration_ms: Date.now() - startTime,
    };

    await supabase.from("cdp_build_logs").insert({
      run_type: "scheduled",
      summary: runSummary,
      details: results,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary: runSummary,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("CDP Build failed:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        results,
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
