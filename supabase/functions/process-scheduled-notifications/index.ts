import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SECURITY: Service role required - scheduled function
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // SECURITY: Require service role key
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Service role required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing scheduled notifications...');

    const now = new Date();

    // Get all scheduled notifications that are due
    const { data: dueSchedules, error: schedulesError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', now.toISOString())
      .not('next_run_at', 'is', null);

    if (schedulesError) {
      console.error('Error fetching scheduled notifications:', schedulesError);
      throw schedulesError;
    }

    console.log(`Found ${dueSchedules?.length || 0} due scheduled notifications`);

    const results = {
      processed: 0,
      notifications_sent: 0,
      errors: [] as string[],
    };

    for (const schedule of dueSchedules || []) {
      try {
        // Get target users
        let targetUserIds: string[] = [];
        
        if (schedule.target_users && schedule.target_users.length > 0) {
          targetUserIds = schedule.target_users;
        } else {
          // Get all users in tenant
          const { data: tenantUsers } = await supabase
            .from('tenant_users')
            .select('user_id')
            .eq('tenant_id', schedule.tenant_id);
          
          targetUserIds = tenantUsers?.map(u => u.user_id) || [];
        }

        if (targetUserIds.length === 0) {
          console.log(`No users found for schedule ${schedule.id}, skipping`);
          continue;
        }

        // Create notifications for all target users
        const notifications = targetUserIds.map(userId => ({
          tenant_id: schedule.tenant_id,
          user_id: userId,
          title: schedule.title,
          message: schedule.message,
          type: schedule.type === 'reminder' ? 'info' : schedule.type,
          category: 'scheduled',
          metadata: {
            scheduled_notification_id: schedule.id,
            schedule_type: schedule.schedule_type,
          },
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error creating notifications:', notifError);
          results.errors.push(`Schedule ${schedule.id}: ${notifError.message}`);
        } else {
          results.notifications_sent += notifications.length;
        }

        // Calculate next run time
        const nextRunAt = calculateNextRun(schedule);

        // Update schedule
        const updateData: Record<string, any> = {
          last_run_at: now.toISOString(),
        };

        if (schedule.schedule_type === 'once') {
          // Deactivate one-time schedules
          updateData.is_active = false;
          updateData.next_run_at = null;
        } else {
          updateData.next_run_at = nextRunAt;
        }

        await supabase
          .from('scheduled_notifications')
          .update(updateData)
          .eq('id', schedule.id);

        results.processed++;
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        results.errors.push(`Schedule ${schedule.id}: ${(error as Error).message}`);
      }
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-scheduled-notifications:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateNextRun(schedule: any): string {
  const now = new Date();
  const [hours, minutes] = schedule.schedule_time.split(':').map(Number);
  
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (schedule.schedule_type) {
    case 'daily':
      // Move to tomorrow
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      // Move to next week on the specified day
      const targetDay = schedule.schedule_day_of_week ?? 0;
      nextRun.setDate(nextRun.getDate() + 7);
      // Adjust to correct day of week
      const daysUntilTarget = (targetDay - nextRun.getDay() + 7) % 7;
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;
    case 'monthly':
      // Move to next month on the specified day
      const targetDate = schedule.schedule_day_of_month ?? 1;
      nextRun = new Date(now.getFullYear(), now.getMonth() + 1, targetDate, hours, minutes);
      break;
  }

  return nextRun.toISOString();
}
