/**
 * useWarRoomPriorities - Aggregate top financial risks GROUP BY DRIVER
 * 
 * Instead of showing individual products, groups problems by their root cause
 * (slow_moving, broken_size, markdown_risk, etc.) and shows aggregate impact.
 * Limited to 7 items per Control Tower Manifesto.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';

export interface TopProduct {
  name: string;
  damage: number;
}

export interface WarRoomPriority {
  id: string;
  rank: number;
  type: 'size_break' | 'markdown_risk' | 'cash_lock' | 'margin_leak' | 'lost_revenue';
  driver: string;
  driverLabel: string;
  whyExplanation: string;
  productCount: number;
  topProducts: TopProduct[];
  totalDamage: number;
  damageBreakdown: {
    lostRevenue: number;
    cashLocked: number;
    marginLeak: number;
  };
  markdownEtaDays: number | null;
  timePressureLabel: string;
  urgency: 'critical' | 'urgent' | 'warning';
  actionPath: string;
  actionLabel: string;
}

const DRIVER_LABELS: Record<string, string> = {
  slow_moving: 'Hàng bán chậm',
  broken_size: 'Cơ cấu size lệch',
  markdown_risk: 'Rủi ro phải markdown',
  core_missing: 'Thiếu size core',
  shallow: 'Tồn kho nông (ít depth)',
  size_break: 'Size break',
  imbalance: 'Mất cân bằng phân bổ',
  zero_velocity: 'Không bán được',
  high_age: 'Tồn lâu + bán chậm',
  slow_velocity: 'Bán chậm',
};

const DRIVER_WHY: Record<string, (count: number) => string> = {
  slow_moving: (n) => `${n} SP đang bán chậm, vốn bị kẹt trong tồn kho không xoay được. Nếu tiếp tục, sẽ phải markdown để giải phóng.`,
  broken_size: (n) => `${n} SP có cơ cấu size lệch chuẩn — thừa size ế, thiếu size bán chạy. Vốn bị khóa trong các size không ai mua.`,
  markdown_risk: (n) => `${n} SP có nguy cơ phải giảm giá do tồn kho lâu và velocity thấp. Mỗi ngày chậm = biên lợi nhuận giảm thêm.`,
  core_missing: (n) => `${n} SP thiếu size core (size bán chạy nhất). Khách hàng đến nhưng không có size → mất doanh thu.`,
  shallow: (n) => `${n} SP có tồn kho quá nông — chỉ còn 1-2 cái mỗi size. Không đủ depth để bán hiệu quả.`,
  size_break: (n) => `${n} SP bị gãy curve size — phân bổ size không khớp demand. Cần rebalance hoặc transfer.`,
  imbalance: (n) => `${n} SP phân bổ không đều giữa các kênh/cửa hàng. Nơi thừa hàng ế, nơi thiếu hàng mất doanh thu.`,
  zero_velocity: (n) => `${n} SP hoàn toàn không bán được. Vốn bị chết hoàn toàn, cần clearance ngay.`,
  high_age: (n) => `${n} SP tồn kho quá lâu và bán chậm. Rủi ro markdown rất cao nếu không hành động.`,
  slow_velocity: (n) => `${n} SP có tốc độ bán thấp. Vốn xoay chậm, ảnh hưởng dòng tiền.`,
};

function getDriverType(driver: string, source: 'cash_lock' | 'margin_leak' | 'lost_revenue' | 'markdown_risk' | 'size_health'): WarRoomPriority['type'] {
  if (source === 'markdown_risk') return 'markdown_risk';
  if (source === 'size_health') return 'size_break';
  if (source === 'lost_revenue') return 'lost_revenue';
  if (source === 'margin_leak') return 'margin_leak';
  return 'cash_lock';
}

const TYPE_ACTION: Record<WarRoomPriority['type'], { actionPath: string; actionLabel: string }> = {
  size_break: { actionPath: '/command/assortment', actionLabel: 'Xem Size Health' },
  markdown_risk: { actionPath: '/command/clearance', actionLabel: 'Xem Thanh Lý' },
  cash_lock: { actionPath: '/command/allocation', actionLabel: 'Xem Phân Bổ' },
  margin_leak: { actionPath: '/command/clearance', actionLabel: 'Xem Rò Biên' },
  lost_revenue: { actionPath: '/command/allocation', actionLabel: 'Xem Doanh Thu Mất' },
};

function getUrgency(etaDays: number | null, damage: number): WarRoomPriority['urgency'] {
  if (etaDays !== null && etaDays <= 7) return 'critical';
  if (damage > 500_000_000) return 'critical';
  if (etaDays !== null && etaDays <= 14) return 'urgent';
  if (damage > 100_000_000) return 'urgent';
  return 'warning';
}

function getTimePressureLabel(etaDays: number | null): string {
  if (etaDays === null) return 'Không có deadline cụ thể';
  if (etaDays <= 0) return 'Đã quá hạn markdown!';
  if (etaDays <= 7) return `${etaDays} ngày trước markdown risk`;
  if (etaDays <= 14) return `${etaDays} ngày — cần hành động sớm`;
  return `${etaDays} ngày`;
}

interface DriverBucket {
  driver: string;
  source: 'cash_lock' | 'margin_leak' | 'lost_revenue' | 'markdown_risk' | 'size_health';
  products: Map<string, number>; // product_id -> damage
  cashLocked: number;
  marginLeak: number;
  lostRevenue: number;
  minEtaDays: number | null;
}

export function useWarRoomPriorities() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['war-room-priorities-v2', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const [cashLockRes, lostRevRes, marginLeakRes, markdownRes, sizeHealthRes, fcRes] = await Promise.all([
        buildSelectQuery('state_cash_lock_daily', 'product_id, cash_locked_value, lock_driver')
          .order('cash_locked_value', { ascending: false })
          .limit(1000),
        buildSelectQuery('state_lost_revenue_daily', 'product_id, lost_revenue_est, driver')
          .order('lost_revenue_est', { ascending: false })
          .limit(1000),
        buildSelectQuery('state_margin_leak_daily', 'product_id, margin_leak_value, leak_driver')
          .order('margin_leak_value', { ascending: false })
          .limit(1000),
        buildSelectQuery('state_markdown_risk_daily', 'product_id, markdown_risk_score, markdown_eta_days, reason')
          .gte('markdown_risk_score', 50)
          .order('markdown_risk_score', { ascending: false })
          .limit(1000),
        buildSelectQuery('state_size_health_daily', 'product_id, curve_state, deviation_score')
          .in('curve_state', ['broken', 'risk'])
          .order('deviation_score', { ascending: false })
          .limit(1000),
        buildSelectQuery('inv_family_codes', 'id, fc_code, fc_name, category')
          .eq('is_active', true)
          .limit(2000),
      ]);

      // FC lookup
      const fcMap = new Map<string, string>();
      ((fcRes.data || []) as any[]).forEach((fc: any) => {
        fcMap.set(fc.id, fc.fc_name || fc.fc_code || fc.id.slice(0, 8));
      });

      // Aggregate by driver
      const buckets = new Map<string, DriverBucket>();

      const getOrCreate = (driver: string, source: DriverBucket['source']): DriverBucket => {
        const key = `${source}::${driver}`;
        if (!buckets.has(key)) {
          buckets.set(key, { driver, source, products: new Map(), cashLocked: 0, marginLeak: 0, lostRevenue: 0, minEtaDays: null });
        }
        return buckets.get(key)!;
      };

      ((cashLockRes.data || []) as any[]).forEach((r: any) => {
        const d = r.lock_driver || 'unknown';
        const b = getOrCreate(d, 'cash_lock');
        const val = Number(r.cash_locked_value) || 0;
        b.cashLocked += val;
        b.products.set(r.product_id, (b.products.get(r.product_id) || 0) + val);
      });

      ((lostRevRes.data || []) as any[]).forEach((r: any) => {
        const d = r.driver || 'unknown';
        const b = getOrCreate(d, 'lost_revenue');
        const val = Number(r.lost_revenue_est) || 0;
        b.lostRevenue += val;
        b.products.set(r.product_id, (b.products.get(r.product_id) || 0) + val);
      });

      ((marginLeakRes.data || []) as any[]).forEach((r: any) => {
        const d = r.leak_driver || 'unknown';
        const b = getOrCreate(d, 'margin_leak');
        const val = Number(r.margin_leak_value) || 0;
        b.marginLeak += val;
        b.products.set(r.product_id, (b.products.get(r.product_id) || 0) + val);
      });

      ((markdownRes.data || []) as any[]).forEach((r: any) => {
        const d = r.reason || 'markdown_risk';
        const b = getOrCreate(d, 'markdown_risk');
        // markdown risk contributes to margin leak
        const val = Number(r.markdown_risk_score) * 10000; // approximate damage proxy
        b.marginLeak += val;
        b.products.set(r.product_id, (b.products.get(r.product_id) || 0) + val);
        const eta = r.markdown_eta_days != null ? Number(r.markdown_eta_days) : null;
        if (eta !== null && (b.minEtaDays === null || eta < b.minEtaDays)) {
          b.minEtaDays = eta;
        }
      });

      ((sizeHealthRes.data || []) as any[]).forEach((r: any) => {
        const d = r.curve_state === 'broken' ? 'broken_size' : 'size_break';
        const b = getOrCreate(d, 'size_health');
        const val = Number(r.deviation_score) * 50000; // approximate damage proxy
        b.cashLocked += val;
        b.products.set(r.product_id, (b.products.get(r.product_id) || 0) + val);
      });

      // Convert buckets to priorities
      const priorities: WarRoomPriority[] = [];

      buckets.forEach((b, key) => {
        const totalDamage = b.cashLocked + b.marginLeak + b.lostRevenue;
        if (totalDamage <= 0) return;

        const type = getDriverType(b.driver, b.source);
        const action = TYPE_ACTION[type];

        // Top 3 products
        const sortedProducts = Array.from(b.products.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([pid, dmg]) => ({
            name: fcMap.get(pid) || pid.slice(0, 8),
            damage: dmg,
          }));

        const productCount = b.products.size;
        const driverLabel = DRIVER_LABELS[b.driver] || b.driver;
        const whyFn = DRIVER_WHY[b.driver];
        const whyExplanation = whyFn ? whyFn(productCount) : `${productCount} SP bị ảnh hưởng bởi vấn đề "${driverLabel}".`;

        priorities.push({
          id: key,
          rank: 0,
          type,
          driver: b.driver,
          driverLabel,
          whyExplanation,
          productCount,
          topProducts: sortedProducts,
          totalDamage,
          damageBreakdown: {
            lostRevenue: b.lostRevenue,
            cashLocked: b.cashLocked,
            marginLeak: b.marginLeak,
          },
          markdownEtaDays: b.minEtaDays,
          timePressureLabel: getTimePressureLabel(b.minEtaDays),
          urgency: getUrgency(b.minEtaDays, totalDamage),
          actionPath: action.actionPath,
          actionLabel: `Xem ${productCount} SP`,
        });
      });

      priorities.sort((a, b) => b.totalDamage - a.totalDamage);
      return priorities.slice(0, 7).map((item, i) => ({ ...item, rank: i + 1 }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
  });
}
