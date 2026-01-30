import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  FileText, 
  ShoppingCart, 
  Package, 
  Database,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface TenantStatsCardProps {
  tenantId: string;
  tenantSlug: string;
  isProvisioned: boolean;
}

interface TenantStats {
  customers: number;
  orders: number;
  products: number;
  invoices: number;
  bills: number;
  members: number;
}

export function TenantStatsCard({ tenantId, tenantSlug, isProvisioned }: TenantStatsCardProps) {
  // Fetch basic stats from public schema (always available)
  const { data: stats, isLoading } = useQuery({
    queryKey: ['tenant-usage-stats', tenantId],
    queryFn: async (): Promise<TenantStats> => {
      // Get counts from various tables
      const [
        customersRes,
        ordersRes,
        productsRes,
        invoicesRes,
        billsRes,
        membersRes
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('bills').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('tenant_users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
      ]);

      return {
        customers: customersRes.count || 0,
        orders: ordersRes.count || 0,
        products: productsRes.count || 0,
        invoices: invoicesRes.count || 0,
        bills: billsRes.count || 0,
        members: membersRes.count || 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const statItems = [
    { label: 'Thành viên', value: stats?.members || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Khách hàng', value: stats?.customers || 0, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Đơn hàng', value: stats?.orders || 0, icon: ShoppingCart, color: 'text-amber-500' },
    { label: 'Sản phẩm', value: stats?.products || 0, icon: Package, color: 'text-purple-500' },
    { label: 'Hóa đơn', value: stats?.invoices || 0, icon: FileText, color: 'text-rose-500' },
    { label: 'Bills', value: stats?.bills || 0, icon: Calendar, color: 'text-cyan-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Thống kê sử dụng
        </CardTitle>
        <CardDescription>
          Tổng quan dữ liệu của tenant {isProvisioned ? `(Schema: tenant_${tenantSlug})` : '(Public schema)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statItems.map((item) => (
            <div 
              key={item.label} 
              className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
                )}
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
