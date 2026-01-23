import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FCMNotificationPayload {
  tenant_id: string;
  user_id?: string;
  user_ids?: string[];
  title: string;
  body?: string;
  data?: Record<string, string>;
  image?: string;
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body?: string;
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: 'high' | 'normal';
      notification?: {
        sound?: string;
        click_action?: string;
      };
    };
    apns?: {
      payload?: {
        aps?: {
          sound?: string;
          badge?: number;
        };
      };
    };
  };
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendFCMMessage(
  projectId: string,
  accessToken: string,
  message: FCMMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('FCM error:', errorData);
      return { success: false, error: errorData.error?.message || 'Unknown error' };
    }

    const result = await response.json();
    console.log('FCM message sent:', result);
    return { success: true };
  } catch (error) {
    console.error('Error sending FCM message:', error);
    return { success: false, error: (error as Error).message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      console.log('Firebase not configured, skipping FCM');
      return new Response(
        JSON.stringify({ error: 'Firebase not configured', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Validate JWT or service role
    const authHeader = req.headers.get('Authorization');
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    let validatedTenantId: string | null = null;

    if (isServiceRole) {
      console.log('Service role call - trusted');
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = claimsData.claims.sub as string;
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

    const payload: FCMNotificationPayload = await req.json();
    console.log('Received FCM notification payload:', payload);

    if (!payload.tenant_id || !payload.title) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify tenant access (skip for service role)
    if (!isServiceRole && validatedTenantId && validatedTenantId !== payload.tenant_id) {
      console.error(`Cross-tenant access denied: user tried to send FCM to tenant ${payload.tenant_id}`);
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
      const { data: tenantUsers } = await supabase
        .from('tenant_users')
        .select('user_id')
        .eq('tenant_id', payload.tenant_id);
      targetUserIds = tenantUsers?.map(u => u.user_id) || [];
    }

    // Get Capacitor push subscriptions (where auth_key = 'capacitor')
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)
      .eq('is_active', true)
      .eq('auth_key', 'capacitor');

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active Capacitor push subscriptions found');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} Capacitor push subscriptions`);

    // Get access token
    const accessToken = await getAccessToken(serviceAccountJson);

    let successCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      // Extract token from endpoint (fcm://{token})
      const token = sub.endpoint.replace('fcm://', '');
      
      const message: FCMMessage = {
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
            image: payload.image,
          },
          data: payload.data,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        },
      };

      const result = await sendFCMMessage(projectId, accessToken, message);
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        // Deactivate invalid tokens
        if (result.error?.includes('UNREGISTERED') || result.error?.includes('INVALID')) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending FCM notifications:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
