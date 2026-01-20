import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tolerance for amount matching (5%)
const AMOUNT_TOLERANCE_PERCENT = 0.05;

// SQL to find candidate invoices for ORPHAN_BANK_TXN
const FIND_INVOICE_CANDIDATES = `
SELECT
  i.id as invoice_id,
  i.invoice_number,
  c.name as customer_name,
  i.total_amount,
  COALESCE(p.paid_amount_settled, 0) as paid_amount_settled,
  (i.total_amount - COALESCE(p.paid_amount_settled, 0)) as outstanding,
  i.due_date,
  i.issue_date
FROM public.invoices i
JOIN public.customers c ON c.id = i.customer_id
LEFT JOIN public.v_invoice_settled_paid p
  ON p.invoice_id = i.id AND p.tenant_id = i.tenant_id
LEFT JOIN public.v_invoice_settled_status s
  ON s.invoice_id = i.id AND s.tenant_id = i.tenant_id
WHERE i.tenant_id = $1
  AND (s.settled_status IS NULL OR s.settled_status <> 'paid')
  AND (i.total_amount - COALESCE(p.paid_amount_settled, 0)) > 0
ORDER BY i.due_date DESC
LIMIT 50
`;

// SQL to find candidate bank transactions for AR_OVERDUE
const FIND_BANK_TXN_CANDIDATES = `
SELECT
  bt.id as bank_transaction_id,
  bt.reference,
  bt.description,
  bt.amount,
  bt.transaction_date,
  bt.transaction_type,
  COALESCE(ms.match_state, 'unmatched') as match_state,
  COALESCE(ms.matched_amount, 0) as matched_amount,
  (ABS(bt.amount) - COALESCE(ms.matched_amount, 0)) as unmatched_amount
FROM public.bank_transactions bt
LEFT JOIN public.v_bank_txn_match_state ms
  ON ms.bank_transaction_id = bt.id AND ms.tenant_id = bt.tenant_id
WHERE bt.tenant_id = $1
  AND (ms.match_state IS NULL OR ms.match_state <> 'matched')
  AND bt.amount > 0
ORDER BY bt.transaction_date DESC
LIMIT 50
`;

interface Suggestion {
  id: string;
  tenant_id: string;
  exception_id: string;
  bank_transaction_id: string | null;
  invoice_id: string | null;
  suggestion_type: 'BANK_TO_INVOICE' | 'BANK_SPLIT_TO_INVOICES' | 'INVOICE_EXPECT_BANK';
  confidence: number;
  suggested_amount: number;
  currency: string;
  rationale: Record<string, unknown>;
}

