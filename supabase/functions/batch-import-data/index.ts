import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const BATCH_SIZE = 1000;

// Channels and platforms
const CHANNELS = ['Shopee', 'Lazada', 'TikTok Shop', 'Sendo', 'Website'];
const CHANNEL_WEIGHTS = [0.35, 0.25, 0.20, 0.10, 0.10]; // Distribution

// Product catalog (480 SKUs)
const PRODUCT_CATEGORIES = [
  { name: 'Áo thun', prefix: 'AT', count: 80, priceRange: [89000, 199000], costRatio: 0.45 },
  { name: 'Áo sơ mi', prefix: 'SM', count: 60, priceRange: [159000, 399000], costRatio: 0.40 },
  { name: 'Áo polo', prefix: 'PL', count: 50, priceRange: [129000, 299000], costRatio: 0.42 },
  { name: 'Quần jean', prefix: 'QJ', count: 70, priceRange: [199000, 499000], costRatio: 0.38 },
  { name: 'Quần kaki', prefix: 'QK', count: 50, priceRange: [179000, 399000], costRatio: 0.40 },
  { name: 'Quần short', prefix: 'QS', count: 40, priceRange: [99000, 249000], costRatio: 0.45 },
  { name: 'Váy đầm', prefix: 'VD', count: 50, priceRange: [199000, 599000], costRatio: 0.35 },
  { name: 'Áo khoác', prefix: 'AK', count: 40, priceRange: [299000, 799000], costRatio: 0.38 },
  { name: 'Phụ kiện', prefix: 'PK', count: 40, priceRange: [49000, 199000], costRatio: 0.50 },
];

// Helper functions
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

function generateUUID(): string {
  return crypto.randomUUID();
}

function formatDate(date: Date): string {
  return date.toISOString();
}

// Generate products - using correct column names from schema
function generateProducts() {
  const products: any[] = [];
  let skuIndex = 1;
  
  for (const category of PRODUCT_CATEGORIES) {
    for (let i = 1; i <= category.count; i++) {
      const sku = `${category.prefix}-${String(skuIndex).padStart(4, '0')}`;
      const sellingPrice = randomBetween(category.priceRange[0], category.priceRange[1]);
      const costPrice = Math.round(sellingPrice * category.costRatio);
      
      products.push({
        id: generateUUID(),
        tenant_id: TENANT_ID,
        external_sku: sku,
        name: `${category.name} ${String(i).padStart(3, '0')}`,
        category: category.name,
        selling_price: sellingPrice,
        cost_price: costPrice,
        status: 'active',
        stock_quantity: randomBetween(50, 500),
        created_at: new Date().toISOString(),
      });
      skuIndex++;
    }
  }
  
  return products;
}

// Generate stores
function generateStores() {
  const cities = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];
  return cities.map((city, i) => ({
    id: generateUUID(),
    tenant_id: TENANT_ID,
    store_name: `Chi nhánh ${city}`,
    store_code: `STORE-${String(i + 1).padStart(3, '0')}`,
    address: `Địa chỉ tại ${city}`,
    city,
    status: 'active',
    created_at: new Date().toISOString(),
  }));
}

