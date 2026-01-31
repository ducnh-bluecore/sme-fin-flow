import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Users, 
  Check, 
  Pencil, 
  Infinity,
  TrendingUp,
  Target,
  Radio,
  Database as DatabaseIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanWithModules } from '@/hooks/usePlatformPlans';

interface PlanCardProps {
  plan: PlanWithModules;
  index: number;
  onEdit?: () => void;
}

const moduleIcons: Record<string, React.ComponentType<any>> = {
  fdp: TrendingUp,
  mdp: Target,
  cdp: Users,
  control_tower: Radio,
  data_warehouse: DatabaseIcon,
};

const planColors: Record<string, { bg: string; border: string; badge: string }> = {
  free: { 
    bg: 'bg-muted/30', 
    border: 'border-border', 
    badge: 'bg-muted text-muted-foreground' 
  },
  starter: { 
    bg: 'bg-blue-500/5', 
    border: 'border-blue-500/20', 
    badge: 'bg-blue-500/10 text-blue-600' 
  },
  professional: { 
    bg: 'bg-violet-500/5', 
    border: 'border-violet-500/20', 
    badge: 'bg-violet-500/10 text-violet-600' 
  },
  enterprise: { 
    bg: 'bg-amber-500/5', 
    border: 'border-amber-500/20', 
    badge: 'bg-amber-500/10 text-amber-600' 
  },
};

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'Liên hệ';
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}

export function PlanCard({ plan, index, onEdit }: PlanCardProps) {
  const colors = planColors[plan.code] || planColors.free;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={cn('h-full', colors.bg, colors.border)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Badge className={cn('mb-2', colors.badge)} variant="outline">
                {plan.code.toUpperCase()}
              </Badge>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
            </div>
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="pt-2">
            <span className="text-2xl font-bold">
              {formatPrice(plan.price_monthly)}
            </span>
            {plan.price_monthly !== null && plan.price_monthly > 0 && (
              <span className="text-muted-foreground text-sm">/tháng</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {plan.max_users ? (
              <span>Tối đa {plan.max_users} người dùng</span>
            ) : (
              <span className="flex items-center gap-1">
                <Infinity className="w-3 h-3" /> Không giới hạn
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Modules included */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Modules bao gồm
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.modules.length > 0 ? (
                plan.modules.map((mod) => {
                  const Icon = moduleIcons[mod.module_code] || Package;
                  return (
                    <Badge 
                      key={mod.module_id} 
                      variant="secondary" 
                      className="gap-1 text-xs"
                    >
                      <Icon className="w-3 h-3" />
                      {mod.module_name}
                    </Badge>
                  );
                })
              ) : (
                <span className="text-sm text-muted-foreground">Chưa có module</span>
              )}
            </div>
          </div>

          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tính năng
              </p>
              <ul className="space-y-1">
                {plan.features.slice(0, 4).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-sm text-muted-foreground">
                    +{plan.features.length - 4} tính năng khác
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Status & Edit */}
          <div className="flex items-center justify-between pt-2">
            <Badge variant={plan.is_active ? 'default' : 'secondary'}>
              {plan.is_active ? 'Đang bán' : 'Tạm dừng'}
            </Badge>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1">
                <Pencil className="w-3.5 h-3.5" />
                Chỉnh sửa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
