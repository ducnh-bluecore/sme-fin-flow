import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mongoUri = Deno.env.get('MONGODB_URI');

// Parse MongoDB URI to extract connection details
function parseMongoUri(uri: string) {
  try {
    const url = new URL(uri);
    return {
      host: url.hostname,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1).split('?')[0] || 'test',
      params: url.search
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!mongoUri) {
    console.error('MONGODB_URI is not configured');
    return new Response(
      JSON.stringify({ error: 'MongoDB connection not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { action, database, collection, query, data, options } = await req.json();
    
    console.log(`MongoDB request: action=${action}, database=${database}, collection=${collection}`);

    // Parse the URI to get connection info
    const connInfo = parseMongoUri(mongoUri);
    if (!connInfo) {
      throw new Error('Invalid MongoDB URI format');
    }

    const dbName = database || connInfo.database || 'test';

    // For ping action, just verify the URI is valid
    if (action === 'ping') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            status: 'uri_configured', 
            database: dbName,
            host: connInfo.host,
            timestamp: new Date().toISOString(),
            message: 'MongoDB URI is configured. Note: Direct TCP connections are limited in Edge Runtime. Consider using MongoDB Data API for full functionality.'
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other actions, we need MongoDB Data API
    // Check if Data API credentials are available
    const dataApiKey = Deno.env.get('MONGODB_DATA_API_KEY');
    const appId = Deno.env.get('MONGODB_APP_ID');

    if (!dataApiKey || !appId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'MongoDB Data API not configured',
          message: 'Direct MongoDB driver connections are not supported in Edge Runtime. Please configure MONGODB_DATA_API_KEY and MONGODB_APP_ID for full functionality.',
          uri_status: 'configured',
          host: connInfo.host
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use MongoDB Data API
    const dataApiUrl = `https://data.mongodb-api.com/app/${appId}/endpoint/data/v1/action`;
    
    let apiAction: string;
    let body: Record<string, unknown> = {
      dataSource: 'Cluster0', // Default cluster name, can be configured
      database: dbName,
      collection: collection,
    };

    switch (action) {
      case 'find':
        apiAction = 'find';
        body.filter = query || {};
        if (options?.limit) body.limit = options.limit;
        if (options?.skip) body.skip = options.skip;
        if (options?.sort) body.sort = options.sort;
        break;

      case 'findOne':
        apiAction = 'findOne';
        body.filter = query || {};
        break;

      case 'insertOne':
        apiAction = 'insertOne';
        body.document = data;
        break;

      case 'insertMany':
        apiAction = 'insertMany';
        body.documents = data;
        break;

      case 'updateOne':
        apiAction = 'updateOne';
        body.filter = query || {};
        body.update = { $set: data };
        break;

      case 'updateMany':
        apiAction = 'updateMany';
        body.filter = query || {};
        body.update = { $set: data };
        break;

      case 'deleteOne':
        apiAction = 'deleteOne';
        body.filter = query || {};
        break;

      case 'deleteMany':
        apiAction = 'deleteMany';
        body.filter = query || {};
        break;

      case 'aggregate':
        apiAction = 'aggregate';
        body.pipeline = query || [];
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(`${dataApiUrl}/${apiAction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': dataApiKey,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Data API request failed');
    }

    return new Response(
      JSON.stringify({ success: true, data: result.documents || result.document || result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const error = err as Error;
    console.error('MongoDB error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error',
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
