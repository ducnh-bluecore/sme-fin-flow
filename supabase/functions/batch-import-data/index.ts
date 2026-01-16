import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const INTEGRATION_ID = 'aaaa0001-0001-0001-0001-000000000001';
const BATCH_SIZE = 500;

const CHANNELS = ['Shopee', 'Lazada', 'TikTok Shop', 'Sendo', 'Website'];
const CHANNEL_WEIGHTS = [0.35, 0.25, 0.20, 0.10, 0.10];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray<T>(arr: T[], weights?: number[]): T {
  if (weights) {
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < arr.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) return arr[i];
    }
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(date: Date): string {
  return date.toISOString();
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Generate orders for a month with correct schema
function generateOrdersForMonth(
  year: number, 
  month: number, 
  products: any[],
  ordersPerDay: number
): { orders: any[], items: any[] } {
  const orders: any[] = [];
  const items: any[] = [];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'cancelled', 'returned'];
  const statusWeights = [0.75, 0.10, 0.05, 0.05, 0.03, 0.02];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dailyVariance = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;
    const actualOrdersToday = Math.round(ordersPerDay * dailyVariance * (0.8 + Math.random() * 0.4));
    
    for (let o = 0; o < actualOrdersToday; o++) {
      const orderId = crypto.randomUUID();
      const channel = randomFromArray(CHANNELS, CHANNEL_WEIGHTS);
      const status = randomFromArray(statuses, statusWeights);
      const orderDate = new Date(year, month, day, randomBetween(8, 22), randomBetween(0, 59));
      
      const itemCount = randomBetween(1, 4);
      let orderTotal = 0;
      let orderCogs = 0;
      const selectedProducts = new Set<number>();
      
      for (let i = 0; i < itemCount; i++) {
        let productIndex: number;
        do {
          productIndex = randomBetween(0, products.length - 1);
        } while (selectedProducts.has(productIndex) && selectedProducts.size < products.length);
        selectedProducts.add(productIndex);
        
        const product = products[productIndex];
        const quantity = randomBetween(1, 3);
        const unitPrice = Number(product.selling_price) || 150000;
        const unitCogs = Number(product.cost_price) || 70000;
        const totalAmount = unitPrice * quantity;
        const totalCogs = unitCogs * quantity;
        
        const platformFeeRate = channel === 'Website' ? 0.02 : randomBetween(12, 18) / 100;
        const grossProfit = totalAmount - totalCogs - (totalAmount * platformFeeRate);
        const marginPercent = totalAmount > 0 ? (grossProfit / totalAmount) * 100 : 0;
        
        items.push({
          id: crypto.randomUUID(),
          tenant_id: TENANT_ID,
          external_order_id: orderId,
          sku: product.external_sku,
          product_name: product.name,
          quantity,
          unit_price: unitPrice,
          unit_cogs: unitCogs,
          total_amount: totalAmount,
          total_cogs: totalCogs,
          gross_profit: grossProfit,
          margin_percent: marginPercent,
          is_returned: status === 'returned',
          created_at: formatDate(orderDate),
        });
        
        orderTotal += totalAmount;
        orderCogs += totalCogs;
      }
      
      const platformFeeRate = channel === 'Website' ? 0.02 : randomBetween(12, 18) / 100;
      const platformFee = Math.round(orderTotal * platformFeeRate * 0.6);
      const commissionFee = Math.round(orderTotal * platformFeeRate * 0.3);
      const paymentFee = Math.round(orderTotal * 0.015);
      const shippingFee = randomBetween(15000, 45000);
      
      orders.push({
        id: orderId,
        tenant_id: TENANT_ID,
        integration_id: INTEGRATION_ID,
        external_order_id: `EXT-${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(o + 1).padStart(5, '0')}`,
        order_number: `ORD-${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(o + 1).padStart(4, '0')}`,
        channel,
        status,
        order_date: formatDate(orderDate),
        total_amount: orderTotal,
        subtotal: orderTotal,
        cost_of_goods: orderCogs,
        platform_fee: platformFee,
        commission_fee: commissionFee,
        payment_fee: paymentFee,
        shipping_fee: shippingFee,
        gross_profit: orderTotal - orderCogs - platformFee - commissionFee - paymentFee - shippingFee,
        created_at: formatDate(orderDate),
      });
    }
  }
  
  return { orders, items };
}

