import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Rule {
  id: string;
  tenant_id: string;
  rule_name: string;
  platform: string;
  rule_type: string;
  conditions: Array<{ metric: string; operator: string; value: number; lookback_days: number }>;
  actions: { action_type: string; value?: number; notify_before_execute?: boolean };
  priority: number;
}

function evaluateCondition(metricValue: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case "<": return metricValue < threshold;
    case "<=": return metricValue <= threshold;
    case ">": return metricValue > threshold;
    case ">=": return metricValue >= threshold;
    case "=": case "==": return metricValue === threshold;
    case "!=": return metricValue !== threshold;
    default: return false;
  }
}

function getMetricFromRow(row: any, metric: string): number {
  const map: Record<string, string> = {
    roas: "roas",
    cpa: "cpa",
    ctr: "ctr",
    spend: "expense",
    cvr: "cvr",
    acos: "acos",
    cpc: "cpc",
    impressions: "impressions",
    clicks: "clicks",
    conversions: "conversions",
  };
  const col = map[metric.toLowerCase()] || metric;
  return Number(row[col]) || 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active rules
    const { data: rules, error: rulesErr } = await supabase
      .from("ads_rules")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: "No active rules", recommendations: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recent ads data (last 7 days)
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - 7);

    const { data: adsData, error: adsErr } = await supabase
      .from("ad_spend_daily")
      .select("*")
      .eq("tenant_id", tenant_id)
      .gte("spend_date", lookbackDate.toISOString().split("T")[0])
      .order("spend_date", { ascending: false });

    if (adsErr) throw adsErr;
    if (!adsData || adsData.length === 0) {
      return new Response(JSON.stringify({ message: "No recent ads data", recommendations: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group data by campaign
    const campaignMap: Record<string, any[]> = {};
    for (const row of adsData) {
      const key = `${row.channel}:${row.campaign_id}`;
      if (!campaignMap[key]) campaignMap[key] = [];
      campaignMap[key].push(row);
    }

    const recommendations: any[] = [];

    // Evaluate each rule against each campaign
    for (const rule of rules as Rule[]) {
      for (const [key, rows] of Object.entries(campaignMap)) {
        const [channel, campaignId] = key.split(":");

        // Check platform match
        if (rule.platform !== "all" && rule.platform !== channel) continue;

        // Evaluate conditions
        let allConditionsMet = true;
        const evidence: any = { metrics: {}, rule_id: rule.id, thresholds: {} };

        for (const cond of rule.conditions || []) {
          const lookbackRows = rows.filter((r) => {
            const daysDiff = Math.ceil(
              (Date.now() - new Date(r.spend_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysDiff <= (cond.lookback_days || 7);
          });

          if (lookbackRows.length === 0) {
            allConditionsMet = false;
            break;
          }

          // Check if condition is met for ALL days in lookback
          const metValues = lookbackRows.map((r) => getMetricFromRow(r, cond.metric));
          const avgValue = metValues.reduce((a, b) => a + b, 0) / metValues.length;

          evidence.metrics[cond.metric] = { avg: avgValue, days: metValues.length, values: metValues };
          evidence.thresholds[cond.metric] = { operator: cond.operator, value: cond.value };

          if (!evaluateCondition(avgValue, cond.operator, cond.value)) {
            allConditionsMet = false;
            break;
          }
        }

        if (!allConditionsMet) continue;

        // Calculate impact estimate
        const totalSpend = rows.reduce((s, r) => s + (Number(r.expense) || 0), 0);
        const avgDailySpend = totalSpend / rows.length;
        let impactEstimate = 0;
        let currentValue = avgDailySpend;
        let recommendedValue: number | null = null;

        switch (rule.rule_type) {
          case "pause": case "kill":
            impactEstimate = avgDailySpend * 7; // 7 days saved
            recommendedValue = 0;
            break;
          case "increase_budget":
            const increasePercent = rule.actions?.value || 20;
            recommendedValue = avgDailySpend * (1 + increasePercent / 100);
            impactEstimate = avgDailySpend * (increasePercent / 100) * 7;
            break;
          case "decrease_budget":
            const decreasePercent = rule.actions?.value || 20;
            recommendedValue = avgDailySpend * (1 - decreasePercent / 100);
            impactEstimate = avgDailySpend * (decreasePercent / 100) * 7;
            break;
          case "scale":
            const scalePercent = rule.actions?.value || 50;
            recommendedValue = avgDailySpend * (1 + scalePercent / 100);
            impactEstimate = avgDailySpend * (scalePercent / 100) * 7;
            break;
        }

        // Confidence based on data quality
        const confidence = Math.min(95, Math.max(30, rows.length * 15));

        recommendations.push({
          tenant_id,
          platform: channel,
          campaign_id: campaignId,
          campaign_name: rows[0]?.campaign_name || campaignId,
          recommendation_type: rule.rule_type === "kill" ? "pause" : rule.rule_type,
          reason: `Rule "${rule.rule_name}": ${rule.conditions.map((c: any) => `${c.metric} ${c.operator} ${c.value}`).join(" AND ")}`,
          evidence,
          current_value: currentValue,
          recommended_value: recommendedValue,
          impact_estimate: Math.round(impactEstimate),
          confidence,
          status: "pending",
        });
      }
    }

    // Insert recommendations (skip duplicates for same campaign + type)
    if (recommendations.length > 0) {
      // Check existing pending recommendations
      const { data: existing } = await supabase
        .from("ads_recommendations")
        .select("campaign_id, recommendation_type")
        .eq("tenant_id", tenant_id)
        .eq("status", "pending");

      const existingKeys = new Set(
        (existing || []).map((e: any) => `${e.campaign_id}:${e.recommendation_type}`)
      );

      const newRecs = recommendations.filter(
        (r) => !existingKeys.has(`${r.campaign_id}:${r.recommendation_type}`)
      );

      if (newRecs.length > 0) {
        const { error: insertErr } = await supabase.from("ads_recommendations").insert(newRecs);
        if (insertErr) throw insertErr;
      }

      return new Response(JSON.stringify({
        total_evaluated: Object.keys(campaignMap).length,
        recommendations: newRecs.length,
        skipped_duplicates: recommendations.length - newRecs.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      total_evaluated: Object.keys(campaignMap).length,
      recommendations: 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ads-optimizer-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
