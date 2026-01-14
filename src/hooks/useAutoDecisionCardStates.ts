import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenantId } from "./useActiveTenantId";

export type AutoDecisionCardStateStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "DECIDED"
  | "DISMISSED"
  | "SNOOZED";

export interface AutoDecisionCardState {
  id: string;
  tenant_id: string;
  auto_card_id: string;
  status: AutoDecisionCardStateStatus;
  decided_by: string | null;
  decided_at: string | null;
  dismiss_reason: string | null;
  comment: string | null;
  snoozed_until: string | null;
  card_snapshot: any | null;
  created_at: string;
  updated_at: string;
}

export function useAutoDecisionCardStates() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ["auto-decision-card-states", tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as AutoDecisionCardState[];
      const { data, error } = await supabase
        .from("auto_decision_card_states")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AutoDecisionCardState[];
    },
    enabled: !!tenantId,
  });
}

export function useUpsertAutoDecisionCardState() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (payload: {
      autoCardId: string;
      status: AutoDecisionCardStateStatus;
      decidedBy?: string | null;
      decidedAt?: string | null;
      dismissReason?: string | null;
      comment?: string | null;
      snoozedUntil?: string | null;
      cardSnapshot?: any | null;
    }) => {
      if (!tenantId) throw new Error("Missing tenantId");

      const { error } = await supabase.from("auto_decision_card_states").upsert(
        {
          tenant_id: tenantId,
          auto_card_id: payload.autoCardId,
          status: payload.status,
          decided_by: payload.decidedBy ?? null,
          decided_at: payload.decidedAt ?? null,
          dismiss_reason: payload.dismissReason ?? null,
          comment: payload.comment ?? null,
          snoozed_until: payload.snoozedUntil ?? null,
          card_snapshot: payload.cardSnapshot ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,auto_card_id" }
      );

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-decision-card-states"] });
    },
  });
}
