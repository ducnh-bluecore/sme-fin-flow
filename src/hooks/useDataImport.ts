import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import type { Database } from '@/integrations/supabase/types';

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
};

type ExpenseCategory = Database['public']['Enums']['expense_category'];

export function useDataImport() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  const importCustomers = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await supabase.from('customers').insert({
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
          const { error } = await supabase.from('vendors').insert({
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
          // Import to product_master instead of products (which was deleted)
          const { error } = await supabase.from('product_master').insert({
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
          // First look up customer by name
          let customerId: string | null = null;
          const customerName = row.customer_name || row.CustomerName || '';
          if (customerName) {
            const { data: customer } = await supabase
              .from('customers')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('name', customerName)
              .maybeSingle();
            customerId = customer?.id || null;
          }

          const { error } = await supabase.from('invoices').insert({
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
          const { error } = await supabase.from('bills').insert({
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
          const { error } = await supabase.from('bank_transactions').insert({
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

      // Valid expense categories from enum
      const validCategories: ExpenseCategory[] = ['cogs', 'depreciation', 'interest', 'logistics', 'marketing', 'other', 'rent', 'salary', 'tax', 'utilities'];
      
      for (const row of rows) {
        try {
          const rawCategory = (row.category || row.Category || 'other').toLowerCase();
          const category: ExpenseCategory = validCategories.includes(rawCategory as ExpenseCategory) 
            ? rawCategory as ExpenseCategory 
            : 'other';

          const { error } = await supabase.from('expenses').insert({
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
          // Try to find invoice by number
          let invoiceId: string | null = null;
          const invoiceNumber = row.invoice_number || row.InvoiceNumber;
          if (invoiceNumber) {
            const { data: invoice } = await supabase
              .from('invoices')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('invoice_number', invoiceNumber)
              .maybeSingle();
            invoiceId = invoice?.id || null;
          }

          const { error } = await supabase.from('payments').insert({
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
          const { error } = await supabase.from('revenues').insert({
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
          const { error } = await supabase.from('bank_accounts').insert({
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
          const { error } = await supabase.from('orders').insert({
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

  const importBudgets = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await supabase.from('budgets').insert({
            tenant_id: tenantId,
            name: row.name || row.Name || '',
            category: row.category || row.Category || 'other',
            period_type: row.period_type || row.PeriodType || 'monthly',
            period_year: parseInt(row.period_year || row.PeriodYear || new Date().getFullYear().toString()),
            period_month: row.period_month ? parseInt(row.period_month) : null,
            budgeted_amount: parseFloat(row.budgeted_amount || row.BudgetedAmount || '0') || 0,
            start_date: row.start_date || row.StartDate || new Date().toISOString().split('T')[0],
            end_date: row.end_date || row.EndDate || new Date().toISOString().split('T')[0],
            notes: row.notes || row.Notes || null,
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
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const importCashForecasts = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await supabase.from('cash_forecasts').insert({
            tenant_id: tenantId,
            forecast_date: row.forecast_date || row.ForecastDate || new Date().toISOString().split('T')[0],
            opening_balance: parseFloat(row.opening_balance || row.OpeningBalance || '0') || 0,
            inflows: parseFloat(row.inflows || row.Inflows || '0') || 0,
            outflows: parseFloat(row.outflows || row.Outflows || '0') || 0,
            closing_balance: parseFloat(row.closing_balance || row.ClosingBalance || '0') || 0,
            forecast_type: row.forecast_type || row.ForecastType || 'weekly',
            notes: row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.forecast_date}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.forecast_date}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-forecasts'] });
    }
  });

  const importGLAccounts = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };

      // Determine normal_balance based on account_type
      const getNormalBalance = (accountType: string): string => {
        const debitTypes = ['asset', 'expense'];
        return debitTypes.includes(accountType.toLowerCase()) ? 'debit' : 'credit';
      };
      
      for (const row of rows) {
        try {
          const accountType = row.account_type || row.AccountType || 'asset';
          
          const { error } = await supabase.from('gl_accounts').insert({
            tenant_id: tenantId,
            account_code: row.account_code || row.AccountCode || '',
            account_name: row.account_name || row.AccountName || '',
            account_type: accountType,
            normal_balance: getNormalBalance(accountType),
            is_active: row.is_active?.toLowerCase() !== 'false',
            description: row.description || row.Description || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.account_code}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.account_code}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
    }
  });

  const importBankCovenants = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await supabase.from('bank_covenants').insert({
            tenant_id: tenantId,
            lender_name: row.lender_name || row.LenderName || '',
            covenant_name: row.covenant_name || row.CovenantName || '',
            covenant_type: row.covenant_type || row.CovenantType || 'financial_ratio',
            threshold_value: parseFloat(row.threshold_value || row.ThresholdValue || '0') || 0,
            threshold_operator: row.threshold_operator || row.ThresholdOperator || '>=',
            current_value: parseFloat(row.current_value || row.CurrentValue || '0') || null,
            warning_threshold: parseFloat(row.warning_threshold || row.WarningThreshold || '0') || null,
            measurement_frequency: row.measurement_frequency || row.MeasurementFrequency || 'quarterly',
            next_measurement_date: row.next_measurement_date || row.NextMeasurementDate || null,
            is_active: row.is_active?.toLowerCase() !== 'false',
            notes: row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.covenant_name}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.covenant_name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-covenants'] });
    }
  });

  const importScenarios = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await supabase.from('scenarios').insert({
            tenant_id: tenantId,
            name: row.name || row.Name || '',
            description: row.description || row.Description || null,
            scenario_type: row.scenario_type || row.ScenarioType || 'forecast',
            base_year: parseInt(row.base_year || row.BaseYear || new Date().getFullYear().toString()),
            forecast_months: parseInt(row.forecast_months || row.ForecastMonths || '12') || 12,
            status: row.status || row.Status || 'draft',
            assumptions: row.assumptions ? JSON.parse(row.assumptions) : null,
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
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    }
  });

  const importStrategicInitiatives = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await supabase.from('strategic_initiatives').insert({
            tenant_id: tenantId,
            title: row.name || row.Name || row.title || row.Title || '',
            description: row.description || row.Description || null,
            category: row.category || row.Category || 'growth',
            status: row.status || row.Status || 'planning',
            priority: row.priority || row.Priority || 'medium',
            start_date: row.start_date || row.StartDate || null,
            end_date: row.target_date || row.TargetDate || row.end_date || row.EndDate || null,
            budget: parseFloat(row.budget_allocated || row.BudgetAllocated || row.budget || row.Budget || '0') || null,
            spent: parseFloat(row.budget_spent || row.BudgetSpent || row.spent || row.Spent || '0') || null,
            progress: parseInt(row.progress_percent || row.ProgressPercent || row.progress || row.Progress || '0') || 0,
            owner: row.owner_name || row.OwnerName || row.owner || row.Owner || null,
            notes: row.expected_impact || row.ExpectedImpact || row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.name || row.title}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.name || row.title}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-initiatives'] });
    }
  });

  const importJournalEntries = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          const { error } = await supabase.from('journal_entries').insert({
            tenant_id: tenantId,
            entry_number: row.entry_number || row.EntryNumber || `JE-${Date.now()}`,
            entry_date: row.entry_date || row.EntryDate || new Date().toISOString().split('T')[0],
            description: row.description || row.Description || '',
            reference: row.reference || row.Reference || null,
            entry_type: row.entry_type || row.EntryType || 'standard',
            status: row.status || row.Status || 'draft',
            total_debit: parseFloat(row.total_debit || row.TotalDebit || '0') || 0,
            total_credit: parseFloat(row.total_credit || row.TotalCredit || '0') || 0,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.entry_number}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.entry_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    }
  });

  const importCreditNotes = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          // Try to find customer by name
          let partyId: string | null = null;
          let partyName: string | null = null;
          const customerName = row.customer_name || row.CustomerName;
          if (customerName) {
            const { data: customer } = await supabase
              .from('customers')
              .select('id, name')
              .eq('tenant_id', tenantId)
              .eq('name', customerName)
              .maybeSingle();
            partyId = customer?.id || null;
            partyName = customer?.name || customerName;
          }

          // Use new adjustment_notes table
          const { error } = await supabase.from('adjustment_notes').insert({
            tenant_id: tenantId,
            note_type: 'credit_note',
            direction: 'customer',
            note_number: row.credit_note_number || row.CreditNoteNumber || `CN-${Date.now()}`,
            note_date: row.credit_note_date || row.CreditNoteDate || new Date().toISOString().split('T')[0],
            party_id: partyId,
            party_name: partyName,
            reason: row.reason || row.Reason || 'Điều chỉnh',
            description: row.description || row.Description || null,
            subtotal: parseFloat(row.subtotal || row.Subtotal || '0') || 0,
            tax_amount: parseFloat(row.vat_amount || row.VatAmount || '0') || 0,
            total_amount: parseFloat(row.total_amount || row.TotalAmount || '0') || 0,
            status: row.status || row.Status || 'draft',
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.credit_note_number}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.credit_note_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['adjustment-notes'] });
    }
  });

  const importDebitNotes = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          // Try to find customer by name
          let partyId: string | null = null;
          let partyName: string | null = null;
          const customerName = row.customer_name || row.CustomerName;
          if (customerName) {
            const { data: customer } = await supabase
              .from('customers')
              .select('id, name')
              .eq('tenant_id', tenantId)
              .eq('name', customerName)
              .maybeSingle();
            partyId = customer?.id || null;
            partyName = customer?.name || customerName;
          }

          // Use new adjustment_notes table
          const { error } = await supabase.from('adjustment_notes').insert({
            tenant_id: tenantId,
            note_type: 'debit_note',
            direction: 'customer',
            note_number: row.debit_note_number || row.DebitNoteNumber || `DN-${Date.now()}`,
            note_date: row.debit_note_date || row.DebitNoteDate || new Date().toISOString().split('T')[0],
            party_id: partyId,
            party_name: partyName,
            reason: row.reason || row.Reason || 'Điều chỉnh',
            description: row.description || row.Description || null,
            subtotal: parseFloat(row.subtotal || row.Subtotal || '0') || 0,
            tax_amount: parseFloat(row.vat_amount || row.VatAmount || '0') || 0,
            total_amount: parseFloat(row.total_amount || row.TotalAmount || '0') || 0,
            status: row.status || row.Status || 'draft',
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${row.debit_note_number}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.debit_note_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debit-notes'] });
      queryClient.invalidateQueries({ queryKey: ['adjustment-notes'] });
    }
  });

  // Import inventory items with product lookup from SSOT
  const importInventoryItems = useMutation({
    mutationFn: async (rows: Record<string, string>[]): Promise<ImportResult> => {
      if (!tenantId) throw new Error('Chưa chọn tenant');
      
      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      
      for (const row of rows) {
        try {
          // Lookup product by SKU to get product_id and auto-fill metadata
          const sku = row.sku || row.SKU || row.code || row.Code;
          let product: { id: string; name: string; category: string | null; cost_price: number | null } | null = null;
          
          if (sku) {
            const { data } = await supabase
              .from('products')
              .select('id, name, category, cost_price')
              .eq('tenant_id', tenantId)
              .eq('sku', sku)
              .maybeSingle();
            product = data;
          }
          
          const { error } = await supabase.from('inventory_items').insert({
            tenant_id: tenantId,
            product_id: product?.id || null,  // Link to products SSOT
            sku: sku || `SKU-${Date.now()}`,
            product_name: product?.name || row.product_name || row.ProductName || row.name || '',
            category: product?.category || row.category || row.Category || null,
            quantity: parseInt(row.quantity_on_hand || row.quantity || row.Quantity || '0') || 0,
            unit_cost: product?.cost_price || parseFloat(row.unit_cost || row.UnitCost || '0') || 0,
            received_date: row.last_received_date || row.received_date || row.ReceivedDate || new Date().toISOString().split('T')[0],
            last_sold_date: row.last_sold_date || row.LastSoldDate || null,
            warehouse_location: row.warehouse_location || row.WarehouseLocation || null,
            reorder_point: parseInt(row.reorder_point || row.ReorderPoint || '0') || null,
            status: 'active',
            notes: row.notes || row.Notes || null,
          });
          
          if (error) {
            result.failed++;
            result.errors.push(`${sku}: ${error.message}`);
          } else {
            result.success++;
          }
        } catch (e) {
          result.failed++;
          result.errors.push(`${row.sku}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    }
  });

  return {
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
    isReady: !!tenantId,
  };
}