// Generate orders for a specific date range
function generateOrdersForMonth(
  year: number, 
  month: number, 
  products: any[],
  ordersPerDay: number
): { orders: any[], items: any[] } {
  const orders: any[] = [];
  const items: any[] = [];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'shipped', 'cancelled', 'returned'];
  const statusWeights = [0.70, 0.10, 0.05, 0.05, 0.05, 0.03, 0.02];
  
  for (let day = 1; day <= daysInMonth; day++) {
    // Vary orders per day (weekends higher)
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dailyVariance = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;
    const actualOrdersToday = Math.round(ordersPerDay * dailyVariance * (0.8 + Math.random() * 0.4));
    
    for (let o = 0; o < actualOrdersToday; o++) {
      const orderId = generateUUID();
      const channel = randomFromArray(CHANNELS, CHANNEL_WEIGHTS);
      const status = randomFromArray(statuses, statusWeights);
      const orderDate = new Date(year, month, day, randomBetween(8, 22), randomBetween(0, 59));
      
      // Generate 1-5 items per order
      const itemCount = randomBetween(1, 5);
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
        const unitPrice = product.selling_price;
        const unitCogs = product.cost_price;
        const totalAmount = unitPrice * quantity;
        const totalCogs = unitCogs * quantity;
        
        // Calculate margin with platform fees (~15%)
        const platformFeeRate = channel === 'Website' ? 0.02 : randomBetween(12, 18) / 100;
        const grossProfit = totalAmount - totalCogs - (totalAmount * platformFeeRate);
        const marginPercent = (grossProfit / totalAmount) * 100;
        
        items.push({
          id: generateUUID(),
          tenant_id: TENANT_ID,
          external_order_id: orderId,
          sku: product.sku,
          product_name: product.product_name,
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
      
      // Platform fees
      const platformFeeRate = channel === 'Website' ? 0.02 : randomBetween(12, 18) / 100;
      const platformFee = Math.round(orderTotal * platformFeeRate * 0.6);
      const commissionFee = Math.round(orderTotal * platformFeeRate * 0.3);
      const paymentFee = Math.round(orderTotal * 0.015);
      const shippingFee = randomBetween(15000, 45000);
      
      orders.push({
        id: orderId,
        tenant_id: TENANT_ID,
        order_number: `ORD-${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(o + 1).padStart(4, '0')}`,
        channel,
        platform: channel,
        status,
        order_date: formatDate(orderDate),
        total_amount: orderTotal,
        subtotal: orderTotal,
        platform_fee: platformFee,
        commission_fee: commissionFee,
        payment_fee: paymentFee,
        shipping_fee: shippingFee,
        created_at: formatDate(orderDate),
      });
    }
  }
  
  return { orders, items };
}

// Generate channel fees
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
          id: generateUUID(),
          tenant_id: TENANT_ID,
          channel,
          fee_type: feeType,
          amount: baseAmount,
          fee_date: new Date(date.getFullYear(), date.getMonth(), 15).toISOString().split('T')[0],
          period_start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0],
          period_end: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  
  return fees;
}

// Generate marketing campaigns
function generateCampaigns(startDate: Date, months: number) {
  const campaigns: any[] = [];
  const campaignTypes = ['flash_sale', 'brand_day', 'mega_sale', 'clearance', 'new_arrival', 'seasonal'];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    // 2-4 campaigns per month
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
      
      campaigns.push({
        id: generateUUID(),
        tenant_id: TENANT_ID,
        campaign_name: `${randomFromArray(campaignTypes)} ${date.getMonth() + 1}/${date.getFullYear()} - ${channel}`,
        channel,
        campaign_type: randomFromArray(campaignTypes),
        start_date: campaignStart.toISOString().split('T')[0],
        end_date: campaignEnd.toISOString().split('T')[0],
        budget,
        actual_spend: spent,
        total_revenue: revenue,
        total_orders: orders,
        total_clicks: Math.round(orders * randomBetween(20, 50)),
        total_impressions: Math.round(orders * randomBetween(500, 2000)),
        status: campaignEnd < new Date() ? 'completed' : 'active',
        created_at: new Date().toISOString(),
      });
    }
  }
  
  return campaigns;
}

