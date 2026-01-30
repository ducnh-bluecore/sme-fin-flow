import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

interface OrderItem {
  id: string;
  orderId: string;
  orderAt: string;
  channel: string;
  productId: string;
  category: string;
  qty: number;
  unitPrice: number;
  lineRevenue: number;
  lineCogs: number;
  lineMargin: number;
}

interface CategorySpend {
  category: string;
  revenue: number;
  percentage: number;
}

interface TimelineOrder {
  id: string;
  orderAt: string;
  channel: string;
  items: Array<{
    productId: string;
    category: string;
    revenue: number;
    qty: number;
  }>;
  totalRevenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
}

interface CategoryShift {
  category: string;
  earlyShare: number;
  recentShare: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CustomerOrderItemsData {
  items: OrderItem[];
  categorySpend: CategorySpend[];
  timelineOrders: TimelineOrder[];
  topProducts: TopProduct[];
  basketEvolution: {
    shifts: CategoryShift[];
    earlyPeriod: string;
    recentPeriod: string;
  };
}

export function useCDPCustomerOrderItems(customerId: string | undefined) {
  const { client, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-customer-order-items', customerId],
    queryFn: async (): Promise<CustomerOrderItemsData | null> => {
      if (!customerId) return null;

      // Fetch order items with order details
      const { data: rawItems, error } = await client
        .from('cdp_order_items')
        .select(`
          id,
          order_id,
          product_id,
          category,
          qty,
          unit_price,
          line_revenue,
          line_cogs,
          line_margin,
          cdp_orders!inner (
            order_at,
            channel
          )
        `)
        .eq('cdp_orders.customer_id', customerId)
        .order('cdp_orders(order_at)', { ascending: false });

      if (error) throw error;
      if (!rawItems || rawItems.length === 0) {
        return {
          items: [],
          categorySpend: [],
          timelineOrders: [],
          topProducts: [],
          basketEvolution: { shifts: [], earlyPeriod: '', recentPeriod: '' },
        };
      }

      // Transform raw items
      const items: OrderItem[] = rawItems.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        orderAt: item.cdp_orders?.order_at || '',
        channel: item.cdp_orders?.channel || '',
        productId: item.product_id || '',
        category: item.category || 'others',
        qty: item.qty || 0,
        unitPrice: Number(item.unit_price) || 0,
        lineRevenue: Number(item.line_revenue) || 0,
        lineCogs: Number(item.line_cogs) || 0,
        lineMargin: Number(item.line_margin) || 0,
      }));

      // Calculate Category Spend
      const categoryTotals: Record<string, number> = {};
      let totalRevenue = 0;
      items.forEach(item => {
        const cat = item.category || 'others';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + item.lineRevenue;
        totalRevenue += item.lineRevenue;
      });

