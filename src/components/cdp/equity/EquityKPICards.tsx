import { TrendingUp, TrendingDown, AlertTriangle, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCDPEquityOverview } from '@/hooks/useCDPEquity';
import { Skeleton } from '@/components/ui/skeleton';
import { CDPEmptyState } from '@/components/cdp/CDPEmptyState';
import { CDP_MINIMUM_THRESHOLDS, type CDPDataQuality, createAvailableMetric, createUnavailableMetric } from '@/types/cdp-ssot';
import { useNavigate } from 'react-router-dom';

interface EquityKPICardsProps {
  timeframe?: '12' | '24';
}

export function EquityKPICards({ timeframe = '12' }: EquityKPICardsProps) {
  const { data: equityData, isLoading, error } = useCDPEquityOverview();
  const navigate = useNavigate();

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)} triệu`;
    }
    return value.toLocaleString('vi-VN') + ' đ';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
        <Card className="border-warning/30">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // CDP Manifesto: Show empty state if data insufficient - NO FALLBACKS
  if (!equityData || error) {
    const dataQuality: CDPDataQuality = {
      overall_score: 0,
      quality_level: 'insufficient',
      identity_coverage: createUnavailableMetric(0, 'Không có dữ liệu'),
      cogs_coverage: createUnavailableMetric(0, 'Không có dữ liệu'),
      order_coverage: createUnavailableMetric(0, 'Không có dữ liệu'),
      days_since_last_order: 999,
      data_freshness_level: 'very_stale',
      minimum_customers_required: CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY,
      minimum_orders_required: CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV,
      actual_customers: 0,
      actual_orders: 0,
      is_sufficient_for_insights: false,
      is_sufficient_for_equity: false,
      issues: [{
        id: 'no_equity_data',
        severity: 'critical',
        label: 'Chưa có dữ liệu Customer Equity',
        action: 'Import dữ liệu đơn hàng để tính toán LTV'
      }]
    };

    return (
      <CDPEmptyState
        reason="Chưa đủ dữ liệu để tính Customer Equity. Cần import thêm đơn hàng khách hàng."
        dataQuality={dataQuality}
        onImportClick={() => navigate('/connectors')}
      />
    );
  }

  // Data comes from DB view - no fallbacks
  const totalEquity = timeframe === '12' 
    ? equityData.total_equity_12m
    : equityData.total_equity_24m;
  const equityChange = equityData.equity_change;
  const atRiskValue = equityData.at_risk_value;
  const atRiskPercent = equityData.at_risk_percent;

  // If the view row exists but key metrics are NULL, treat as insufficient data
  if (totalEquity == null && atRiskValue == null) {
    const dataQuality: CDPDataQuality = {
      overall_score: 0,
      quality_level: 'insufficient',
      identity_coverage: createUnavailableMetric(0, 'Chưa đủ dữ liệu'),
      cogs_coverage: createUnavailableMetric(0, 'Chưa đủ dữ liệu'),
      order_coverage: createUnavailableMetric(0, 'Chưa đủ dữ liệu'),
      days_since_last_order: 999,
      data_freshness_level: 'very_stale',
      minimum_customers_required: CDP_MINIMUM_THRESHOLDS.MIN_CUSTOMERS_FOR_EQUITY,
      minimum_orders_required: CDP_MINIMUM_THRESHOLDS.MIN_ORDERS_FOR_LTV,
      actual_customers: 0,
      actual_orders: 0,
      is_sufficient_for_insights: false,
      is_sufficient_for_equity: false,
      issues: [{
        id: 'equity_null_metrics',
        severity: 'critical',
        label: 'Dữ liệu Customer Equity chưa được tính',
        action: 'Import dữ liệu & chạy build để tính toán LTV'
      }]
    };

    return (
      <CDPEmptyState
        reason="Chưa đủ dữ liệu để hiển thị Customer Equity. Hệ thống chưa tính ra các metric chính."
        dataQuality={dataQuality}
        onImportClick={() => navigate('/connectors')}
      />
    );
  }

  const isPositiveChange = (equityChange ?? 0) >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Total Equity */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Tổng Giá trị Kỳ vọng ({timeframe} tháng)
              </p>
              <p className="text-3xl font-bold text-primary">
                ₫{formatCurrency(totalEquity)}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                isPositiveChange ? 'text-success' : 'text-destructive'
              }`}>
                {isPositiveChange ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>
                  {equityChange == null ? '—' : `${isPositiveChange ? '+' : ''}${equityChange.toFixed(1)}% so với kỳ trước`}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Doanh thu dự kiến thu được từ tập khách hàng hiện tại trong {timeframe} tháng tới
          </p>
        </CardContent>
      </Card>

      {/* At-Risk Value */}
      <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Giá trị Đang có Rủi ro
              </p>
              <p className="text-3xl font-bold text-warning-foreground">
                ₫{formatCurrency(atRiskValue)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm text-warning-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span>{atRiskPercent == null ? '—' : `${atRiskPercent.toFixed(1)}% tổng giá trị`}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Giá trị có nguy cơ suy giảm nếu hành vi hiện tại tiếp diễn
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