// Generate invoices (B2B)
function generateInvoices(startDate: Date, months: number) {
  const invoices: any[] = [];
  const customers = [
    'Công ty TNHH ABC', 'Công ty CP XYZ', 'Đại lý Kim Long', 
    'Shop Thời Trang Minh Anh', 'Cửa hàng Hải Yến', 'Công ty Fashion Plus',
    'Đại lý Thanh Hoa', 'Shop Style Modern', 'Công ty Việt Fashion'
  ];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    // 5-15 B2B invoices per month
    const invoiceCount = randomBetween(5, 15);
    
    for (let i = 0; i < invoiceCount; i++) {
      const issueDate = new Date(date.getFullYear(), date.getMonth(), randomBetween(1, 28));
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + randomBetween(15, 45));
      
      const subtotal = randomBetween(5000000, 50000000);
      const taxAmount = Math.round(subtotal * 0.1);
      const totalAmount = subtotal + taxAmount;
      
      // Determine status based on due date
      const now = new Date();
      let status: string;
      let paidAmount = 0;
      
      if (issueDate > now) {
        status = 'draft';
      } else if (dueDate > now) {
        status = Math.random() > 0.3 ? 'paid' : 'sent';
        paidAmount = status === 'paid' ? totalAmount : 0;
      } else {
        // Past due
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
        id: generateUUID(),
        tenant_id: TENANT_ID,
        invoice_number: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
        customer_name: randomFromArray(customers),
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        status,
        created_at: issueDate.toISOString(),
      });
    }
  }
  
  return invoices;
}