function calculateConfidence(
  bankAmount: number,
  invoiceOutstanding: number,
  bankDescription: string | null,
  invoiceNumber: string | null,
  customerName: string | null,
  bankDate: string | null,
  invoiceDueDate: string | null
): { score: number; rationale: Record<string, unknown> } {
  let score = 0;
  const rationale: Record<string, unknown> = {};

  // Amount matching
  const amountDiff = Math.abs(bankAmount - invoiceOutstanding);
  const amountDiffPercent = invoiceOutstanding > 0 ? amountDiff / invoiceOutstanding : 1;

  if (amountDiffPercent <= 0.01) {
    score += 40;
    rationale.amountMatch = 'exact';
    rationale.amountMatchScore = 40;
  } else if (amountDiffPercent <= 0.05) {
    score += 25;
    rationale.amountMatch = 'close';
    rationale.amountMatchScore = 25;
  } else if (amountDiffPercent <= 0.10) {
    score += 10;
    rationale.amountMatch = 'approximate';
    rationale.amountMatchScore = 10;
  }

  // Description matching
  const descLower = (bankDescription || '').toLowerCase();
  const invNumLower = (invoiceNumber || '').toLowerCase();
  const custNameLower = (customerName || '').toLowerCase();

  if (invNumLower && descLower.includes(invNumLower)) {
    score += 30;
    rationale.descriptionMatch = 'invoice_number';
    rationale.descriptionMatchScore = 30;
  } else if (custNameLower && descLower.includes(custNameLower)) {
    score += 20;
    rationale.descriptionMatch = 'customer_name';
    rationale.descriptionMatchScore = 20;
  }

  // Date proximity
  if (bankDate && invoiceDueDate) {
    const bankDateObj = new Date(bankDate);
    const dueDateObj = new Date(invoiceDueDate);
    const daysDiff = Math.abs(
      (bankDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );
    rationale.dateProximityDays = Math.round(daysDiff);

    if (daysDiff <= 3) {
      score += 15;
      rationale.dateProximityScore = 15;
    } else if (daysDiff <= 7) {
      score += 10;
      rationale.dateProximityScore = 10;
    } else if (daysDiff <= 14) {
      score += 5;
      rationale.dateProximityScore = 5;
    }
  }

  return { score: Math.min(score, 100), rationale };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /reconciliation-suggestions/exception/{id} - Generate suggestions for exception
    if (req.method === "GET" && pathParts[1] === "exception" && pathParts[2]) {
      const exceptionId = pathParts[2];

      // Get exception details
      const { data: exception, error: exError } = await supabase
        .from("exceptions_queue")
        .select("*")
        .eq("id", exceptionId)
        .single();

      if (exError || !exception) {
        return new Response(
          JSON.stringify({ error: "Exception not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete old suggestions for this exception
      await supabase
        .from("reconciliation_suggestions")
        .delete()
        .eq("exception_id", exceptionId);

      const suggestions: Partial<Suggestion>[] = [];
      const tenantId = exception.tenant_id;

      if (exception.exception_type === "ORPHAN_BANK_TXN") {
        // Get bank transaction details
        const bankTxnId = exception.ref_id;
        const { data: bankTxn } = await supabase
          .from("bank_transactions")
          .select("*")
          .eq("id", bankTxnId)
          .single();

        if (bankTxn) {
          const bankAmount = Math.abs(bankTxn.amount);
          const tolerance = bankAmount * AMOUNT_TOLERANCE_PERCENT;

          // Find candidate invoices
          const { data: invoices } = await supabase.rpc("execute_readonly_query", {
            query_text: FIND_INVOICE_CANDIDATES,
            params: [tenantId]
          });

          // Fallback: direct query if RPC not available
          const { data: candidateInvoices } = await supabase
            .from("invoices")
            .select(`
              id,
              invoice_number,
              total_amount,
              due_date,
              issue_date,
              customers (name)
            `)
            .eq("tenant_id", tenantId)
            .neq("status", "paid")
            .order("due_date", { ascending: false })
            .limit(50);

          if (candidateInvoices) {
            for (const inv of candidateInvoices) {
              // Get settled amount from view
              const { data: settledData } = await supabase
                .from("v_invoice_settled_paid")
                .select("paid_amount_settled")
                .eq("invoice_id", inv.id)
                .eq("tenant_id", tenantId)
                .single();

              const paidAmount = settledData?.paid_amount_settled || 0;
              const outstanding = inv.total_amount - paidAmount;

              if (outstanding <= 0) continue;

              // Check amount tolerance
              if (Math.abs(bankAmount - outstanding) > tolerance * 2) continue;

              const customerName = (inv.customers as { name?: string })?.name || null;

              const { score, rationale } = calculateConfidence(
                bankAmount,
                outstanding,
                bankTxn.description,
                inv.invoice_number,
                customerName,
                bankTxn.transaction_date,
                inv.due_date
              );

              if (score >= 20) {
                suggestions.push({
                  tenant_id: tenantId,
                  exception_id: exceptionId,
                  bank_transaction_id: bankTxnId,
                  invoice_id: inv.id,
                  suggestion_type: "BANK_TO_INVOICE",
                  confidence: score,
                  suggested_amount: Math.min(bankAmount, outstanding),
                  currency: bankTxn.currency || "VND",
                  rationale: {
                    ...rationale,
                    bank_amount: bankAmount,
                    invoice_outstanding: outstanding,
                    invoice_number: inv.invoice_number,
                    customer_name: customerName,
                  },
                });
              }
            }
          }
        }
      } else if (exception.exception_type === "AR_OVERDUE") {
        // Get invoice details
        const invoiceId = exception.ref_id;
        const { data: invoice } = await supabase
          .from("invoices")
          .select(`
            *,
            customers (name)
          `)
          .eq("id", invoiceId)
          .single();

        if (invoice) {
          // Get outstanding amount
          const { data: settledData } = await supabase
            .from("v_invoice_settled_paid")
            .select("paid_amount_settled")
            .eq("invoice_id", invoiceId)
            .eq("tenant_id", tenantId)
            .single();

          const paidAmount = settledData?.paid_amount_settled || 0;
          const outstanding = invoice.total_amount - paidAmount;
          const tolerance = outstanding * AMOUNT_TOLERANCE_PERCENT;

          // Find candidate bank transactions
          const { data: bankTxns } = await supabase
            .from("bank_transactions")
            .select("*")
            .eq("tenant_id", tenantId)
            .gt("amount", 0)
            .order("transaction_date", { ascending: false })
            .limit(50);

          if (bankTxns) {
            for (const bt of bankTxns) {
              // Check if already fully matched
              const { data: matchState } = await supabase
                .from("v_bank_txn_match_state")
                .select("match_state, matched_amount")
                .eq("bank_transaction_id", bt.id)
                .eq("tenant_id", tenantId)
                .single();

              if (matchState?.match_state === "matched") continue;

              const availableAmount = bt.amount - (matchState?.matched_amount || 0);
              if (availableAmount <= 0) continue;

              // Check amount tolerance
              if (Math.abs(availableAmount - outstanding) > tolerance * 2) continue;

              const { score, rationale } = calculateConfidence(
                availableAmount,
                outstanding,
                bt.description,
                invoice.invoice_number,
                invoice.customers?.name,
                bt.transaction_date,
                invoice.due_date
              );

              if (score >= 20) {
                suggestions.push({
                  tenant_id: tenantId,
                  exception_id: exceptionId,
                  bank_transaction_id: bt.id,
                  invoice_id: invoiceId,
                  suggestion_type: "INVOICE_EXPECT_BANK",
                  confidence: score,
                  suggested_amount: Math.min(availableAmount, outstanding),
                  currency: bt.currency || "VND",
                  rationale: {
                    ...rationale,
                    bank_amount: availableAmount,
                    invoice_outstanding: outstanding,
                    bank_reference: bt.reference,
                  },
                });
              }
            }
          }
        }
      } else if (exception.exception_type === "PARTIAL_MATCH_STUCK") {
        // Similar logic to ORPHAN_BANK_TXN but with remaining amount
        const bankTxnId = exception.ref_id;
        const { data: bankTxn } = await supabase
          .from("bank_transactions")
          .select("*")
          .eq("id", bankTxnId)
          .single();

        if (bankTxn) {
          // Get current match state
          const { data: matchState } = await supabase
            .from("v_bank_txn_match_state")
            .select("matched_amount")
            .eq("bank_transaction_id", bankTxnId)
            .eq("tenant_id", tenantId)
            .single();

          const remainingAmount = Math.abs(bankTxn.amount) - (matchState?.matched_amount || 0);
          const tolerance = remainingAmount * AMOUNT_TOLERANCE_PERCENT;

          // Find invoices that could complete the match
          const { data: candidateInvoices } = await supabase
            .from("invoices")
            .select(`
              id,
              invoice_number,
              total_amount,
              due_date,
              customers (name)
            `)
            .eq("tenant_id", tenantId)
            .neq("status", "paid")
            .order("due_date", { ascending: false })
            .limit(50);

          if (candidateInvoices) {
            for (const inv of candidateInvoices) {
              const { data: settledData } = await supabase
                .from("v_invoice_settled_paid")
                .select("paid_amount_settled")
                .eq("invoice_id", inv.id)
                .eq("tenant_id", tenantId)
                .single();

              const paidAmount = settledData?.paid_amount_settled || 0;
              const outstanding = inv.total_amount - paidAmount;

              if (outstanding <= 0) continue;
              if (Math.abs(remainingAmount - outstanding) > tolerance * 2) continue;

              const custName = (inv.customers as { name?: string })?.name || null;

              const { score, rationale } = calculateConfidence(
                remainingAmount,
                outstanding,
                bankTxn.description,
                inv.invoice_number,
                custName,
                bankTxn.transaction_date,
                inv.due_date
              );

              if (score >= 20) {
                suggestions.push({
                  tenant_id: tenantId,
                  exception_id: exceptionId,
                  bank_transaction_id: bankTxnId,
                  invoice_id: inv.id,
                  suggestion_type: "BANK_TO_INVOICE",
                  confidence: score,
                  suggested_amount: Math.min(remainingAmount, outstanding),
                  currency: bankTxn.currency || "VND",
                  rationale: {
                    ...rationale,
                    remaining_bank_amount: remainingAmount,
                    invoice_outstanding: outstanding,
                    invoice_number: inv.invoice_number,
                    customer_name: custName,
                  },
                });
              }
            }
          }
        }
      }

      // Sort by confidence and limit
      suggestions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      const topSuggestions = suggestions.slice(0, 5);

      // Insert suggestions into DB
      if (topSuggestions.length > 0) {
        await supabase
          .from("reconciliation_suggestions")
          .insert(topSuggestions);
      }

      // Fetch inserted suggestions with full details
      const { data: savedSuggestions } = await supabase
        .from("reconciliation_suggestions")
        .select("*")
        .eq("exception_id", exceptionId)
        .order("confidence", { ascending: false });

      return new Response(
        JSON.stringify(savedSuggestions || []),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /reconciliation-suggestions/confirm - Confirm suggestion and create reconciliation
    if (req.method === "POST" && pathParts[1] === "confirm") {
      const body = await req.json();
      const { suggestionId } = body;

      if (!suggestionId) {
        return new Response(
          JSON.stringify({ error: "suggestionId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get auth user
      const authHeader = req.headers.get("Authorization");
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      // Get suggestion
      const { data: suggestion, error: sugError } = await supabase
        .from("reconciliation_suggestions")
        .select("*")
        .eq("id", suggestionId)
        .single();

      if (sugError || !suggestion) {
        return new Response(
          JSON.stringify({ error: "Suggestion not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get exception
      const { data: exception, error: exError } = await supabase
        .from("exceptions_queue")
        .select("*")
        .eq("id", suggestion.exception_id)
        .single();

      if (exError || !exception || exception.status === "resolved") {
        return new Response(
          JSON.stringify({ error: "Exception not found or already resolved" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create reconciliation_link
      const { data: reconLink, error: rlError } = await supabase
        .from("reconciliation_links")
        .insert({
          tenant_id: suggestion.tenant_id,
          bank_transaction_id: suggestion.bank_transaction_id,
          invoice_id: suggestion.invoice_id,
          match_type: "suggested",
          matched_amount: suggestion.suggested_amount,
          confidence: suggestion.confidence,
          matched_by: userId,
          match_source: "exception_suggestion",
          notes: `Auto-matched from exception suggestion. Rationale: ${JSON.stringify(suggestion.rationale)}`,
        })
        .select()
        .single();

      if (rlError) {
        console.error("Error creating reconciliation link:", rlError);
        return new Response(
          JSON.stringify({ error: rlError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create settlement_allocation
      const { error: saError } = await supabase
        .from("settlement_allocations")
        .insert({
          tenant_id: suggestion.tenant_id,
          reconciliation_link_id: reconLink.id,
          invoice_id: suggestion.invoice_id,
          allocated_amount: suggestion.suggested_amount,
          allocation_type: "principal",
        });

      if (saError) {
        console.error("Error creating settlement allocation:", saError);
        // Don't fail completely, reconciliation link was created
      }

      // Record outcome for calibration
      await supabase
        .from("reconciliation_suggestion_outcomes")
        .insert({
          tenant_id: suggestion.tenant_id,
          suggestion_id: suggestion.id,
          exception_id: suggestion.exception_id,
          outcome: "CONFIRMED_MANUAL",
          confidence_at_time: suggestion.confidence,
          final_result: "CORRECT",
          rationale_snapshot: suggestion.rationale,
          decided_by: userId,
          decided_at: new Date().toISOString(),
        });

      // Mark exception as resolved
      const { error: exUpdateError } = await supabase
        .from("exceptions_queue")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
          triage_notes: `Resolved via suggested reconciliation. Suggestion confidence: ${suggestion.confidence}%`,
        })
        .eq("id", exception.id);

      if (exUpdateError) {
        console.error("Error updating exception:", exUpdateError);
      }

      // Delete suggestion (cleanup)
      await supabase
        .from("reconciliation_suggestions")
        .delete()
        .eq("id", suggestionId);

      return new Response(
        JSON.stringify({
          success: true,
          reconciliation_link_id: reconLink.id,
          exception_resolved: !exUpdateError,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /reconciliation-suggestions/reject - Reject a suggestion
    if (req.method === "POST" && pathParts[1] === "reject") {
      const body = await req.json();
      const { suggestionId } = body;

      if (!suggestionId) {
        return new Response(
          JSON.stringify({ error: "suggestionId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const authHeader = req.headers.get("Authorization");
      let userId = null;
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      }

      // Get suggestion
      const { data: suggestion, error: sugError } = await supabase
        .from("reconciliation_suggestions")
        .select("*")
        .eq("id", suggestionId)
        .single();

      if (sugError || !suggestion) {
        return new Response(
          JSON.stringify({ error: "Suggestion not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record outcome for calibration
      await supabase
        .from("reconciliation_suggestion_outcomes")
        .insert({
          tenant_id: suggestion.tenant_id,
          suggestion_id: suggestion.id,
          exception_id: suggestion.exception_id,
          outcome: "REJECTED",
          confidence_at_time: suggestion.confidence,
          final_result: "INCORRECT",
          rationale_snapshot: suggestion.rationale,
          decided_by: userId,
          decided_at: new Date().toISOString(),
        });

      // Delete suggestion
      await supabase
        .from("reconciliation_suggestions")
        .delete()
        .eq("id", suggestionId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /reconciliation-suggestions/calibration - Get calibration stats
    if (req.method === "GET" && pathParts[1] === "calibration") {
      const tenantId = url.searchParams.get("tenant_id");

      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: "tenant_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get calibration stats
      const { data: stats, error: statsError } = await supabase
        .from("confidence_calibration_stats")
        .select("*")
        .eq("tenant_id", tenantId);

      if (statsError) {
        return new Response(
          JSON.stringify({ error: statsError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get recent outcomes for additional context
      const { data: outcomes } = await supabase
        .from("reconciliation_suggestion_outcomes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(100);

      // Calculate real-time stats from outcomes
      const outcomeStats = {
        total: outcomes?.length || 0,
        confirmed: outcomes?.filter(o => o.outcome === "CONFIRMED_MANUAL" || o.outcome === "AUTO_CONFIRMED").length || 0,
        rejected: outcomes?.filter(o => o.outcome === "REJECTED").length || 0,
        timed_out: outcomes?.filter(o => o.outcome === "TIMED_OUT").length || 0,
      };

      const empiricalSuccessRate = outcomeStats.total > 0 
        ? (outcomeStats.confirmed / outcomeStats.total) * 100 
        : 0;

      return new Response(
        JSON.stringify({
          calibration_stats: stats || [],
          recent_outcomes: outcomeStats,
          empirical_success_rate: Math.round(empiricalSuccessRate * 100) / 100,
          sample_size: outcomeStats.total,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Reconciliation suggestions error:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