      const categorySpend: CategorySpend[] = Object.entries(categoryTotals)
        .map(([category, revenue]) => ({
          category,
          revenue,
          percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Build Timeline Orders (group by order_id)
      const orderMap: Record<string, TimelineOrder> = {};
      items.forEach(item => {
        if (!orderMap[item.orderId]) {
          orderMap[item.orderId] = {
            id: item.orderId,
            orderAt: item.orderAt,
            channel: item.channel,
            items: [],
            totalRevenue: 0,
          };
        }
        orderMap[item.orderId].items.push({
          productId: item.productId,
          category: item.category,
          revenue: item.lineRevenue,
          qty: item.qty,
        });
        orderMap[item.orderId].totalRevenue += item.lineRevenue;
      });

      const timelineOrders = Object.values(orderMap)
        .sort((a, b) => new Date(b.orderAt).getTime() - new Date(a.orderAt).getTime());

      // Calculate Top Products - collect unique product IDs
      const productTotals: Record<string, { category: string; totalQty: number; totalRevenue: number; orderIds: Set<string> }> = {};
      items.forEach(item => {
        if (!productTotals[item.productId]) {
          productTotals[item.productId] = {
            category: item.category,
            totalQty: 0,
            totalRevenue: 0,
            orderIds: new Set(),
          };
        }
        productTotals[item.productId].totalQty += item.qty;
        productTotals[item.productId].totalRevenue += item.lineRevenue;
        productTotals[item.productId].orderIds.add(item.orderId);
      });

      // Fetch product names for UUIDs
      const productIds = Object.keys(productTotals).filter(id => 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );
      
      let productInfoMap: Record<string, { name: string; sku: string }> = {};
      if (productIds.length > 0) {
        const { data: productData } = await client
          .from('products')
          .select('id, name, sku')
          .in('id', productIds);
        
        if (productData) {
          productInfoMap = productData.reduce((acc, p) => {
            acc[p.id] = { name: p.name || '', sku: p.sku || '' };
            return acc;
          }, {} as Record<string, { name: string; sku: string }>);
        }
      }

      const topProducts: TopProduct[] = Object.entries(productTotals)
        .map(([productId, data]) => ({
          productId,
          productName: productInfoMap[productId]?.name || productId,
          productSku: productInfoMap[productId]?.sku || '',
          category: data.category,
          totalQty: data.totalQty,
          totalRevenue: data.totalRevenue,
          orderCount: data.orderIds.size,
        }))
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 10);

      // Calculate Basket Evolution (compare first half vs second half of orders)
      const sortedOrders = [...timelineOrders].sort((a, b) => 
        new Date(a.orderAt).getTime() - new Date(b.orderAt).getTime()
      );

      if (sortedOrders.length < 2) {
        return {
          items,
          categorySpend,
          timelineOrders,
          topProducts,
          basketEvolution: { shifts: [], earlyPeriod: '', recentPeriod: '' },
        };
      }

      const midPoint = Math.floor(sortedOrders.length / 2);
      const earlyOrders = sortedOrders.slice(0, midPoint);
      const recentOrders = sortedOrders.slice(midPoint);

      const calculateCategoryShare = (orders: TimelineOrder[]) => {
        const catRevenue: Record<string, number> = {};
        let total = 0;
        orders.forEach(order => {
          order.items.forEach(item => {
            catRevenue[item.category] = (catRevenue[item.category] || 0) + item.revenue;
            total += item.revenue;
          });
        });
        return { catRevenue, total };
      };

      const earlyData = calculateCategoryShare(earlyOrders);
      const recentData = calculateCategoryShare(recentOrders);

      const allCategories = new Set([
        ...Object.keys(earlyData.catRevenue),
        ...Object.keys(recentData.catRevenue),
      ]);

      const shifts: CategoryShift[] = [...allCategories].map(category => {
        const earlyShare = earlyData.total > 0 
          ? ((earlyData.catRevenue[category] || 0) / earlyData.total) * 100 
          : 0;
        const recentShare = recentData.total > 0 
          ? ((recentData.catRevenue[category] || 0) / recentData.total) * 100 
          : 0;
        const changePercent = recentShare - earlyShare;
        const trend: 'up' | 'down' | 'stable' = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

        return {
          category,
          earlyShare,
          recentShare,
          changePercent,
          trend,
        };
      }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

      const formatPeriod = (orders: TimelineOrder[]) => {
        if (orders.length === 0) return '';
        const dates = orders.map(o => new Date(o.orderAt));
        const min = new Date(Math.min(...dates.map(d => d.getTime())));
        const max = new Date(Math.max(...dates.map(d => d.getTime())));
        return `${min.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })} - ${max.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })}`;
      };

      return {
        items,
        categorySpend,
        timelineOrders,
        topProducts,
        basketEvolution: {
          shifts,
          earlyPeriod: formatPeriod(earlyOrders),
          recentPeriod: formatPeriod(recentOrders),
        },
      };
    },
    enabled: !!customerId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
