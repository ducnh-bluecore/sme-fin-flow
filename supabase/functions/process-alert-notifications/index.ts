import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRule {
  id: string;
  tenant_id: string;
  name: string;
  severity: string;
  escalate_after_minutes: number;
  escalate_to_role: string;
  notify_channels: string[];
  is_active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing alert notifications with escalation...');

    // Get all active alert instances that haven't been notified
    const { data: pendingAlerts, error: alertsError } = await supabase
      .from('alert_instances')
      .select(`
        *,
        extended_alert_configs:alert_config_id (
          notification_channels,
          recipient_role
        )
      `)
      .eq('status', 'active')
      .eq('notification_sent', false)
      .limit(100);

    if (alertsError) {
      console.error('Error fetching pending alerts:', alertsError);
      throw alertsError;
    }

    console.log(`Found ${pendingAlerts?.length || 0} pending alerts`);

    // Get alerts that need escalation (acknowledged but not resolved, past escalation time)
    const { data: alertsToEscalate, error: escalateError } = await supabase
      .from('alert_instances')
      .select('*')
      .eq('status', 'acknowledged')
      .is('resolved_at', null)
      .limit(100);

    if (escalateError) {
      console.error('Error fetching alerts to escalate:', escalateError);
    }

    const results = {
      processed: 0,
      notifications_sent: 0,
      escalated: 0,
      errors: [] as string[],
    };

    // Process pending alerts
    for (const alert of pendingAlerts || []) {
      try {
        const config = alert.extended_alert_configs;
        const channels = config?.notification_channels || { inApp: true };

        // Get escalation rules for this tenant and severity
        const { data: escalationRules } = await supabase
          .from('alert_escalation_rules')
          .select('*')
          .eq('tenant_id', alert.tenant_id)
          .eq('severity', alert.severity)
          .eq('is_active', true)
          .order('escalate_after_minutes', { ascending: true })
          .limit(1);

        const escalationRule = escalationRules?.[0] as EscalationRule | undefined;

        // Get recipients based on escalation rule or default
        let targetRole = config?.recipient_role || 'all';
        let notifyChannels = channels;

        if (escalationRule) {
          targetRole = escalationRule.escalate_to_role;
          notifyChannels = {
            inApp: escalationRule.notify_channels.includes('push'),
            email: escalationRule.notify_channels.includes('email'),
            sms: escalationRule.notify_channels.includes('sms'),
            slack: escalationRule.notify_channels.includes('slack'),
          };
        }

        // Get recipients based on alert_rule_recipients if exists
        const { data: ruleRecipients } = await supabase
          .from('alert_rule_recipients')
          .select(`
            *,
            notification_recipients (*)
          `)
          .eq('tenant_id', alert.tenant_id);

        // Get user IDs from tenant_users
        const { data: tenantUsers } = await supabase
          .from('tenant_users')
          .select('user_id')
          .eq('tenant_id', alert.tenant_id);

        const userIds = tenantUsers?.map(u => u.user_id) || [];

        if (userIds.length === 0) {
          console.log(`No users found for tenant ${alert.tenant_id}, skipping`);
          continue;
        }

        // Create in-app notifications
        if (notifyChannels.inApp !== false) {
          const notifications = userIds.map(userId => ({
            tenant_id: alert.tenant_id,
            user_id: userId,
            title: alert.title,
            message: alert.message,
            type: alert.severity === 'critical' ? 'error' : 
                  alert.severity === 'warning' ? 'warning' : 'info',
            category: 'alert',
            action_url: alert.action_url,
            alert_instance_id: alert.id,
            metadata: {
              alert_type: alert.alert_type,
              category: alert.category,
              severity: alert.severity,
              escalation_rule: escalationRule?.name,
            },
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error('Error creating notifications:', notifError);
            results.errors.push(`Alert ${alert.id}: ${notifError.message}`);
          } else {
            results.notifications_sent += notifications.length;
          }
        }

        // Update alert as notified with escalation info
        await supabase
          .from('alert_instances')
          .update({
            notification_sent: true,
            sent_at: new Date().toISOString(),
            sent_to: { user_ids: userIds },
            notification_channels: notifyChannels,
            metadata: {
              ...alert.metadata,
              escalation_rule_id: escalationRule?.id,
              escalation_after_minutes: escalationRule?.escalate_after_minutes,
            },
          })
          .eq('id', alert.id);

        results.processed++;
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        results.errors.push(`Alert ${alert.id}: ${(error as Error).message}`);
      }
    }

    // Process escalations for acknowledged alerts
    for (const alert of alertsToEscalate || []) {
      try {
        const acknowledgedAt = new Date(alert.acknowledged_at);
        const now = new Date();
        const minutesSinceAck = (now.getTime() - acknowledgedAt.getTime()) / (1000 * 60);

        // Get escalation rule for this severity
        const { data: escalationRules } = await supabase
          .from('alert_escalation_rules')
          .select('*')
          .eq('tenant_id', alert.tenant_id)
          .eq('severity', alert.severity)
          .eq('is_active', true)
          .order('escalate_after_minutes', { ascending: true });

        const applicableRule = (escalationRules as EscalationRule[] || [])
          .find(rule => minutesSinceAck >= rule.escalate_after_minutes);

        if (applicableRule && !alert.metadata?.escalated_to?.includes(applicableRule.id)) {
          console.log(`Escalating alert ${alert.id} using rule ${applicableRule.name}`);

          // Get users with the target role
          const { data: tenantUsers } = await supabase
            .from('tenant_users')
            .select('user_id')
            .eq('tenant_id', alert.tenant_id);

          const userIds = tenantUsers?.map(u => u.user_id) || [];

          // Create escalation notifications
          const notifications = userIds.map(userId => ({
            tenant_id: alert.tenant_id,
            user_id: userId,
            title: `⬆️ Leo thang: ${alert.title}`,
            message: `Cảnh báo chưa được xử lý sau ${applicableRule.escalate_after_minutes} phút. ${alert.message}`,
            type: 'error',
            category: 'escalation',
            action_url: alert.action_url,
            alert_instance_id: alert.id,
            metadata: {
              original_severity: alert.severity,
              escalation_rule: applicableRule.name,
              escalate_to_role: applicableRule.escalate_to_role,
            },
          }));

          await supabase.from('notifications').insert(notifications);

          // Update alert metadata to track escalation
          const escalatedTo = alert.metadata?.escalated_to || [];
          await supabase
            .from('alert_instances')
            .update({
              metadata: {
                ...alert.metadata,
                escalated_to: [...escalatedTo, applicableRule.id],
                last_escalation_at: now.toISOString(),
              },
            })
            .eq('id', alert.id);

          results.escalated++;
        }
      } catch (error) {
        console.error(`Error escalating alert ${alert.id}:`, error);
        results.errors.push(`Escalate ${alert.id}: ${(error as Error).message}`);
      }
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-alert-notifications:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
