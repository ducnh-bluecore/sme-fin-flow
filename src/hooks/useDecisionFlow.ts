import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenantId } from "./useActiveTenantId";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Constants
const IMPACT_THRESHOLD_FOR_APPROVAL = 50000000; // 50M VND

export type DecisionType = 'scale' | 'pause' | 'reduce' | 'investigate';
export type DecisionPriority = 'critical' | 'high' | 'medium';
export type DecisionEntityType = 'channel' | 'campaign';

export interface DecisionPayload {
  id: string;
  type: DecisionType;
  entity_type: DecisionEntityType;
  entity_name: string;
  entity_id: string;
  priority: DecisionPriority;
  headline: string;
  reason: string;
  impact_amount: number;
  deadline_hours: number;
  recommended_action: string;
  metrics?: { label: string; value: string; status: string }[];
  source_alert_id?: string; // If decision came from an alert
}

export interface DecisionResult {
  action: 'approved' | 'rejected' | 'snoozed';
  comment?: string;
  taskCreated?: boolean;
  approvalRequired?: boolean;
  alertResolved?: boolean;
  notificationSent?: boolean;
}

/**
 * Hook xử lý toàn bộ flow quyết định từ CMO Command Center
 * 
 * Flow:
 * 1. Lưu trạng thái quyết định vào auto_decision_card_states
 * 2. Nếu Impact < 50M → Tạo task cho Marketing Team
 * 3. Nếu Impact >= 50M → Gửi lên CEO/CFO phê duyệt (decision_analyses)
 * 4. Resolve alert liên quan (nếu có)
 * 5. Tạo alert thông báo quyết định mới
 * 6. Notify tất cả stakeholders
 */
