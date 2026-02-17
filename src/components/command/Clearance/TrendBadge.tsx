import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return <span className="text-muted-foreground text-xs">—</span>;
  if (trend === 'up') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30"><TrendingUp className="h-3 w-3 mr-1" />Tăng</Badge>;
  if (trend === 'down') return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><TrendingDown className="h-3 w-3 mr-1" />Giảm</Badge>;
  return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />Ổn định</Badge>;
}
