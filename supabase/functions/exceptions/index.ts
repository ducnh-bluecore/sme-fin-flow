import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Detector SQL queries (idempotent - no duplicates)
const DETECTOR_ORPHAN_BANK_TXN = `
insert into public.exceptions_queue (
  tenant_id, exception_type, severity,
  ref_type, ref_id,
  impact_amount, currency,
  title, description,
  evidence, payload,
  detected_at, last_seen_at
)
select
  bt.tenant_id,
  'ORPHAN_BANK_TXN',
  case
    when abs(bt.amount) > 200000000 then 'critical'
    when abs(bt.amount) > 50000000 then 'high'
    else 'medium'
  end,
  'bank_transaction',
  bt.id,
  abs(bt.amount),
  coalesce(bt.currency, 'VND'),
  'Unmatched bank transaction',
  concat('Bank transaction ', coalesce(bt.reference, bt.id::text), ' has no reconciliation'),
  jsonb_build_object(
    'bank_transaction_id', bt.id,
    'reference', bt.reference,
    'description', bt.description
  ),
  jsonb_build_object(
    'amount', bt.amount,
    'transaction_date', bt.transaction_date,
    'transaction_type', bt.transaction_type
  ),
  now(),
  now()
from public.bank_transactions bt
left join public.reconciliation_links rl
  on rl.tenant_id = bt.tenant_id
 and rl.bank_transaction_id = bt.id
 and rl.is_voided = false
where rl.id is null
  and bt.tenant_id = $1
  and not exists (
    select 1 from public.exceptions_queue e
    where e.ref_type = 'bank_transaction'
      and e.ref_id = bt.id
      and e.status = 'open'
      and e.tenant_id = bt.tenant_id
  )
on conflict do nothing
returning id;
`;

const DETECTOR_AR_OVERDUE = `
insert into public.exceptions_queue (
  tenant_id, exception_type, severity,
  ref_type, ref_id,
  impact_amount, currency,
  title, description,
  evidence, payload,
  detected_at, last_seen_at
)
select
  i.tenant_id,
  'AR_OVERDUE',
  case
    when current_date - i.due_date > 30 then 'critical'
    when current_date - i.due_date > 7 then 'high'
    else 'medium'
  end,
  'invoice',
  i.id,
  (i.total_amount - coalesce(p.paid_amount_settled, 0)),
  'VND',
  concat('Invoice overdue: ', i.invoice_number),
  concat(
    'Invoice ', i.invoice_number,
    ' (', coalesce(c.name, 'Unknown'), ') overdue ',
    (current_date - i.due_date), ' days'
  ),
  jsonb_build_object(
    'invoice_id', i.id,
    'invoice_number', i.invoice_number,
    'customer_name', coalesce(c.name, 'Unknown'),
    'due_date', i.due_date
  ),
  jsonb_build_object(
    'total_amount', i.total_amount,
    'paid_amount_settled', coalesce(p.paid_amount_settled, 0),
    'outstanding', (i.total_amount - coalesce(p.paid_amount_settled, 0)),
    'days_overdue', (current_date - i.due_date)
  ),
  now(),
  now()
from public.invoices i
left join public.customers c on c.id = i.customer_id
left join public.v_invoice_settled_paid p
  on p.invoice_id = i.id and p.tenant_id = i.tenant_id
left join public.v_invoice_settled_status s
  on s.invoice_id = i.id and s.tenant_id = i.tenant_id
where i.due_date < current_date
  and i.tenant_id = $1
  and coalesce(s.settled_status, 'unpaid') <> 'paid'
  and (i.total_amount - coalesce(p.paid_amount_settled, 0)) > 0
  and not exists (
    select 1 from public.exceptions_queue e
    where e.ref_type = 'invoice'
      and e.ref_id = i.id
      and e.status = 'open'
      and e.tenant_id = i.tenant_id
  )
on conflict do nothing
returning id;
`;

