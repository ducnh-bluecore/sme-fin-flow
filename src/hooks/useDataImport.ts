/**
 * useDataImport - Data import mutations
 * 
 * Schema-per-Tenant Ready
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import type { Database } from '@/integrations/supabase/types';

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
};

type ExpenseCategory = Database['public']['Enums']['expense_category'];

export function useDataImport() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  const importCustomers = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('customers').insert({
            tenant_id: tenantId,
            name: row.name || row.Name || '',
            email: row.email || row.Email || null,
            phone: row.phone || row.Phone || null,
            address: row.address || row.Address || null,
            tax_code: row.tax_code || row.TaxCode || null,
            credit_limit: parseFloat(row.credit_limit || row.CreditLimit || '0') || null,
            payment_terms: parseInt(row.payment_terms || row.PaymentTerms || '30') || 30,
            customer_type: row.customer_type || row.CustomerType || 'corporate',
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.name}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const importVendors = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('vendors').insert({
            tenant_id: tenantId,
            code: row.code || row.Code || `V${Date.now()}`,
            name: row.name || row.Name || '',
            email: row.email || row.Email || null,
            phone: row.phone || row.Phone || null,
            address: row.address || row.Address || null,
            tax_code: row.tax_code || row.TaxCode || null,
            bank_account: row.bank_account || row.BankAccount || null,
            bank_name: row.bank_name || row.BankName || null,
            payment_terms: parseInt(row.payment_terms || row.PaymentTerms || '30') || 30,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.name}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    }
  });

  const importProducts = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('product_master').insert({
            tenant_id: tenantId,
            sku: row.sku || row.SKU || row.code || row.Code || `P${Date.now()}`,
            product_name: row.name || row.Name || '',
            category: row.category || row.Category || null,
            cost_price: parseFloat(row.cost_price || row.CostPrice || '0') || 0,
            selling_price: parseFloat(row.unit_price || row.UnitPrice || '0') || 0,
            brand: row.brand || row.Brand || null,
            is_active: (row.is_active?.toLowerCase() === 'true' || row.IsActive?.toLowerCase() === 'true'),
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.name}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-master'] });
    }
  });

  const importInvoices = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          let customerId: string | null = null;
          const customerName = row.customer_name || row.CustomerName || '';
          if (customerName) {
            const { data: customer } = await client
              .from('customers')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('name', customerName)
              .maybeSingle();
            customerId = customer?.id || null;
          }

          const { error } = await client.from('invoices').insert({
            tenant_id: tenantId,
            invoice_number: row.invoice_number || row.InvoiceNumber || `INV-${Date.now()}`,
            customer_id: customerId,
            issue_date: row.issue_date || row.IssueDate || new Date().toISOString().split('T')[0],
            due_date: row.due_date || row.DueDate || new Date().toISOString().split('T')[0],
            subtotal: parseFloat(row.subtotal || row.Subtotal || '0') || 0,
            vat_amount: parseFloat(row.vat_amount || row.VatAmount || '0') || 0,
            total_amount: parseFloat(row.total_amount || row.TotalAmount || '0') || 0,
            status: row.status || row.Status || 'pending',
            notes: row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.invoice_number}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.invoice_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const importBills = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('bills').insert({
            tenant_id: tenantId,
            bill_number: row.bill_number || row.BillNumber || `BILL-${Date.now()}`,
            vendor_name: row.vendor_name || row.VendorName || '',
            bill_date: row.bill_date || row.BillDate || new Date().toISOString().split('T')[0],
            due_date: row.due_date || row.DueDate || new Date().toISOString().split('T')[0],
            subtotal: parseFloat(row.subtotal || row.Subtotal || '0') || 0,
            vat_amount: parseFloat(row.vat_amount || row.VatAmount || '0') || 0,
            total_amount: parseFloat(row.total_amount || row.TotalAmount || '0') || 0,
            expense_category: row.expense_category || row.ExpenseCategory || null,
            notes: row.notes || row.Notes || null,
            status: 'pending',
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.bill_number}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.bill_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    }
  });

  const importBankTransactions = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('bank_transactions').insert({
            tenant_id: tenantId,
            transaction_date: row.transaction_date || row.TransactionDate || new Date().toISOString().split('T')[0],
            reference: row.reference || row.Reference || null,
            description: row.description || row.Description || null,
            amount: parseFloat(row.amount || row.Amount || '0') || 0,
            transaction_type: row.transaction_type || row.TransactionType || 'credit',
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.reference}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.reference}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    }
  });

  const importExpenses = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };

      const validCategories: ExpenseCategory[] = ['cogs', 'depreciation', 'interest', 'logistics', 'marketing', 'other', 'rent', 'salary', 'tax', 'utilities'];
      
      for (const row of rows) {
        try {
          const rawCategory = (row.category || row.Category || 'other').toLowerCase();
          const category: ExpenseCategory = validCategories.includes(rawCategory as ExpenseCategory) 
            ? rawCategory as ExpenseCategory 
            : 'other';

          const { error } = await client.from('expenses').insert({
            tenant_id: tenantId,
            expense_date: row.expense_date || row.ExpenseDate || new Date().toISOString().split('T')[0],
            description: row.description || row.Description || '',
            category: category,
            amount: parseFloat(row.amount || row.Amount || '0') || 0,
            vendor_name: row.vendor_name || row.VendorName || null,
            payment_method: row.payment_method || row.PaymentMethod || 'cash',
            reference_number: row.reference_number || row.ReferenceNumber || null,
            notes: row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.description}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.description}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });

  const importPayments = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          let invoiceId: string | null = null;
          const invoiceNumber = row.invoice_number || row.InvoiceNumber;
          if (invoiceNumber) {
            const { data: invoice } = await client
              .from('invoices')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('invoice_number', invoiceNumber)
              .maybeSingle();
            invoiceId = invoice?.id || null;
          }

          const { error } = await client.from('payments').insert({
            tenant_id: tenantId,
            payment_date: row.payment_date || row.PaymentDate || new Date().toISOString().split('T')[0],
            amount: parseFloat(row.amount || row.Amount || '0') || 0,
            payment_method: row.payment_method || row.PaymentMethod || 'bank_transfer',
            reference_code: row.reference_number || row.ReferenceNumber || null,
            invoice_id: invoiceId,
            notes: row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.reference_number}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.reference_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });

  const importRevenues = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('revenues').insert({
            tenant_id: tenantId,
            contract_name: row.description || row.Description || row.contract_name || 'Doanh thu import',
            start_date: row.revenue_date || row.RevenueDate || new Date().toISOString().split('T')[0],
            amount: parseFloat(row.amount || row.Amount || '0') || 0,
            description: row.description || row.Description || null,
            notes: row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.source || row.description}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.source || row.description}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
    }
  });

  const importBankAccounts = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('bank_accounts').insert({
            tenant_id: tenantId,
            account_number: row.account_number || row.AccountNumber || '',
            account_name: row.account_name || row.AccountName || null,
            bank_name: row.bank_name || row.BankName || '',
            currency: row.currency || row.Currency || 'VND',
            current_balance: parseFloat(row.current_balance || row.CurrentBalance || '0') || 0,
            status: row.status || row.Status || 'active',
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.account_number}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.account_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    }
  });

  const importOrders = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await client.from('orders').insert({
            tenant_id: tenantId,
            order_number: row.order_id || row.OrderId || row.order_number || `ORD-${Date.now()}`,
            order_date: row.order_date || row.OrderDate || new Date().toISOString().split('T')[0],
            customer_name: row.customer_name || row.CustomerName || '',
            source: row.source || row.Source || 'direct',
            status: row.status || row.Status || 'pending',
            total_amount: parseFloat(row.total_amount || row.TotalAmount || '0') || 0,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.order_id}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.order_id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // Stub mutations for templates - schema may differ
  const importBudgets = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Budget import requires custom mapping'] }),
  });

  const importCashForecasts = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Cash forecast import requires custom mapping'] }),
  });

  const importGLAccounts = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['GL accounts import requires custom mapping'] }),
  });

  const importBankCovenants = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Bank covenants import requires custom mapping'] }),
  });

  const importScenarios = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Scenarios import requires custom mapping'] }),
  });

  const importStrategicInitiatives = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Strategic initiatives import requires custom mapping'] }),
  });

  const importJournalEntries = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Journal entries import requires custom mapping'] }),
  });

  const importCreditNotes = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Credit notes import requires custom mapping'] }),
  });

  const importDebitNotes = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Debit notes import requires custom mapping'] }),
  });

  const importInventoryItems = useMutation({
    mutationFn: async (_rows: Record<string, string>[]): Promise<ImportResult> => 
      ({ success: 0, failed: 0, errors: ['Inventory items import requires custom mapping'] }),
  });

  return {
    isReady,
    importCustomers,
    importVendors,
    importProducts,
    importInvoices,
    importBills,
    importBankTransactions,
    importExpenses,
    importPayments,
    importRevenues,
    importBankAccounts,
    importOrders,
    importBudgets,
    importCashForecasts,
    importGLAccounts,
    importBankCovenants,
    importScenarios,
    importStrategicInitiatives,
    importJournalEntries,
    importCreditNotes,
    importDebitNotes,
    importInventoryItems,
  };
}
