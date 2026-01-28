import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SECURITY: Service role required - scheduled function
 * This function is called by cron jobs, not by users directly
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body to check action type
    let action = 'connector_sync';
    let requestBody: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) {
        requestBody = JSON.parse(text);
        if (requestBody?.action) {
          action = requestBody.action as string;
        }
      }
    } catch {
      // No body or invalid JSON, default to connector_sync
    }

    console.log(`Starting scheduled sync with action: ${action}`);

    // Handle cross-module sync action
    if (action === 'cross_module_sync') {
      console.log('Running cross-module daily sync...');
      
      const { data: syncResults, error: syncError } = await supabase
        .rpc('cross_module_run_daily_sync');
      
      if (syncError) {
        console.error('Cross-module sync error:', syncError);
        return new Response(JSON.stringify({
          success: false,
          action: 'cross_module_sync',
          error: syncError.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Cross-module sync completed:', syncResults);
      
      return new Response(JSON.stringify({
        success: true,
        action: 'cross_module_sync',
        results: syncResults,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Phase 8.4: Handle CDP full pipeline (includes insight detection)
    if (action === 'cdp_full_pipeline') {
      const tenantId = requestBody.tenant_id as string;
      const asOfDate = (requestBody.as_of_date as string) || new Date().toISOString().split('T')[0];
      
      if (!tenantId) {
        return new Response(JSON.stringify({
          success: false,
          action: 'cdp_full_pipeline',
          error: 'tenant_id is required',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`Running CDP full pipeline for tenant ${tenantId}...`);
      
      const { data: pipelineResults, error: pipelineError } = await supabase
        .rpc('cdp_run_full_daily_pipeline', {
          p_tenant_id: tenantId,
          p_as_of_date: asOfDate,
        });
      
      if (pipelineError) {
        console.error('CDP pipeline error:', pipelineError);
        return new Response(JSON.stringify({
          success: false,
          action: 'cdp_full_pipeline',
          error: pipelineError.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('CDP full pipeline completed:', pipelineResults);
      
      return new Response(JSON.stringify({
        success: true,
        action: 'cdp_full_pipeline',
        results: pipelineResults,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Phase 8.4: Handle manual insight trigger
    if (action === 'trigger_cdp_insights') {
      const tenantId = requestBody.tenant_id as string;
      const asOfDate = (requestBody.as_of_date as string) || new Date().toISOString().split('T')[0];
      
      if (!tenantId) {
        return new Response(JSON.stringify({
          success: false,
          action: 'trigger_cdp_insights',
          error: 'tenant_id is required',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log(`Triggering CDP insight detection for tenant ${tenantId}...`);
      
      const { error: insightError } = await supabase
        .rpc('cdp_detect_behavioral_changes', {
          p_tenant_id: tenantId,
          p_as_of_date: asOfDate,
        });
      
      if (insightError) {
        console.error('CDP insight error:', insightError);
        return new Response(JSON.stringify({
          success: false,
          action: 'trigger_cdp_insights',
          error: insightError.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Count generated insights
      const { count } = await supabase
        .from('cdp_insight_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('detected_at', asOfDate);
      
      console.log('CDP insight detection completed, new insights:', count);
      
      return new Response(JSON.stringify({
        success: true,
        action: 'trigger_cdp_insights',
        new_insights: count || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: connector sync
    console.log('Starting connector sync for all active integrations...');

    // Get all active integrations that need syncing
    const now = new Date();
    const { data: integrations, error: integrationError } = await supabase
      .from('connector_integrations')
      .select('*')
      .eq('status', 'active')
      .or(`next_sync_at.is.null,next_sync_at.lte.${now.toISOString()}`);

    if (integrationError) {
      throw new Error(`Failed to fetch integrations: ${integrationError.message}`);
    }

    console.log(`Found ${integrations?.length || 0} integrations to sync`);

    const results: Array<{ integration_id: string; shop_name: string; status: string; error?: string }> = [];

    for (const integration of integrations || []) {
      try {
        console.log(`Syncing ${integration.connector_type} - ${integration.shop_name}...`);

        // Call the sync-connector function
        const response = await fetch(`${supabaseUrl}/functions/v1/sync-connector`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            integration_id: integration.id,
            sync_type: 'all',
          }),
        });

        const result = await response.json();

        // Update next_sync_at
        const nextSync = new Date(now.getTime() + (integration.sync_frequency_minutes || 1440) * 60 * 1000);
        await supabase
          .from('connector_integrations')
          .update({ next_sync_at: nextSync.toISOString() })
          .eq('id', integration.id);

        results.push({
          integration_id: integration.id,
          shop_name: integration.shop_name || integration.connector_name,
          status: result.success ? 'success' : 'failed',
          error: result.error,
        });

      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`Failed to sync integration ${integration.id}:`, e);
        
        // Update integration with error
        await supabase
          .from('connector_integrations')
          .update({
            status: 'error',
            error_message: errorMsg,
          })
          .eq('id', integration.id);

        results.push({
          integration_id: integration.id,
          shop_name: integration.shop_name || integration.connector_name,
          status: 'error',
          error: errorMsg,
        });
      }
    }

    console.log('Scheduled sync completed:', results);

    return new Response(JSON.stringify({
      success: true,
      action: 'connector_sync',
      synced_count: results.filter(r => r.status === 'success').length,
      failed_count: results.filter(r => r.status !== 'success').length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scheduled sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
