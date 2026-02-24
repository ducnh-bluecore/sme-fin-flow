/**
 * import-demand-space - Bulk update demand_space on inv_family_codes
 * Accepts JSON array of { fc_code, demand_space } mappings
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { tenant_id, mappings } = body as {
      tenant_id: string;
      mappings: Array<{ fc_code: string; demand_space: string }>;
    };

    if (!tenant_id || !mappings || !Array.isArray(mappings)) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id or mappings array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter valid mappings
    const validMappings = mappings.filter(m => m.fc_code && m.demand_space && m.demand_space.trim() !== '');

    let updated = 0;
    let notFound = 0;
    const notFoundCodes: string[] = [];

    // Batch update in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < validMappings.length; i += chunkSize) {
      const chunk = validMappings.slice(i, i + chunkSize);
      
      for (const mapping of chunk) {
        const { data, error } = await supabase
          .from('inv_family_codes')
          .update({ demand_space: mapping.demand_space })
          .eq('tenant_id', tenant_id)
          .eq('fc_code', mapping.fc_code)
          .select('id');

        if (error) {
          console.error(`Error updating fc_code ${mapping.fc_code}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          updated++;
        } else {
          notFound++;
          if (notFoundCodes.length < 20) notFoundCodes.push(mapping.fc_code);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_submitted: validMappings.length,
      updated,
      not_found: notFound,
      not_found_sample: notFoundCodes,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
