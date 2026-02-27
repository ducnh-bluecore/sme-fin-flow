import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlatformConnection {
  id: string;
  tenant_id: string;
  platform: string;
  account_id: string;
  credentials: Record<string, string>;
}

// TikTok Ads API
async function syncTikTok(conn: PlatformConnection) {
  const { access_token, app_id } = conn.credentials;
  const baseUrl = "https://business-api.tiktok.com/open_api/v1.3";

  // Fetch campaigns
  const campaignsRes = await fetch(`${baseUrl}/campaign/get/`, {
    method: "POST",
    headers: {
      "Access-Token": access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: conn.account_id,
      page_size: 100,
    }),
  });

  if (!campaignsRes.ok) {
    const err = await campaignsRes.text();
    throw new Error(`TikTok campaign fetch failed [${campaignsRes.status}]: ${err}`);
  }

  const campaignsData = await campaignsRes.json();
  const campaigns = campaignsData?.data?.list || [];

  // Fetch reports for today
  const today = new Date().toISOString().split("T")[0];
  const reportsRes = await fetch(`${baseUrl}/report/integrated/get/`, {
    method: "POST",
    headers: {
      "Access-Token": access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      advertiser_id: conn.account_id,
      report_type: "BASIC",
      dimensions: ["campaign_id"],
      data_level: "AUCTION_CAMPAIGN",
      start_date: today,
      end_date: today,
      metrics: ["spend", "impressions", "clicks", "conversion", "cpc", "ctr", "cpm"],
    }),
  });

  let reportMap: Record<string, any> = {};
  if (reportsRes.ok) {
    const reportData = await reportsRes.json();
    for (const row of reportData?.data?.list || []) {
      reportMap[row.dimensions?.campaign_id] = row.metrics;
    }
  }

  return campaigns.map((c: any) => ({
    campaign_id: c.campaign_id,
    campaign_name: c.campaign_name,
    channel: "tiktok",
    status: c.operation_status,
    daily_budget: c.budget,
    metrics: reportMap[c.campaign_id] || {},
  }));
}

// Meta/Facebook Ads API
async function syncMeta(conn: PlatformConnection) {
  const { access_token } = conn.credentials;
  const baseUrl = "https://graph.facebook.com/v21.0";

  const campaignsRes = await fetch(
    `${baseUrl}/act_${conn.account_id}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,objective&access_token=${access_token}&limit=100`
  );

  if (!campaignsRes.ok) {
    const err = await campaignsRes.text();
    throw new Error(`Meta campaign fetch failed [${campaignsRes.status}]: ${err}`);
  }

  const campaignsData = await campaignsRes.json();
  const campaigns = campaignsData?.data || [];

  // Fetch insights for each campaign (today)
  const results = [];
  for (const c of campaigns) {
    let metrics: any = {};
    try {
      const insightsRes = await fetch(
        `${baseUrl}/${c.id}/insights?fields=spend,impressions,clicks,actions,cpc,ctr,cpm&date_preset=today&access_token=${access_token}`
      );
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        metrics = insightsData?.data?.[0] || {};
      }
    } catch { /* skip insights errors */ }

    results.push({
      campaign_id: c.id,
      campaign_name: c.name,
      channel: "meta",
      status: c.status,
      daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      metrics,
    });
  }

  return results;
}

// Google Ads API
async function syncGoogle(conn: PlatformConnection) {
  const { access_token, developer_token } = conn.credentials;
  const baseUrl = "https://googleads.googleapis.com/v18";

  const query = `
    SELECT campaign.id, campaign.name, campaign.status, campaign.campaign_budget,
           metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions,
           metrics.average_cpc, metrics.ctr
    FROM campaign
    WHERE segments.date = '${new Date().toISOString().split("T")[0]}'
  `;

  const res = await fetch(
    `${baseUrl}/customers/${conn.account_id}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "developer-token": developer_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads fetch failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  const results = [];

  for (const batch of data || []) {
    for (const row of batch?.results || []) {
      results.push({
        campaign_id: row.campaign?.id,
        campaign_name: row.campaign?.name,
        channel: "google",
        status: row.campaign?.status,
        daily_budget: null,
        metrics: {
          spend: row.metrics?.costMicros ? Number(row.metrics.costMicros) / 1_000_000 : 0,
          impressions: row.metrics?.impressions,
          clicks: row.metrics?.clicks,
          conversions: row.metrics?.conversions,
          cpc: row.metrics?.averageCpc ? Number(row.metrics.averageCpc) / 1_000_000 : 0,
          ctr: row.metrics?.ctr,
        },
      });
    }
  }

  return results;
}

// Shopee Ads API
async function syncShopee(conn: PlatformConnection) {
  const { access_token, partner_id, shop_id } = conn.credentials;
  const baseUrl = "https://partner.shopeemobile.com/api/v2";

  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `${baseUrl}/ads/get_all_ads?partner_id=${partner_id}&shop_id=${shop_id}&timestamp=${timestamp}&access_token=${access_token}`
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shopee Ads fetch failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  return (data?.response?.ads || []).map((ad: any) => ({
    campaign_id: ad.campaign_id || ad.ads_id,
    campaign_name: ad.title || `Shopee Ad ${ad.ads_id}`,
    channel: "shopee",
    status: ad.status,
    daily_budget: ad.daily_budget,
    metrics: {
      spend: ad.cost,
      impressions: ad.impressions,
      clicks: ad.clicks,
      conversions: ad.conversions,
    },
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, platform } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active connections
    let query = supabase
      .from("ads_platform_connections")
      .select("*")
      .eq("is_active", true);

    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    if (platform) query = query.eq("platform", platform);

    const { data: connections, error: connError } = await query;
    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ message: "No active connections found", synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const conn of connections) {
      try {
        let campaigns: any[] = [];
        switch (conn.platform) {
          case "tiktok": campaigns = await syncTikTok(conn); break;
          case "meta": campaigns = await syncMeta(conn); break;
          case "google": campaigns = await syncGoogle(conn); break;
          case "shopee": campaigns = await syncShopee(conn); break;
        }

        // Upsert into platform_ads_daily
        const today = new Date().toISOString().split("T")[0];
        for (const c of campaigns) {
          const { error: upsertError } = await supabase
            .from("ad_spend_daily")
            .upsert({
              tenant_id: conn.tenant_id,
              channel: c.channel,
              campaign_id: c.campaign_id,
              campaign_name: c.campaign_name,
              spend_date: today,
              expense: c.metrics?.spend || c.metrics?.cost || 0,
              impressions: c.metrics?.impressions || 0,
              clicks: c.metrics?.clicks || 0,
              conversions: c.metrics?.conversions || c.metrics?.conversion || 0,
              cpc: c.metrics?.cpc || 0,
              ctr: c.metrics?.ctr || 0,
            }, { onConflict: "tenant_id,channel,campaign_id,spend_date", ignoreDuplicates: false });

          if (upsertError) {
            console.error("Upsert error:", upsertError);
          }
        }

        // Update last_synced_at
        await supabase
          .from("ads_platform_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", conn.id);

        results.push({ platform: conn.platform, account: conn.account_id, campaigns: campaigns.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ platform: conn.platform, account: conn.account_id, error: msg });
      }
    }

    return new Response(JSON.stringify({ results, errors, synced: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ads-sync-campaigns error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
