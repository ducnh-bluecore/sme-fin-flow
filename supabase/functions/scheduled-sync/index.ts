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

    // SECURITY: Require service role key for scheduled functions
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${supabaseKey}`) {
      console.error('Unauthorized: scheduled-sync requires service role key');
      return new Response(JSON.stringify({ error: 'Unauthorized - Service role required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting scheduled sync for all active integrations...');

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