const DETECTOR_PARTIAL_MATCH_STUCK = `
insert into public.exceptions_queue (
  tenant_id, exception_type, severity,
  ref_type, ref_id,
  impact_amount, currency,
  title, description,
  evidence, payload,
  detected_at, last_seen_at
)
select
  bt.tenant_id,
  'PARTIAL_MATCH_STUCK',
  'high',
  'bank_transaction',
  bt.id,
  (abs(bt.amount) - coalesce(ms.matched_amount, 0)),
  coalesce(bt.currency, 'VND'),
  'Partial match stuck',
  concat('Bank txn ', coalesce(bt.reference, bt.id::text), ' partially matched for >7 days'),
  jsonb_build_object(
    'bank_transaction_id', bt.id,
    'bank_amount', bt.amount,
    'matched_amount', coalesce(ms.matched_amount, 0)
  ),
  jsonb_build_object(
    'unmatched_amount', (abs(bt.amount) - coalesce(ms.matched_amount, 0)),
    'transaction_date', bt.transaction_date
  ),
  now(),
  now()
from public.bank_transactions bt
join public.v_bank_txn_match_state ms
  on ms.bank_transaction_id = bt.id
 and ms.tenant_id = bt.tenant_id
where ms.match_state = 'partially_matched'
  and bt.tenant_id = $1
  and bt.created_at < now() - interval '7 days'
  and not exists (
    select 1 from public.exceptions_queue e
    where e.ref_type = 'bank_transaction'
      and e.ref_id = bt.id
      and e.status = 'open'
      and e.tenant_id = bt.tenant_id
  )
on conflict do nothing
returning id;
`;

// Update last_seen_at for existing open exceptions
const UPDATE_LAST_SEEN = `
update public.exceptions_queue e
set last_seen_at = now()
where e.tenant_id = $1
  and e.status = 'open'
  and exists (
    case e.exception_type
      when 'ORPHAN_BANK_TXN' then (
        select 1 from public.bank_transactions bt
        left join public.reconciliation_links rl
          on rl.bank_transaction_id = bt.id and rl.is_voided = false
        where bt.id = e.ref_id and rl.id is null
      )
      when 'AR_OVERDUE' then (
        select 1 from public.invoices i
        left join public.v_invoice_settled_status s on s.invoice_id = i.id
        where i.id = e.ref_id
          and i.due_date < current_date
          and coalesce(s.settled_status, 'unpaid') <> 'paid'
      )
      when 'PARTIAL_MATCH_STUCK' then (
        select 1 from public.v_bank_txn_match_state ms
        where ms.bank_transaction_id = e.ref_id
          and ms.match_state = 'partially_matched'
      )
    end
  );
`;

