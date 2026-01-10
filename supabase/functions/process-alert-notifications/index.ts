import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing alert notifications...');

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

    const results = {
      processed: 0,
      notifications_sent: 0,
      errors: [] as string[],
    };

    for (const alert of pendingAlerts || []) {
      try {
        const config = alert.extended_alert_configs;
        const channels = config?.notification_channels || { inApp: true };

        // Get users to notify based on recipient_role
        const { data: recipients } = await supabase
          .from('notification_recipients')
          .select('*')
          .eq('tenant_id', alert.tenant_id)
          .eq('is_active', true);

        // Filter by role if specified
        let targetRecipients = recipients || [];
        if (config?.recipient_role && config.recipient_role !== 'all') {
          targetRecipients = targetRecipients.filter(r => r.role === config.recipient_role);
        }

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
        if (channels.inApp !== false) {
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

        // Update alert as notified
        await supabase
          .from('alert_instances')
          .update({
            notification_sent: true,
            sent_at: new Date().toISOString(),
            sent_to: { user_ids: userIds },
            notification_channels: channels,
          })
          .eq('id', alert.id);

        results.processed++;
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        results.errors.push(`Alert ${alert.id}: ${(error as Error).message}`);
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
