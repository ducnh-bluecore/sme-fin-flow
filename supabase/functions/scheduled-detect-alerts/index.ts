import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('🚀 Starting scheduled alert detection...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('is_active', true);

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    console.log(`Found ${tenants?.length || 0} active tenants`);

    const results = [];

    // Process each tenant
    for (const tenant of tenants || []) {
      console.log(`\n📊 Processing tenant: ${tenant.name} (${tenant.id})`);
      
      try {
        // Call detect-alerts for this tenant
        const response = await supabase.functions.invoke('detect-alerts', {
          body: { 
            tenant_id: tenant.id,
            use_precalculated: true 
          }
        });

        if (response.error) {
          console.error(`Error for tenant ${tenant.id}:`, response.error);
          results.push({
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            status: 'error',
            error: response.error.message
          });
        } else {
          console.log(`✅ Tenant ${tenant.name}: ${response.data?.triggered || 0} alerts triggered`);
          results.push({
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            status: 'success',
            triggered: response.data?.triggered || 0,
            checked: response.data?.checked || 0
          });
        }
      } catch (tenantError: any) {
        console.error(`Exception for tenant ${tenant.id}:`, tenantError);
        results.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          status: 'exception',
          error: tenantError.message
        });
      }
    }

    // Process notifications for triggered alerts
    console.log('\n📬 Processing alert notifications...');
    
    try {
      const notifResponse = await supabase.functions.invoke('process-alert-notifications', {
        body: { process_all: true }
      });
      console.log('Notification processing result:', notifResponse.data);
    } catch (notifError) {
      console.error('Error processing notifications:', notifError);
    }

    const duration = Date.now() - startTime;
    const totalTriggered = results.reduce((sum, r) => sum + (r.triggered || 0), 0);
    const totalChecked = results.reduce((sum, r) => sum + (r.checked || 0), 0);

    console.log(`\n🏁 Scheduled detection completed in ${duration}ms`);
    console.log(`   Total alerts triggered: ${totalTriggered}`);
    console.log(`   Total rules checked: ${totalChecked}`);

    // Log execution to audit
    await supabase.from('audit_logs').insert({
      action: 'scheduled_alert_detection',
      entity_type: 'system',
      new_values: {
        tenants_processed: tenants?.length || 0,
        total_triggered: totalTriggered,
        total_checked: totalChecked,
        duration_ms: duration,
        results: results
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled alert detection completed',
        duration_ms: duration,
        tenants_processed: tenants?.length || 0,
        total_triggered: totalTriggered,
        total_checked: totalChecked,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error in scheduled detection:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        duration_ms: Date.now() - startTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
