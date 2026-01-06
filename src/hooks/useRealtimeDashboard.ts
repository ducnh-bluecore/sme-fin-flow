import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook để lắng nghe realtime updates từ các bảng quan trọng
 * và tự động invalidate queries khi dữ liệu thay đổi
 */
export function useRealtimeDashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Channel cho bank_accounts
    const bankChannel = supabase
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
    const revenueChannel = supabase
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
    const expenseChannel = supabase
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
    const forecastChannel = supabase
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
    const invoiceChannel = supabase
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
      supabase.removeChannel(bankChannel);
      supabase.removeChannel(revenueChannel);
      supabase.removeChannel(expenseChannel);
      supabase.removeChannel(forecastChannel);
      supabase.removeChannel(invoiceChannel);
    };
  }, [queryClient]);
}
