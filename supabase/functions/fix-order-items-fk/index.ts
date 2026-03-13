/**
 * Fix Order Items FK - Remap order_id from public schema IDs to tenant schema IDs
 * 
 * Runs in batches of 5000 to avoid timeouts.
 * POST /fix-order-items-fk
 * Body: { tenantId: string, batchSize?: number }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, batchSize = 5000 } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get tenant slug for schema name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug, schema_provisioned')
      .eq('id', tenantId)
      .single();

    if (!tenant?.schema_provisioned) {
      return new Response(JSON.stringify({ error: 'Tenant not schema-provisioned' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const schema = `tenant_${tenant.slug}`;

    // Run batch fix via raw SQL RPC
    const { data, error } = await supabase.rpc('fix_order_items_fk_batch', {
      p_schema: schema,
      p_batch_size: batchSize,
    });

    if (error) {
      console.error('Fix error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
