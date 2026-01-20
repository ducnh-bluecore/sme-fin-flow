import { useActiveAlerts } from '@/hooks/useAlertInstances';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    return `₫${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `₫${(amount / 1_000_000).toFixed(0)} triệu`;
  }
  return `₫${amount.toLocaleString('vi-VN')}`;
};

export default function BoardViewPage() {
  const { data: alerts = [], isLoading } = useActiveAlerts();

  // Calculate the 3 metrics
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  
  const totalExposure = alerts.reduce((sum, a) => sum + (a.impact_amount || 0), 0);
  
  // Find nearest deadline
  const alertsWithDeadline = alerts
    .filter(a => a.deadline_at)
    .sort((a, b) => new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime());
  
  const nearestDeadline = alertsWithDeadline[0]?.deadline_at;
  const hoursToDeadline = nearestDeadline 
    ? differenceInHours(new Date(nearestDeadline), new Date())
    : null;

  // Determine overall state
  const getSystemState = () => {
    if (criticalCount > 0) return 'CRITICAL';
    if (warningCount > 0) return 'WARNING';
    return 'STABLE';
  };

  const state = getSystemState();

  const stateStyles = {
    CRITICAL: {
      bg: 'bg-red-950/40',
      border: 'border-red-900/50',
      accent: 'text-red-400',
      label: 'TÌNH TRẠNG NGUY CẤP'
    },
    WARNING: {
      bg: 'bg-amber-950/30',
      border: 'border-amber-900/40',
      accent: 'text-amber-400',
      label: 'CẦN CHÚ Ý'
    },
    STABLE: {
      bg: 'bg-slate-900/50',
      border: 'border-slate-700/30',
      accent: 'text-emerald-400',
      label: 'ỔN ĐỊNH'
    }
  };

  const style = stateStyles[state];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${style.bg} p-8 lg:p-16`}>
      {/* System State Header */}
      <header className="mb-16 lg:mb-24">
        <div className={`text-xs font-medium tracking-[0.2em] ${style.accent} mb-2`}>
          CONTROL TOWER • BOARD VIEW
        </div>
        <h1 className={`text-xl lg:text-2xl font-semibold ${style.accent}`}>
          {style.label}
        </h1>
      </header>

      {/* Three Metrics - Vertical Stack */}
      <div className="max-w-2xl space-y-12 lg:space-y-16">
        
        {/* Metric 1: Critical Situations */}
        <div className={`border-l-2 ${state === 'CRITICAL' ? 'border-red-500' : 'border-slate-700'} pl-6 lg:pl-8`}>
          <div className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase mb-3">
            Tình huống chưa xử lý
          </div>
          <div className="flex items-baseline gap-4">
            <span className={`text-5xl lg:text-7xl font-bold tracking-tight ${criticalCount > 0 ? 'text-red-400' : 'text-foreground'}`}>
              {criticalCount}
            </span>
            <span className="text-lg text-muted-foreground">
              critical
            </span>
            {warningCount > 0 && (
              <span className="text-lg text-amber-500/70">
                + {warningCount} warning
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Total Financial Exposure */}
        <div className={`border-l-2 ${totalExposure > 100_000_000 ? 'border-red-500' : 'border-slate-700'} pl-6 lg:pl-8`}>
          <div className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase mb-3">
            Tổng thiệt hại tiềm năng
          </div>
          <div className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground">
            {totalExposure > 0 ? formatCurrency(totalExposure) : '₫0'}
          </div>
          {totalExposure > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Nếu không xử lý tất cả tình huống
            </div>
          )}
        </div>

        {/* Metric 3: Time to Next Irreversible Risk */}
        <div className={`border-l-2 ${hoursToDeadline !== null && hoursToDeadline < 24 ? 'border-red-500' : 'border-slate-700'} pl-6 lg:pl-8`}>
          <div className="text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase mb-3">
            Thời gian đến rủi ro không thể đảo ngược
          </div>
          {nearestDeadline ? (
            <>
              <div className={`text-5xl lg:text-7xl font-bold tracking-tight ${hoursToDeadline !== null && hoursToDeadline < 24 ? 'text-red-400' : 'text-foreground'}`}>
                {hoursToDeadline !== null && hoursToDeadline <= 0 
                  ? 'ĐÃ QUÁ HẠN'
                  : formatDistanceToNow(new Date(nearestDeadline), { locale: vi, addSuffix: false })
                }
              </div>
              {hoursToDeadline !== null && hoursToDeadline > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {hoursToDeadline < 24 ? 'Cần hành động ngay' : 'Deadline gần nhất'}
                </div>
              )}
            </>
          ) : (
            <div className="text-5xl lg:text-7xl font-bold tracking-tight text-emerald-400">
              —
            </div>
          )}
        </div>
      </div>

      {/* Footer - Minimal */}
      <footer className="fixed bottom-8 left-8 lg:left-16">
        <div className="text-xs text-muted-foreground/50">
          Cập nhật: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </footer>
    </div>
  );
}
