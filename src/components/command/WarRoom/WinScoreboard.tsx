import { motion } from 'framer-motion';
import { Trophy, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type WinScoreboardData } from '@/hooks/command/useWinScoreboard';

function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

interface Props {
  data: WinScoreboardData | undefined;
  isLoading: boolean;
}

export function WinScoreboard({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">
            Đang tải thành tích...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasData) {
    return (
      <Card className="border-dashed border-muted-foreground/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Trophy className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Chưa có quyết định nào được đo lường</p>
              <p className="text-xs">Khi bạn bắt đầu approve các action, kết quả sẽ hiển thị ở đây</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wins = [
    { icon: TrendingUp, label: 'Đã cứu', value: formatVND(data.rescuedRevenue), color: 'text-emerald-500' },
    { icon: ShieldCheck, label: 'Tránh markdown', value: formatVND(data.avoidedMarkdown), color: 'text-blue-500' },
    { icon: Sparkles, label: 'Health', value: `${data.healthDelta >= 0 ? '+' : ''}${data.healthDelta}`, color: data.healthDelta >= 0 ? 'text-emerald-500' : 'text-destructive' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-gradient-to-r from-emerald-500/5 to-blue-500/5 border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">7 Ngày Qua</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {wins.map((w) => (
              <div key={w.label} className="text-center">
                <w.icon className={`h-4 w-4 mx-auto mb-1 ${w.color}`} />
                <p className={`text-lg font-bold ${w.color}`}>{w.value}</p>
                <p className="text-xs text-muted-foreground">{w.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
