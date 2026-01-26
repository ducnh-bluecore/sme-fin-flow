/**
 * E2E Test Wrapper
 * 
 * Provides React context wrappers for testing components
 * with the E2E test tenant context.
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { E2E_TENANT } from '../fixtures/e2e-expected-values';

// Create a fresh QueryClient for each test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

interface E2ETestWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component that provides all necessary context for E2E testing
 */
export function E2ETestWrapper({ children, queryClient }: E2ETestWrapperProps) {
  const client = queryClient ?? createTestQueryClient();
  
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Create a wrapper function for renderHook
 */
export function createE2EWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };
}

/**
 * Mock tenant context for E2E testing
 */
export const mockE2ETenantContext = {
  tenantId: E2E_TENANT.id,
  tenantName: E2E_TENANT.name,
  tenantSlug: E2E_TENANT.slug,
  tenantPlan: E2E_TENANT.plan,
};

/**
 * Helper to wait for async operations in tests
 */
export async function waitForDataLoad(timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

/**
 * Helper to create mock Supabase response
 */
export function createMockSupabaseResponse<T>(data: T, error: null = null) {
  return { data, error };
}

/**
 * Helper to create mock Supabase error response
 */
export function createMockSupabaseError(message: string) {
  return { data: null, error: { message } };
}
