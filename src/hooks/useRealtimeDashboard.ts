/**
 * useRealtimeDashboard - Realtime subscription hook
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for client access
 * 
 * Note: Realtime subscriptions use the tenant-aware client but listen
 * to schema-level changes (public schema for now, will need adjustment
 * when tenant schemas are fully deployed)
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export function useRealtimeDashboard() {
  const queryClient = useQueryClient();
  const { client, isReady } = useTenantQueryBuilder();

  useEffect(() => {
    if (!isReady) return;

    // Channel cho bank_accounts
    const bankChannel = client
      .channel('bank-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
        },
        (payload) => {
          console.log('Bank accounts changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }
      )
      .subscribe();

    // Channel cho revenues
    const revenueChannel = client
      .channel('revenues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'revenues',
        },
        (payload) => {
          console.log('Revenues changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['revenues'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }
      )
      .subscribe();

    // Channel cho expenses
    const expenseChannel = client
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        (payload) => {
          console.log('Expenses changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }
      )
      .subscribe();

    // Channel cho cash_forecasts
    const forecastChannel = client
      .channel('cash-forecasts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_forecasts',
        },
        (payload) => {
          console.log('Cash forecasts changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['cash-forecasts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }
      )
      .subscribe();

    // Channel cho invoices
    const invoiceChannel = client
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
        },
        (payload) => {
          console.log('Invoices changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      client.removeChannel(bankChannel);
      client.removeChannel(revenueChannel);
      client.removeChannel(expenseChannel);
      client.removeChannel(forecastChannel);
      client.removeChannel(invoiceChannel);
    };
  }, [queryClient, client, isReady]);
}