// Generate channel fees with correct schema
function generateChannelFees(startDate: Date, months: number) {
  const fees: any[] = [];
  const feeTypes = ['commission', 'service', 'payment', 'shipping', 'ads', 'promotion'];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    for (const channel of CHANNELS) {
      if (channel === 'Website') continue;
      
      for (const feeType of feeTypes) {
        const baseAmount = feeType === 'ads' ? randomBetween(5000000, 20000000) :
                          feeType === 'promotion' ? randomBetween(2000000, 10000000) :
                          randomBetween(1000000, 5000000);
        
        fees.push({
          id: crypto.randomUUID(),
          tenant_id: TENANT_ID,
          integration_id: INTEGRATION_ID,
          fee_type: feeType,
          fee_category: channel,
          amount: baseAmount,
          description: `${feeType} fee for ${channel}`,
          fee_date: formatDateOnly(new Date(date.getFullYear(), date.getMonth(), 15)),
          period_start: formatDateOnly(new Date(date.getFullYear(), date.getMonth(), 1)),
          period_end: formatDateOnly(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  
  return fees;
}

// Generate campaigns with correct schema
function generateCampaigns(startDate: Date, months: number) {
  const campaigns: any[] = [];
  const campaignTypes = ['flash_sale', 'brand_day', 'mega_sale', 'clearance', 'new_arrival', 'seasonal'];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    const campaignCount = randomBetween(2, 4);
    
    for (let c = 0; c < campaignCount; c++) {
      const campaignStart = new Date(date.getFullYear(), date.getMonth(), randomBetween(1, 20));
      const duration = randomBetween(3, 10);
      const campaignEnd = new Date(campaignStart);
      campaignEnd.setDate(campaignEnd.getDate() + duration);
      
      const channel = randomFromArray(CHANNELS, CHANNEL_WEIGHTS);
      const budget = randomBetween(10000000, 100000000);
      const spent = Math.round(budget * (0.7 + Math.random() * 0.3));
      const revenue = Math.round(spent * (2 + Math.random() * 5));
      const orders = Math.round(revenue / randomBetween(200000, 500000));
      const discount = Math.round(revenue * 0.05);
      
      campaigns.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        campaign_name: `${randomFromArray(campaignTypes)} ${date.getMonth() + 1}/${date.getFullYear()} - ${channel}`,
        channel,
        campaign_type: randomFromArray(campaignTypes),
        start_date: formatDateOnly(campaignStart),
        end_date: formatDateOnly(campaignEnd),
        budget,
        actual_cost: spent,
        total_revenue: revenue,
        total_orders: orders,
        total_discount_given: discount,
        status: campaignEnd < new Date() ? 'completed' : 'active',
        created_at: new Date().toISOString(),
      });
    }
  }
  
  return campaigns;
}

// Generate invoices with correct schema
function generateInvoices(startDate: Date, months: number) {
  const invoices: any[] = [];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    const invoiceCount = randomBetween(5, 15);
    
    for (let i = 0; i < invoiceCount; i++) {
      const issueDate = new Date(date.getFullYear(), date.getMonth(), randomBetween(1, 28));
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + randomBetween(15, 45));
      
      const subtotal = randomBetween(5000000, 50000000);
      const vatAmount = Math.round(subtotal * 0.1);
      const totalAmount = subtotal + vatAmount;
      
      const now = new Date();
      let status: string;
      let paidAmount = 0;
      
      if (issueDate > now) {
        status = 'draft';
      } else if (dueDate > now) {
        status = Math.random() > 0.3 ? 'paid' : 'sent';
        paidAmount = status === 'paid' ? totalAmount : 0;
      } else {
        const rand = Math.random();
        if (rand > 0.6) {
          status = 'paid';
          paidAmount = totalAmount;
        } else if (rand > 0.3) {
          status = 'partial';
          paidAmount = Math.round(totalAmount * (0.3 + Math.random() * 0.5));
        } else {
          status = 'overdue';
          paidAmount = 0;
        }
      }
      
      invoices.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        invoice_number: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
        issue_date: formatDateOnly(issueDate),
        due_date: formatDateOnly(dueDate),
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        status,
        created_at: issueDate.toISOString(),
      });
    }
  }
  
  return invoices;
}

