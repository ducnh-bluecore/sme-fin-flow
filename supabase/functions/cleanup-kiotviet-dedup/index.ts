import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Marketplace SaleChannelIds to remove from kiotviet channel
const MARKETPLACE_IDS = ['38487','5389','5872','277489','38485','1000000082','238790'];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { 
      tenant_id, 
      batch_size = 500, 
      dry_run = true,
      start_offset = 0,          // resume from previous run
      cumulative_deleted = 0,     // carry over totals
      cumulative_items_deleted = 0,
      cumulative_batches = 0,
      invocation = 1,
    } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_JSON not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sa = JSON.parse(serviceAccountJson);
    const projectId = sa.project_id;

    const startMs = Date.now();
    const MAX_TIME = 50000; // 50s safety margin
    let totalDeleted = 0;
    let totalItemsDeleted = 0;
    let batchNum = 0;
    let offset = start_offset;
    let completed = false;
    const idsCondition = MARKETPLACE_IDS.map(id => `'${id}'`).join(',');

    console.log(`[Cleanup] Invocation #${invocation}, offset=${offset}, dry_run=${dry_run}, batch_size=${batch_size}`);

    const token = await getAccessToken(sa);

    while (Date.now() - startMs < MAX_TIME) {
      const sql = `SELECT CAST(\`OrderId\` AS STRING) as order_id 
        FROM \`${projectId}.olvboutique.raw_kiotviet_Orders\` 
        WHERE CAST(\`SaleChannelId\` AS STRING) IN (${idsCondition})
        ORDER BY \`OrderId\`
        LIMIT ${batch_size} OFFSET ${offset}`;

      const bqResult = await queryBigQuery(projectId, sql, token);
      
      if (!bqResult.rows || bqResult.rows.length === 0) {
        console.log(`[Cleanup] No more rows at offset ${offset}. ALL DONE!`);
        completed = true;
        break;
      }

      const orderIds = bqResult.rows.map((r: any) => r.order_id);
      batchNum++;
      
      if (dry_run) {
        console.log(`[Cleanup] DRY RUN batch ${batchNum}: would delete ${orderIds.length} orders (offset ${offset})`);
        totalDeleted += orderIds.length;
      } else {
        const { data: result, error } = await supabase.rpc('cleanup_kiotviet_marketplace_orders', {
          p_tenant_id: tenant_id,
          p_order_keys: orderIds,
          p_dry_run: false,
        });

        if (error) {
          console.error(`[Cleanup] RPC error batch ${batchNum}:`, error.message);
          // Still advance offset to avoid infinite loop
          offset += batch_size;
          continue;
        }

        const deleted = result?.orders_deleted || 0;
        const itemsDel = result?.items_deleted || 0;
        totalDeleted += deleted;
        totalItemsDeleted += itemsDel;
        console.log(`[Cleanup] Batch ${batchNum}: deleted ${deleted} orders, ${itemsDel} items (offset ${offset})`);
      }

      offset += batch_size;
      
      if (bqResult.rows.length < batch_size) {
        console.log(`[Cleanup] Last batch reached. ALL DONE!`);
        completed = true;
        break;
      }
    }

    const grandTotalDeleted = cumulative_deleted + totalDeleted;
    const grandTotalItems = cumulative_items_deleted + totalItemsDeleted;
    const grandBatches = cumulative_batches + batchNum;

    // Auto-continue if not completed and not dry_run
    if (!completed && !dry_run) {
      console.log(`[Cleanup] Time limit reached. Auto-continuing from offset ${offset}...`);
      
      // Fire-and-forget self-invocation
      const selfUrl = `${supabaseUrl}/functions/v1/cleanup-kiotviet-dedup`;
      fetch(selfUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "x-auto-continue": "true",
        },
        body: JSON.stringify({
          tenant_id,
          batch_size,
          dry_run: false,
          start_offset: offset,
          cumulative_deleted: grandTotalDeleted,
          cumulative_items_deleted: grandTotalItems,
          cumulative_batches: grandBatches,
          invocation: invocation + 1,
        }),
      }).catch(err => console.error("[Cleanup] Auto-continue fetch error:", err));
    }

    const result = {
      success: true,
      completed,
      dry_run,
      invocation,
      batches_this_run: batchNum,
      total_batches: grandBatches,
      deleted_this_run: totalDeleted,
      items_deleted_this_run: totalItemsDeleted,
      grand_total_orders_deleted: grandTotalDeleted,
      grand_total_items_deleted: grandTotalItems,
      next_offset: completed ? null : offset,
      elapsed_ms: Date.now() - startMs,
      message: completed
        ? `COMPLETED: Deleted ${grandTotalDeleted} orders and ${grandTotalItems} items total across ${grandBatches} batches`
        : `Invocation #${invocation} done. Deleted ${totalDeleted} this run (${grandTotalDeleted} total). Auto-continuing...`,
    };

    console.log(`[Cleanup] Result:`, JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Cleanup] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============= BigQuery helpers =============

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );

  const jwt = `${header}.${payload}.${arrayBufferToBase64Url(sig)}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  return data.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function queryBigQuery(projectId: string, sql: string, token: string): Promise<any> {
  const resp = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        maxResults: 10000,
      }),
    }
  );

  const data = await resp.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));

  const schema = data.schema?.fields || [];
  const rows = (data.rows || []).map((r: any) => {
    const obj: Record<string, any> = {};
    r.f.forEach((cell: any, i: number) => {
      obj[schema[i].name] = cell.v;
    });
    return obj;
  });

  return { rows, totalRows: data.totalRows };
}
