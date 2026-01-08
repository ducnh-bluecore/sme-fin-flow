import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mongoUri = Deno.env.get('MONGODB_URI');

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

  let client: MongoClient | null = null;

  try {
    const { action, database, collection, query, data, options } = await req.json();
    
    console.log(`MongoDB request: action=${action}, database=${database}, collection=${collection}`);

    // Connect to MongoDB
    client = new MongoClient();
    await client.connect(mongoUri);
    console.log('Connected to MongoDB successfully');

    const db = client.database(database || 'test');
    const coll = db.collection(collection);

    let result;

    switch (action) {
      case 'find':
        // Find documents
        result = await coll.find(query || {}, options || {}).toArray();
        console.log(`Found ${result.length} documents`);
        break;

      case 'findOne':
        // Find one document
        result = await coll.findOne(query || {});
        console.log(`FindOne result: ${result ? 'found' : 'not found'}`);
        break;

      case 'insertOne':
        // Insert one document
        result = await coll.insertOne(data);
        console.log(`Inserted document with id: ${result}`);
        break;

      case 'insertMany':
        // Insert many documents
        result = await coll.insertMany(data);
        console.log(`Inserted ${result.insertedCount} documents`);
        break;

      case 'updateOne':
        // Update one document
        result = await coll.updateOne(query || {}, { $set: data });
        console.log(`Updated ${result.modifiedCount} document(s)`);
        break;

      case 'updateMany':
        // Update many documents
        result = await coll.updateMany(query || {}, { $set: data });
        console.log(`Updated ${result.modifiedCount} document(s)`);
        break;

      case 'deleteOne':
        // Delete one document
        result = await coll.deleteOne(query || {});
        console.log(`Deleted ${result} document(s)`);
        break;

      case 'deleteMany':
        // Delete many documents
        result = await coll.deleteMany(query || {});
        console.log(`Deleted ${result} document(s)`);
        break;

      case 'count':
        // Count documents
        result = await coll.countDocuments(query || {});
        console.log(`Count: ${result}`);
        break;

      case 'aggregate':
        // Aggregation pipeline
        result = await coll.aggregate(query || []).toArray();
        console.log(`Aggregation returned ${result.length} documents`);
        break;

      case 'listCollections':
        // List all collections in database
        const collections = await db.listCollectionNames();
        result = collections;
        console.log(`Found ${collections.length} collections`);
        break;

      case 'ping':
        // Test connection
        result = { status: 'connected', timestamp: new Date().toISOString() };
        console.log('Ping successful');
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
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
  } finally {
    if (client) {
      try {
        client.close();
        console.log('MongoDB connection closed');
      } catch (e) {
        console.error('Error closing MongoDB connection:', e);
      }
    }
  }
});