export function useDecisionFlow() {
  const { data: tenantId } = useActiveTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const processDecision = useMutation({
    mutationFn: async ({
      decision,
      action,
      comment,
    }: {
      decision: DecisionPayload;
      action: 'approved' | 'rejected' | 'snoozed';
      comment?: string;
    }): Promise<DecisionResult> => {
      if (!tenantId || !user?.id) throw new Error("Missing tenant or user");

      const result: DecisionResult = {
        action,
        comment,
        taskCreated: false,
        approvalRequired: false,
        alertResolved: false,
        notificationSent: false,
      };

      const now = new Date().toISOString();

      // Step 1: Lưu trạng thái quyết định
      const status = action === 'approved' ? 'DECIDED' 
        : action === 'rejected' ? 'DISMISSED' 
        : 'SNOOZED';

      const snoozedUntil = action === 'snoozed' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
        : null;

      const { error: stateError } = await supabase.from("auto_decision_card_states").upsert(
        [
          {
            tenant_id: tenantId,
            auto_card_id: decision.id,
            status,
            decided_by: user.id,
            decided_at: now,
            dismiss_reason: action === 'rejected' ? (comment || 'Không thực hiện') : null,
            comment: comment || null,
            snoozed_until: snoozedUntil,
            card_snapshot: JSON.parse(JSON.stringify(decision)),
            updated_at: now,
          }
        ],
        { onConflict: "tenant_id,auto_card_id" }
      );
      if (stateError) throw stateError;

      // Nếu bỏ qua hoặc tạm hoãn, dừng ở đây
      if (action !== 'approved') {
        return result;
      }

      // Step 2 & 3: Phân loại theo impact
      const requiresApproval = decision.impact_amount >= IMPACT_THRESHOLD_FOR_APPROVAL;

      if (requiresApproval) {
        // Impact >= 50M → Gửi lên CEO/CFO phê duyệt
        await supabase.from("decision_analyses").insert({
          tenant_id: tenantId,
          created_by: user.id,
          analysis_type: `marketing_${decision.type}`,
          title: `[${decision.type.toUpperCase()}] ${decision.entity_name}`,
          description: decision.reason,
          parameters: {
            entity_type: decision.entity_type,
            entity_id: decision.entity_id,
            entity_name: decision.entity_name,
            decision_type: decision.type,
            impact_amount: decision.impact_amount,
            deadline_hours: decision.deadline_hours,
          },
          results: {
            metrics: decision.metrics || [],
            headline: decision.headline,
            recommended_action: decision.recommended_action,
          },
          recommendation: decision.recommended_action,
          ai_insights: `CMO đã phê duyệt quyết định này. Impact: ${formatCurrency(decision.impact_amount)}đ`,
          status: 'pending_approval',
          priority: decision.priority === 'critical' ? 'high' 
            : decision.priority === 'high' ? 'medium' 
            : 'low',
          deadline: new Date(Date.now() + decision.deadline_hours * 60 * 60 * 1000).toISOString(),
          impact: `${formatCurrency(decision.impact_amount)}đ - ${decision.headline}`,
        });
        result.approvalRequired = true;
      } else {
        // Impact < 50M → Tạo task cho Marketing Team
        const priorityMap: Record<DecisionPriority, string> = {
          critical: 'urgent',
          high: 'high',
          medium: 'medium',
        };

        await supabase.from("tasks").insert({
          tenant_id: tenantId,
          title: `[MKT-${decision.type.toUpperCase()}] ${decision.entity_name}`,
          description: `${decision.headline}\n\n${decision.reason}\n\nKhuyến nghị: ${decision.recommended_action}`,
          status: 'todo',
          priority: priorityMap[decision.priority] || 'medium',
          department: 'Marketing',
          source_type: 'cmo_decision',
          source_id: decision.id,
          due_date: new Date(Date.now() + decision.deadline_hours * 60 * 60 * 1000).toISOString(),
          created_by: user.id,
          metadata: {
            decision_type: decision.type,
            entity_type: decision.entity_type,
            entity_id: decision.entity_id,
            impact_amount: decision.impact_amount,
            approved_by_cmo: true,
            approved_at: now,
          },
        });
        result.taskCreated = true;
      }

      // Step 4: Resolve alert liên quan (nếu decision đến từ risk alert)
      if (decision.source_alert_id) {
        await supabase.from("alert_instances")
          .update({
            status: 'resolved',
            resolved_by: user.id,
            resolved_at: now,
            resolution_notes: `Đã xử lý qua CMO Decision: ${decision.type.toUpperCase()} - ${comment || decision.recommended_action}`,
          })
          .eq('id', decision.source_alert_id);
        result.alertResolved = true;
      }

      // Step 5: Tạo alert thông báo quyết định mới
      const decisionAlertTitle = requiresApproval
        ? `📋 Quyết định Marketing chờ duyệt: ${decision.entity_name}`
        : `✅ CMO đã quyết định: ${decision.type.toUpperCase()} ${decision.entity_name}`;

      const decisionAlertMessage = requiresApproval
        ? `CMO đã phê duyệt ${decision.type} cho ${decision.entity_name}. Impact: ${formatCurrency(decision.impact_amount)}đ. Đang chờ CEO/CFO phê duyệt cuối cùng.`
        : `Đã tạo task cho Marketing Team. ${decision.recommended_action}. Impact: ${formatCurrency(decision.impact_amount)}đ.`;

      await supabase.from("alert_instances").insert({
        tenant_id: tenantId,
        alert_type: 'cmo_decision',
        category: 'marketing',
        severity: decision.priority === 'critical' ? 'critical' : 'info',
        title: decisionAlertTitle,
        message: decisionAlertMessage,
        status: 'active',
        impact_amount: decision.impact_amount,
        impact_currency: 'VND',
        impact_description: decision.headline,
        suggested_action: requiresApproval ? 'CEO/CFO vui lòng review và phê duyệt' : 'Marketing team thực hiện theo task đã tạo',
        notification_channels: ['in_app', 'email'],
        metadata: {
          decision_type: decision.type,
          entity_type: decision.entity_type,
          entity_name: decision.entity_name,
          requires_approval: requiresApproval,
          decided_by: user.id,
          decided_at: now,
        },
      });
      result.notificationSent = true;

      return result;
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["auto-decision-card-states"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pending-decisions"] });
      queryClient.invalidateQueries({ queryKey: ["decision-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["alert-instances"] });
      queryClient.invalidateQueries({ queryKey: ["notification-center"] });
      queryClient.invalidateQueries({ queryKey: ["pending-tasks-count"] });

      // Show appropriate toast
      if (result.action === 'snoozed') {
        toast.info("Đã tạm hoãn 24h", { description: "Sẽ nhắc lại vào ngày mai" });
      } else if (result.action === 'rejected') {
        toast.info("Đã bỏ qua quyết định");
      } else if (result.approvalRequired) {
        toast.success("Đã gửi lên CEO/CFO phê duyệt", {
          description: "Impact > 50M cần approval từ cấp cao hơn",
          duration: 5000,
        });
      } else if (result.taskCreated) {
        toast.success("Đã tạo task cho Marketing Team", {
          description: "Quyết định được thực thi ngay",
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      console.error("Decision flow error:", error);
      toast.error("Không thể xử lý quyết định", {
        description: error.message,
      });
    },
  });

  return {
    processDecision,
    isProcessing: processDecision.isPending,
    IMPACT_THRESHOLD_FOR_APPROVAL,
  };
}

// Helper
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
}