// Auto-resolve exceptions that are no longer valid
const AUTO_RESOLVE = `
update public.exceptions_queue e
set 
  status = 'resolved',
  resolved_at = now(),
  triage_notes = coalesce(triage_notes || E'\n', '') || 'Auto-resolved: condition no longer met'
where e.tenant_id = $1
  and e.status = 'open'
  and not exists (
    case e.exception_type
      when 'ORPHAN_BANK_TXN' then (
        select 1 from public.bank_transactions bt
        left join public.reconciliation_links rl
          on rl.bank_transaction_id = bt.id and rl.is_voided = false
        where bt.id = e.ref_id and rl.id is null
      )
      when 'AR_OVERDUE' then (
        select 1 from public.invoices i
        left join public.v_invoice_settled_status s on s.invoice_id = i.id
        where i.id = e.ref_id
          and i.due_date < current_date
          and coalesce(s.settled_status, 'unpaid') <> 'paid'
      )
      when 'PARTIAL_MATCH_STUCK' then (
        select 1 from public.v_bank_txn_match_state ms
        where ms.bank_transaction_id = e.ref_id
          and ms.match_state = 'partially_matched'
      )
    end
  )
returning id;
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[1] || "";
    const exceptionId = pathParts[1];
    const subAction = pathParts[2];

    // SECURITY: Validate JWT and get tenant from claims
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    let tenantId: string | null = null;

    if (isServiceRole) {
      // Service role call - trust x-tenant-id header
      tenantId = req.headers.get("x-tenant-id");
      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: "tenant_id required for service role calls" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Service role call for tenant: ${tenantId}`);
    } else if (authHeader?.startsWith("Bearer ")) {
      // User call - validate JWT
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized", code: "INVALID_TOKEN" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = claimsData.claims.sub as string;

      // Get user's tenant
      const { data: tenantUser, error: tenantError } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (tenantError || !tenantUser?.tenant_id) {
        return new Response(JSON.stringify({ error: "Forbidden - No tenant access", code: "NO_TENANT" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      tenantId = tenantUser.tenant_id;
      console.log(`User ${userId} accessing exceptions for tenant: ${tenantId}`);
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "NO_AUTH" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /exceptions/detect - Run all detectors
    if (req.method === "POST" && action === "detect") {
      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: "Tenant ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Run all detectors
      const results = {
        orphan_bank_txn: 0,
        ar_overdue: 0,
        partial_match_stuck: 0,
        updated: 0,
        auto_resolved: 0,
      };

      // Count existing open exceptions
      const { data: orphans } = await supabase
        .from("exceptions_queue")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("exception_type", "ORPHAN_BANK_TXN")
        .eq("status", "open");
      
      const { data: overdues } = await supabase
        .from("exceptions_queue")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("exception_type", "AR_OVERDUE")
        .eq("status", "open");

      const { data: partials } = await supabase
        .from("exceptions_queue")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("exception_type", "PARTIAL_MATCH_STUCK")
        .eq("status", "open");

      results.orphan_bank_txn = orphans?.length || 0;
      results.ar_overdue = overdues?.length || 0;
      results.partial_match_stuck = partials?.length || 0;

      return new Response(
        JSON.stringify({ 
          success: true, 
          detected: results,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /exceptions - List exceptions
    if (req.method === "GET" && (!action || action === "list")) {
      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const status = url.searchParams.get("status") || "open";
      const type = url.searchParams.get("type");
      const severity = url.searchParams.get("severity");
      const sort = url.searchParams.get("sort") || "impact";
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase
        .from("exceptions_queue")
        .select("*")
        .eq("tenant_id", tenantId);

      if (status !== "all") {
        query = query.eq("status", status);
      }
      if (type) {
        query = query.eq("exception_type", type);
      }
      if (severity) {
        query = query.eq("severity", severity);
      }

      // Sorting
      if (sort === "impact") {
        query = query.order("impact_amount", { ascending: false });
      } else if (sort === "aging") {
        query = query.order("detected_at", { ascending: true });
      } else {
        query = query.order("detected_at", { ascending: false });
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ exceptions: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /exceptions/stats - Get exception statistics
    if (req.method === "GET" && action === "stats") {
      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("exceptions_queue")
        .select("status, severity, exception_type, impact_amount")
        .eq("tenant_id", tenantId);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stats = {
        total: data?.length || 0,
        open: data?.filter(e => e.status === "open").length || 0,
        triaged: data?.filter(e => e.status === "triaged").length || 0,
        snoozed: data?.filter(e => e.status === "snoozed").length || 0,
        resolved: data?.filter(e => e.status === "resolved").length || 0,
        by_severity: {
          critical: data?.filter(e => e.status === "open" && e.severity === "critical").length || 0,
          high: data?.filter(e => e.status === "open" && e.severity === "high").length || 0,
          medium: data?.filter(e => e.status === "open" && e.severity === "medium").length || 0,
          low: data?.filter(e => e.status === "open" && e.severity === "low").length || 0,
        },
        by_type: {
          ORPHAN_BANK_TXN: data?.filter(e => e.status === "open" && e.exception_type === "ORPHAN_BANK_TXN").length || 0,
          AR_OVERDUE: data?.filter(e => e.status === "open" && e.exception_type === "AR_OVERDUE").length || 0,
          PARTIAL_MATCH_STUCK: data?.filter(e => e.status === "open" && e.exception_type === "PARTIAL_MATCH_STUCK").length || 0,
        },
        total_impact: data?.filter(e => e.status === "open").reduce((sum, e) => sum + (e.impact_amount || 0), 0) || 0,
      };

      return new Response(
        JSON.stringify({ stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /exceptions/explain/:id - Get detailed explanation
    if (req.method === "GET" && action === "explain" && subAction) {
      const id = subAction;

      const { data: exception, error } = await supabase
        .from("exceptions_queue")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !exception) {
        return new Response(
          JSON.stringify({ error: "Exception not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get additional context based on ref_type
      let refData = null;
      if (exception.ref_type === "invoice") {
        const { data: invoice } = await supabase
          .from("invoices")
          .select(`
            *,
            customers (name, email, phone)
          `)
          .eq("id", exception.ref_id)
          .single();
        refData = invoice;
      } else if (exception.ref_type === "bank_transaction") {
        const { data: txn } = await supabase
          .from("bank_transactions")
          .select("*")
          .eq("id", exception.ref_id)
          .single();
        refData = txn;
      }

      const aging = Math.floor((Date.now() - new Date(exception.detected_at).getTime()) / (1000 * 60 * 60 * 24));

      const explanation = {
        id: exception.id,
        type: exception.exception_type,
        severity: exception.severity,
        status: exception.status,
        title: exception.title,
        description: exception.description,
        impact: {
          amount: exception.impact_amount,
          currency: exception.currency,
        },
        aging_days: aging,
        detected_at: exception.detected_at,
        last_seen_at: exception.last_seen_at,
        evidence: exception.evidence,
        payload: exception.payload,
        ref_data: refData,
        suggested_actions: getSuggestedActions(exception.exception_type),
        assigned_to: exception.assigned_to,
        triage_notes: exception.triage_notes,
        snoozed_until: exception.snoozed_until,
      };

      return new Response(
        JSON.stringify({ explanation }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /exceptions/:id/triage
    if (req.method === "POST" && subAction === "triage") {
      const body = await req.json();
      const { assignedTo, triageNotes } = body;

      const { data, error } = await supabase
        .from("exceptions_queue")
        .update({
          status: "triaged",
          assigned_to: assignedTo || null,
          triage_notes: triageNotes || null,
        })
        .eq("id", exceptionId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, exception: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /exceptions/:id/snooze
    if (req.method === "POST" && subAction === "snooze") {
      const body = await req.json();
      const { snoozedUntil } = body;

      const { data, error } = await supabase
        .from("exceptions_queue")
        .update({
          status: "snoozed",
          snoozed_until: snoozedUntil,
        })
        .eq("id", exceptionId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, exception: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /exceptions/:id/resolve
    if (req.method === "POST" && subAction === "resolve") {
      const body = await req.json();
      const { resolvedReason } = body;

      const authHeader = req.headers.get("Authorization");
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      const { data, error } = await supabase
        .from("exceptions_queue")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          triage_notes: resolvedReason ? 
            `Resolved: ${resolvedReason}` : 
            "Manually resolved",
        })
        .eq("id", exceptionId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, exception: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Exception handler error:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getSuggestedActions(type: string): string[] {
  switch (type) {
    case "ORPHAN_BANK_TXN":
      return [
        "Go to Reconciliation Board to match this transaction",
        "Check if this is a duplicate or erroneous entry",
        "Contact bank for clarification if reference is unclear",
      ];
    case "AR_OVERDUE":
      return [
        "Send payment reminder to customer",
        "Review customer payment history",
        "Consider escalation to collections",
        "Check if partial payment was received",
      ];
    case "PARTIAL_MATCH_STUCK":
      return [
        "Complete the reconciliation in Reconciliation Board",
        "Check for additional invoices to match",
        "Review if remaining amount is a bank fee or adjustment",
      ];
    default:
      return ["Review and take appropriate action"];
  }
}
