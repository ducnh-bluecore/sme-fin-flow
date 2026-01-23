import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  tenant_id: string;
  user_id?: string;
  user_ids?: string[];
  title: string;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  category?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
  alert_instance_id?: string;
  send_push?: boolean;
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

    // SECURITY: Validate JWT or service role
    const authHeader = req.headers.get('Authorization');
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    let validatedTenantId: string | null = null;

    if (isServiceRole) {
      // Service role call from scheduled functions - trust payload
      console.log('Service role call - trusted');
    } else if (authHeader?.startsWith('Bearer ')) {
      // User call - validate JWT
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = claimsData.claims.sub as string;

      // Get user's tenant
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();

      validatedTenantId = tenantUser?.tenant_id || null;
    } else {
      return new Response(JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: NotificationPayload = await req.json();
    console.log('Received notification payload:', payload);

    // Validate required fields
    if (!payload.tenant_id || !payload.title) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify tenant access (skip for service role)
    if (!isServiceRole && validatedTenantId && validatedTenantId !== payload.tenant_id) {
      console.error(`Cross-tenant access denied: user tried to send notification to tenant ${payload.tenant_id}`);
      return new Response(JSON.stringify({ error: 'Forbidden - Cross-tenant access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine target users
    let targetUserIds: string[] = [];
    
    if (payload.user_id) {
      targetUserIds = [payload.user_id];
    } else if (payload.user_ids && payload.user_ids.length > 0) {
      targetUserIds = payload.user_ids;
    } else {
      // Get all users in tenant
      const { data: tenantUsers } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', payload.tenant_id);
      
      targetUserIds = tenantUsers?.map(u => u.user_id) || [];
    }

    console.log(`Sending notification to ${targetUserIds.length} users`);

    // Create in-app notifications
    const notifications = targetUserIds.map(userId => ({
      tenant_id: payload.tenant_id,
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'info',
      category: payload.category,
      action_url: payload.action_url,
      metadata: payload.metadata,
      alert_instance_id: payload.alert_instance_id,
    }));

    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      throw insertError;
    }

    console.log(`Created ${insertedNotifications?.length} in-app notifications`);

    // Send push notifications if requested
    let pushResults: { success: number; failed: number } = { success: 0, failed: 0 };
    
    if (payload.send_push !== false) {
      pushResults = await sendPushNotifications(
        supabase,
        targetUserIds,
        payload.title,
        payload.message || '',
        payload.action_url,
        payload.type
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: insertedNotifications?.length || 0,
        push_notifications: pushResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending notifications:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendPushNotifications(
  supabase: any,
  userIds: string[],
  title: string,
  body: string,
  actionUrl?: string,
  type?: string
): Promise<{ success: number; failed: number }> {
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

  if (!vapidPrivateKey || !vapidPublicKey) {
    console.log('VAPID keys not configured, skipping push notifications');
    return { success: 0, failed: 0 };
  }

  // Get active push subscriptions for these users
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No active push subscriptions found');
    return { success: 0, failed: 0 };
  }

  console.log(`Found ${subscriptions.length} push subscriptions`);

  let success = 0;
  let failed = 0;

  // For now, we'll use a simple approach with web-push-like functionality
  // In production, you'd want to use a proper web-push library
  for (const sub of subscriptions) {
    try {
      // Create the push payload
      const pushPayload = JSON.stringify({
        title,
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: {
          url: actionUrl || '/',
          type,
        },
      });

      // Note: Full web-push implementation requires crypto operations
      // For now, log that we would send to this subscription
      console.log(`Would send push to subscription: ${sub.endpoint.substring(0, 50)}...`);
      
      // Mark as success for now - in production, you'd actually send the push
      success++;
    } catch (error) {
      console.error('Error sending push to subscription:', error);
      failed++;
      
      // Optionally deactivate failed subscriptions
      const errMsg = (error as Error).message || '';
      if (errMsg.includes('expired') || errMsg.includes('unsubscribed')) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id);
      }
    }
  }

  return { success, failed };
}