// Generate bills (expenses)
function generateBills(startDate: Date, months: number) {
  const bills: any[] = [];
  const vendors = [
    'Công ty Vải ABC', 'Nhà máy May XYZ', 'Công ty Phụ liệu Hà Nội',
    'Đơn vị Vận chuyển Giao Hàng Nhanh', 'Công ty TNHH Marketing Digital',
    'Công ty Điện lực', 'Công ty Viễn thông', 'Công ty Bảo hiểm'
  ];
  const categories = ['inventory', 'logistics', 'marketing', 'utilities', 'rent', 'salary', 'other'];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    // 10-20 bills per month
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
      
      const taxAmount = Math.round(baseAmount * 0.1);
      const totalAmount = baseAmount + taxAmount;
      
      // Payment status
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
        id: generateUUID(),
        tenant_id: TENANT_ID,
        bill_number: `BILL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
        vendor_name: randomFromArray(vendors),
        bill_date: billDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal: baseAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        category,
        status,
        created_at: billDate.toISOString(),
      });
    }
  }
  
  return bills;
}

// Generate cash flow direct entries
function generateCashFlowDirect(startDate: Date, months: number) {
  const entries: any[] = [];
  
  for (let m = 0; m < months; m++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + m);
    
    // Monthly cash flow
    const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Operating cash flows
    const salesCollected = randomBetween(150000000, 300000000);
    const supplierPayments = randomBetween(80000000, 150000000);
    const salaryPayments = randomBetween(50000000, 100000000);
    const otherOperating = randomBetween(10000000, 30000000);
    
    entries.push(
      {
        id: generateUUID(),
        tenant_id: TENANT_ID,
        category: 'operating',
        sub_category: 'sales_collection',
        description: 'Thu tiền từ bán hàng',
        amount: salesCollected,
        flow_type: 'inflow',
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        tenant_id: TENANT_ID,
        category: 'operating',
        sub_category: 'supplier_payment',
        description: 'Thanh toán nhà cung cấp',
        amount: -supplierPayments,
        flow_type: 'outflow',
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        tenant_id: TENANT_ID,
        category: 'operating',
        sub_category: 'salary_payment',
        description: 'Chi lương nhân viên',
        amount: -salaryPayments,
        flow_type: 'outflow',
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      }
    );
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

    const { action, phase } = await req.json();

    if (action === 'status') {
      // Check current data status
      const [orders, products, campaigns, invoices, bills] = await Promise.all([
        supabase.from('external_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('external_products').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('promotion_campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
        supabase.from('bills').select('id', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
      ]);

      return new Response(JSON.stringify({
        success: true,
        counts: {
          orders: orders.count || 0,
          products: products.count || 0,
          campaigns: campaigns.count || 0,
          invoices: invoices.count || 0,
          bills: bills.count || 0,
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'clear') {
      console.log('Clearing existing data...');
      
      // Clear in correct order (respect foreign keys)
      await supabase.from('external_order_items').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('external_orders').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('external_products').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('channel_fees').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('promotion_campaigns').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('invoices').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('bills').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('cash_flow_direct').delete().eq('tenant_id', TENANT_ID);
      await supabase.from('dashboard_kpi_cache').delete().eq('tenant_id', TENANT_ID);
      
      console.log('Data cleared successfully');
      return new Response(JSON.stringify({ success: true, message: 'Data cleared' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'import') {
      const startDate = new Date(2023, 6, 1); // July 2023
      const months = 30; // 30 months = until Jan 2026
      const ordersPerDay = 55; // ~50,000 orders total
      
      console.log(`Starting import: Phase ${phase || 'all'}`);
      
      // Phase 1: Products
      if (!phase || phase === 1) {
        console.log('Phase 1: Importing products...');
        const products = generateProducts();
        
        for (let i = 0; i < products.length; i += BATCH_SIZE) {
          const batch = products.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('external_products').insert(batch);
          if (error) console.error('Product insert error:', error);
        }
        console.log(`Imported ${products.length} products`);
        
        if (phase === 1) {
          return new Response(JSON.stringify({ 
            success: true, 
            phase: 1, 
            message: `Imported ${products.length} products` 
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Phase 2: Orders (chunked by month to avoid timeout)
      if (!phase || phase === 2) {
        console.log('Phase 2: Importing orders...');
        
        // Get products for order generation
        const { data: products } = await supabase
          .from('external_products')
          .select('*')
          .eq('tenant_id', TENANT_ID);
        
        if (!products?.length) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'No products found. Run phase 1 first.' 
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        let totalOrders = 0;
        let totalItems = 0;
        
        // Process 3 months at a time to avoid timeout
        const monthsPerBatch = 3;
        const startMonth = req.headers.get('x-start-month') ? parseInt(req.headers.get('x-start-month')!) : 0;
        const endMonth = Math.min(startMonth + monthsPerBatch, months);
        
        for (let m = startMonth; m < endMonth; m++) {
          const date = new Date(startDate);
          date.setMonth(date.getMonth() + m);
          
          console.log(`Processing month ${m + 1}/${months}: ${date.getFullYear()}-${date.getMonth() + 1}`);
          
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
            if (error) console.error('Order insert error:', error);
          }
          
          // Insert items in batches
          for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('external_order_items').insert(batch);
            if (error) console.error('Item insert error:', error);
          }
          
          totalOrders += orders.length;
          totalItems += items.length;
        }
        
        const hasMore = endMonth < months;
        console.log(`Phase 2 batch complete: ${totalOrders} orders, ${totalItems} items. HasMore: ${hasMore}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          phase: 2,
          processedMonths: { start: startMonth, end: endMonth, total: months },
          hasMore,
          nextStartMonth: hasMore ? endMonth : null,
          counts: { orders: totalOrders, items: totalItems }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Phase 3: Channel fees & Campaigns
      if (!phase || phase === 3) {
        console.log('Phase 3: Importing channel fees and campaigns...');
        
        const fees = generateChannelFees(startDate, months);
        const campaigns = generateCampaigns(startDate, months);
        
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
        
        if (phase === 3) {
          return new Response(JSON.stringify({ 
            success: true, 
            phase: 3, 
            counts: { fees: fees.length, campaigns: campaigns.length }
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Phase 4: Invoices & Bills
      if (!phase || phase === 4) {
        console.log('Phase 4: Importing invoices and bills...');
        
        const invoices = generateInvoices(startDate, months);
        const bills = generateBills(startDate, months);
        
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
        
        if (phase === 4) {
          return new Response(JSON.stringify({ 
            success: true, 
            phase: 4, 
            counts: { invoices: invoices.length, bills: bills.length }
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Phase 5: Cash flow
      if (!phase || phase === 5) {
        console.log('Phase 5: Importing cash flow data...');
        
        const cashFlows = generateCashFlowDirect(startDate, months);
        
        for (let i = 0; i < cashFlows.length; i += BATCH_SIZE) {
          const batch = cashFlows.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from('cash_flow_direct').insert(batch);
          if (error) console.error('Cash flow insert error:', error);
        }
        
        console.log(`Imported ${cashFlows.length} cash flow entries`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          phase: 5, 
          counts: { cashFlows: cashFlows.length },
          message: 'Import complete!'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, message: 'Import complete' }), {
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
