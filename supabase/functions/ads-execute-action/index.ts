import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Platform-specific execution
async function executeTikTok(conn: any, action: string, campaignId: string, value?: number) {
  const { access_token } = conn.credentials;
  const base = "https://business-api.tiktok.com/open_api/v1.3";

  if (action === "pause" || action === "resume" || action === "kill") {
    const status = action === "resume" ? "ENABLE" : "DISABLE";
    const res = await fetch(`${base}/campaign/status/update/`, {
      method: "POST",
      headers: { "Access-Token": access_token, "Content-Type": "application/json" },
      body: JSON.stringify({
        advertiser_id: conn.account_id,
        campaign_ids: [campaignId],
        opt_status: status,
      }),
    });
    return { status: res.status, body: await res.json() };
  }

  if (action === "increase_budget" || action === "decrease_budget" || action === "scale") {
    const res = await fetch(`${base}/campaign/update/`, {
      method: "POST",
      headers: { "Access-Token": access_token, "Content-Type": "application/json" },
      body: JSON.stringify({
        advertiser_id: conn.account_id,
        campaign_id: campaignId,
        budget: value,
      }),
    });
    return { status: res.status, body: await res.json() };
  }

  throw new Error(`Unsupported TikTok action: ${action}`);
}

async function executeMeta(conn: any, action: string, campaignId: string, value?: number) {
  const { access_token } = conn.credentials;
  const base = "https://graph.facebook.com/v21.0";

  const params: Record<string, string> = { access_token };

  if (action === "pause" || action === "kill") params.status = "PAUSED";
  else if (action === "resume") params.status = "ACTIVE";
  else if (action === "increase_budget" || action === "decrease_budget" || action === "scale") {
    if (value) params.daily_budget = String(Math.round(value * 100)); // Meta uses cents
  }

  const res = await fetch(`${base}/${campaignId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  return { status: res.status, body: await res.json() };
}

async function executeGoogle(conn: any, action: string, campaignId: string, value?: number) {
  const { access_token, developer_token } = conn.credentials;
  const base = "https://googleads.googleapis.com/v18";

  const operations: any[] = [];

  if (action === "pause" || action === "kill") {
    operations.push({
      update: { resourceName: `customers/${conn.account_id}/campaigns/${campaignId}`, status: "PAUSED" },
      updateMask: "status",
    });
  } else if (action === "resume") {
    operations.push({
      update: { resourceName: `customers/${conn.account_id}/campaigns/${campaignId}`, status: "ENABLED" },
      updateMask: "status",
    });
  }

  const res = await fetch(`${base}/customers/${conn.account_id}/campaigns:mutate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "developer-token": developer_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operations }),
  });
  return { status: res.status, body: await res.json() };
}

async function executeShopee(conn: any, action: string, campaignId: string, value?: number) {
  const { access_token, partner_id, shop_id } = conn.credentials;
  const base = "https://partner.shopeemobile.com/api/v2";
  const timestamp = Math.floor(Date.now() / 1000);

  const body: any = {
    campaign_id: Number(campaignId),
    partner_id: Number(partner_id),
    shop_id: Number(shop_id),
    timestamp,
  };

  if (action === "pause" || action === "kill") body.status = "paused";
  else if (action === "resume") body.status = "ongoing";
  else if (value) body.daily_budget = value;

  const res = await fetch(`${base}/ads/update_campaign?access_token=${access_token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recommendation_id } = await req.json();
    if (!recommendation_id) throw new Error("recommendation_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recommendation
    const { data: rec, error: recError } = await supabase
      .from("ads_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .single();

    if (recError || !rec) throw new Error("Recommendation not found");

    // Safety checks
    if (rec.status !== "approved") throw new Error(`Recommendation status is '${rec.status}', expected 'approved'`);
    if (rec.expires_at && new Date(rec.expires_at) < new Date()) {
      await supabase.from("ads_recommendations").update({ status: "expired" }).eq("id", rec.id);
      throw new Error("Recommendation has expired");
    }

    // Update status to executing
    await supabase.from("ads_recommendations").update({ status: "executing" }).eq("id", rec.id);

    // Get platform connection
    const { data: conn, error: connError } = await supabase
      .from("ads_platform_connections")
      .select("*")
      .eq("tenant_id", rec.tenant_id)
      .eq("platform", rec.platform)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (connError || !conn) throw new Error(`No active ${rec.platform} connection found`);

    // Execute action
    const action = rec.recommendation_type;
    const campaignId = rec.campaign_id;
    const value = rec.recommended_value;
    let result: any;

    try {
      switch (rec.platform) {
        case "tiktok": result = await executeTikTok(conn, action, campaignId, value); break;
        case "meta": result = await executeMeta(conn, action, campaignId, value); break;
        case "google": result = await executeGoogle(conn, action, campaignId, value); break;
        case "shopee": result = await executeShopee(conn, action, campaignId, value); break;
        default: throw new Error(`Unsupported platform: ${rec.platform}`);
      }

      // Log success
      await supabase.from("ads_execution_log").insert({
        tenant_id: rec.tenant_id,
        recommendation_id: rec.id,
        platform: rec.platform,
        action_type: action,
        campaign_id: campaignId,
        request_payload: { action, campaign_id: campaignId, value },
        response_payload: result,
        status: "success",
        executed_by: rec.approved_by,
      });

      // Update recommendation
      await supabase.from("ads_recommendations").update({
        status: "executed",
        execution_result: { api_response: result, executed_at: new Date().toISOString() },
      }).eq("id", rec.id);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (execError) {
      const errMsg = execError instanceof Error ? execError.message : String(execError);

      await supabase.from("ads_execution_log").insert({
        tenant_id: rec.tenant_id,
        recommendation_id: rec.id,
        platform: rec.platform,
        action_type: action,
        campaign_id: campaignId,
        request_payload: { action, campaign_id: campaignId, value },
        status: "failed",
        error_message: errMsg,
        executed_by: rec.approved_by,
      });

      await supabase.from("ads_recommendations").update({
        status: "failed",
        execution_result: { error: errMsg, executed_at: new Date().toISOString() },
      }).eq("id", rec.id);

      throw execError;
    }

  } catch (e) {
    console.error("ads-execute-action error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
