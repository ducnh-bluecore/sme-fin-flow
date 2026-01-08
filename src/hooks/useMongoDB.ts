import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MongoQueryOptions {
  database?: string;
  collection: string;
  query?: Record<string, unknown> | Record<string, unknown>[];
  data?: Record<string, unknown> | Record<string, unknown>[];
  options?: Record<string, unknown>;
}

interface MongoResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * Execute a MongoDB query through the edge function
 */
async function executeMongoQuery<T = unknown>(
  action: string,
  options: MongoQueryOptions
): Promise<MongoResponse<T>> {
  const { data, error } = await supabase.functions.invoke('mongodb-query', {
    body: {
      action,
      database: options.database || 'cfo_dashboard',
      collection: options.collection,
      query: options.query,
      data: options.data,
      options: options.options,
    },
  });

  if (error) {
    console.error('MongoDB query error:', error);
    throw new Error(error.message);
  }

  return data as MongoResponse<T>;
}

/**
 * Hook to test MongoDB connection
 */
export function useMongoDBPing() {
  return useQuery({
    queryKey: ['mongodb', 'ping'],
    queryFn: async () => {
      const response = await executeMongoQuery('ping', { collection: 'test' });
      return response;
    },
    retry: 1,
    staleTime: 30000,
  });
}

/**
 * Hook to list collections in a database
 */
export function useMongoDBCollections(database?: string) {
  return useQuery({
    queryKey: ['mongodb', 'collections', database],
    queryFn: async () => {
      const response = await executeMongoQuery<string[]>('listCollections', {
        database,
        collection: 'system.namespaces',
      });
      return response.data || [];
    },
    retry: 1,
  });
}

/**
 * Hook to find documents in a collection
 */
export function useMongoDBFind<T = unknown>(
  collection: string,
  query?: Record<string, unknown>,
  options?: {
    database?: string;
    enabled?: boolean;
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
  }
) {
  return useQuery({
    queryKey: ['mongodb', 'find', collection, query, options],
    queryFn: async () => {
      const response = await executeMongoQuery<T[]>('find', {
        database: options?.database,
        collection,
        query,
        options: {
          limit: options?.limit,
          skip: options?.skip,
          sort: options?.sort,
        },
      });
      return response.data || [];
    },
    enabled: options?.enabled !== false,
    retry: 1,
  });
}

/**
 * Hook to find one document
 */
export function useMongoDBFindOne<T = unknown>(
  collection: string,
  query: Record<string, unknown>,
  options?: {
    database?: string;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['mongodb', 'findOne', collection, query],
    queryFn: async () => {
      const response = await executeMongoQuery<T>('findOne', {
        database: options?.database,
        collection,
        query,
      });
      return response.data || null;
    },
    enabled: options?.enabled !== false,
    retry: 1,
  });
}

/**
 * Hook to count documents
 */
export function useMongoDBCount(
  collection: string,
  query?: Record<string, unknown>,
  options?: {
    database?: string;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['mongodb', 'count', collection, query],
    queryFn: async () => {
      const response = await executeMongoQuery<number>('count', {
        database: options?.database,
        collection,
        query,
      });
      return response.data || 0;
    },
    enabled: options?.enabled !== false,
    retry: 1,
  });
}

/**
 * Hook to insert one document
 */
export function useMongoDBInsertOne(collection: string, database?: string) {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await executeMongoQuery('insertOne', {
        database,
        collection,
        data,
      });
      return response;
    },
  });
}

/**
 * Hook to insert many documents
 */
export function useMongoDBInsertMany(collection: string, database?: string) {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>[]) => {
      const response = await executeMongoQuery('insertMany', {
        database,
        collection,
        data,
      });
      return response;
    },
  });
}

/**
 * Hook to update one document
 */
export function useMongoDBUpdateOne(collection: string, database?: string) {
  return useMutation({
    mutationFn: async ({
      query,
      data,
    }: {
      query: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const response = await executeMongoQuery('updateOne', {
        database,
        collection,
        query,
        data,
      });
      return response;
    },
  });
}

/**
 * Hook to update many documents
 */
export function useMongoDBUpdateMany(collection: string, database?: string) {
  return useMutation({
    mutationFn: async ({
      query,
      data,
    }: {
      query: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      const response = await executeMongoQuery('updateMany', {
        database,
        collection,
        query,
        data,
      });
      return response;
    },
  });
}

/**
 * Hook to delete one document
 */
export function useMongoDBDeleteOne(collection: string, database?: string) {
  return useMutation({
    mutationFn: async (query: Record<string, unknown>) => {
      const response = await executeMongoQuery('deleteOne', {
        database,
        collection,
        query,
      });
      return response;
    },
  });
}

/**
 * Hook to delete many documents
 */
export function useMongoDBDeleteMany(collection: string, database?: string) {
  return useMutation({
    mutationFn: async (query: Record<string, unknown>) => {
      const response = await executeMongoQuery('deleteMany', {
        database,
        collection,
        query,
      });
      return response;
    },
  });
}

/**
 * Hook to run aggregation pipeline
 */
export function useMongoDBAggregate<T = unknown>(
  collection: string,
  pipeline: Record<string, unknown>[],
  options?: {
    database?: string;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['mongodb', 'aggregate', collection, pipeline],
    queryFn: async () => {
      const response = await executeMongoQuery<T[]>('aggregate', {
        database: options?.database,
        collection,
        query: pipeline,
      });
      return response.data || [];
    },
    enabled: options?.enabled !== false,
    retry: 1,
  });
}

/**
 * Generic mutation hook for any MongoDB action
 */
export function useMongoDBMutation() {
  return useMutation({
    mutationFn: async ({
      action,
      ...options
    }: { action: string } & MongoQueryOptions) => {
      const response = await executeMongoQuery(action, options);
      return response;
    },
  });
}