// Generate bills with correct schema
function generateBills(startDate: Date, months: number) {
  const bills: any[] = [];
  const vendors = [
    'Công ty Vải ABC', 'Nhà máy May XYZ', 'Công ty Phụ liệu Hà Nội',
    'Giao Hàng Nhanh', 'Marketing Digital', 'Điện lực', 'Viễn thông'
  ];
  const categories = ['inventory', 'logistics', 'marketing', 'utilities', 'rent', 'salary', 'other'];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    const billCount = randomBetween(10, 20);
    
    for (let i = 0; i < billCount; i++) {
      const billDate = new Date(date.getFullYear(), date.getMonth(), randomBetween(1, 28));
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + randomBetween(15, 30));
      
      const category = randomFromArray(categories);
      const baseAmount = category === 'inventory' ? randomBetween(20000000, 100000000) :
                        category === 'salary' ? randomBetween(50000000, 150000000) :
                        category === 'rent' ? randomBetween(20000000, 50000000) :
                        category === 'marketing' ? randomBetween(10000000, 50000000) :
                        randomBetween(2000000, 20000000);
      
      const vatAmount = Math.round(baseAmount * 0.1);
      const totalAmount = baseAmount + vatAmount;
      
      const now = new Date();
      let status: string;
      let paidAmount = 0;
      
      if (dueDate > now) {
        status = Math.random() > 0.5 ? 'paid' : 'pending';
        paidAmount = status === 'paid' ? totalAmount : 0;
      } else {
        status = Math.random() > 0.2 ? 'paid' : 'overdue';
        paidAmount = status === 'paid' ? totalAmount : 0;
      }
      
      bills.push({
        id: crypto.randomUUID(),
        tenant_id: TENANT_ID,
        bill_number: `BILL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
        vendor_name: randomFromArray(vendors),
        bill_date: formatDateOnly(billDate),
        due_date: formatDateOnly(dueDate),
        subtotal: baseAmount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        expense_category: category,
        status,
        created_at: billDate.toISOString(),
      });
    }
  }
  
  return bills;
}

// Generate cash flow direct with correct schema
function generateCashFlowDirect(startDate: Date, months: number) {
  const entries: any[] = [];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const salesCollected = randomBetween(150000000, 300000000);
    const supplierPayments = randomBetween(80000000, 150000000);
    const salaryPayments = randomBetween(50000000, 100000000);
    const rentPayment = randomBetween(15000000, 30000000);
    const utilities = randomBetween(5000000, 15000000);
    const taxes = randomBetween(10000000, 30000000);
    
    const netOperating = salesCollected - supplierPayments - salaryPayments - rentPayment - utilities - taxes;
    
    entries.push({
      id: crypto.randomUUID(),
      tenant_id: TENANT_ID,
      period_start: formatDateOnly(periodStart),
      period_end: formatDateOnly(periodEnd),
      period_type: 'monthly',
      cash_from_customers: salesCollected,
      cash_to_suppliers: supplierPayments,
      cash_to_employees: salaryPayments,
      cash_for_rent: rentPayment,
      cash_for_utilities: utilities,
      cash_for_taxes: taxes,
      net_cash_operating: netOperating,
      opening_cash_balance: m === 0 ? 500000000 : null,
      closing_cash_balance: 500000000 + (netOperating * (m + 1)),
      is_actual: true,
      created_at: new Date().toISOString(),
    });
  }
  
  return entries;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, phase, startMonth } = await req.json();

    if (action === 'status') {
      const [orders, products, campaigns, invoices, bills, items] = await Promise.all([
        supabase.from('external_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('external_products').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('promotion_campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('bills').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('external_order_items').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
      ]);

      return new Response(JSON.stringify({
        success: true,
        counts: {
          orders: orders.count || 0,
          items: items.count || 0,
          products: products.count || 0,
          campaigns: campaigns.count || 0,
          invoices: invoices.count || 0,
          bills: bills.count || 0,
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'import') {
      const importStartDate = new Date(2023, 6, 1); // July 2023
      const totalMonths = 30;
      const ordersPerDay = 55;
      
      // Phase 2: Orders (chunked by month)
      if (phase === 2) {
        console.log('Phase 2: Importing orders...');
        
        const { data: products, error: prodError } = await supabase
          .from('external_products')
          .select('external_sku, name, selling_price, cost_price')
          .eq('tenant_id', TENANT_ID);
        
        if (prodError || !products?.length) {
          console.error('Product fetch error:', prodError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'No products found. Run phase 1 first.',
            detail: prodError 
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        console.log(`Found ${products.length} products`);
        
        let totalOrders = 0;
        let totalItems = 0;
        const monthsPerBatch = 2;
        const currentStartMonth = startMonth || 0;
        const endMonth = Math.min(currentStartMonth + monthsPerBatch, totalMonths);
        
        for (let m = currentStartMonth; m < endMonth; m++) {
          const date = new Date(importStartDate);
          date.setMonth(date.getMonth() + m);
          
          console.log(`Processing month ${m + 1}/${totalMonths}: ${date.getFullYear()}-${date.getMonth() + 1}`);
          
          const { orders, items } = generateOrdersForMonth(
            date.getFullYear(),
            date.getMonth(),
            products,
            ordersPerDay
          );
          
          // Insert orders in batches
          for (let i = 0; i < orders.length; i += BATCH_SIZE) {
            const batch = orders.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('external_orders').insert(batch);
            if (error) {
              console.error('Order insert error:', error);
            }
          }
          
          // Insert items in batches
          for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('external_order_items').insert(batch);
            if (error) {
              console.error('Item insert error:', error);
            }
          }
          
          totalOrders += orders.length;
          totalItems += items.length;
        }
        
        const hasMore = endMonth < totalMonths;
        console.log(`Phase 2 batch complete: ${totalOrders} orders, ${totalItems} items`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          phase: 2,
          processedMonths: { start: currentStartMonth, end: endMonth, total: totalMonths },
          hasMore,
          nextStartMonth: hasMore ? endMonth : null,
          counts: { orders: totalOrders, items: totalItems }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Phase 3: Channel fees & Campaigns
      if (phase === 3) {
        console.log('Phase 3: Importing channel fees and campaigns...');
        
        const fees = generateChannelFees(importStartDate, totalMonths);
        const campaigns = generateCampaigns(importStartDate, totalMonths);
        
        for (let i = 0; i < fees.length; i += BATCH_SIZE) {
          const batch = fees.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('channel_fees').insert(batch);
          if (error) console.error('Fee insert error:', error);
        }
        
        for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
          const batch = campaigns.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('promotion_campaigns').insert(batch);
          if (error) console.error('Campaign insert error:', error);
        }
        
        console.log(`Imported ${fees.length} fees, ${campaigns.length} campaigns`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          phase: 3, 
          counts: { fees: fees.length, campaigns: campaigns.length }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Phase 4: Invoices & Bills
      if (phase === 4) {
        console.log('Phase 4: Importing invoices and bills...');
        
        const invoices = generateInvoices(importStartDate, totalMonths);
        const bills = generateBills(importStartDate, totalMonths);
        
        for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
          const batch = invoices.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('invoices').insert(batch);
          if (error) console.error('Invoice insert error:', error);
        }
        
        for (let i = 0; i < bills.length; i += BATCH_SIZE) {
          const batch = bills.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('bills').insert(batch);
          if (error) console.error('Bill insert error:', error);
        }
        
        console.log(`Imported ${invoices.length} invoices, ${bills.length} bills`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          phase: 4, 
          counts: { invoices: invoices.length, bills: bills.length }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Phase 5: Cash flow
      if (phase === 5) {
        console.log('Phase 5: Importing cash flow data...');
        
        const cashFlows = generateCashFlowDirect(importStartDate, totalMonths);
        
        for (let i = 0; i < cashFlows.length; i += BATCH_SIZE) {
          const batch = cashFlows.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('cash_flow_direct').insert(batch);
          if (error) console.error('Cash flow insert error:', error);
        }
        
        // Clear cache
        await supabase.from('dashboard_kpi_cache').delete().eq('tenant_id', TENANT_ID);
        
        console.log(`Imported ${cashFlows.length} cash flow entries`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          phase: 5, 
          counts: { cashFlows: cashFlows.length },
          message: 'Import complete!'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Invalid phase' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
