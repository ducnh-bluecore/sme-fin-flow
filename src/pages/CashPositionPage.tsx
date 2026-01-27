/**
 * CashPositionPage - Dedicated dashboard for cash visibility
 * 
 * FDP Manifesto Principle #4: Real Cash
 * Phân biệt rõ ràng:
 * - Cash đã về (bank balance)
 * - Cash sẽ về (AR không quá hạn)
 * - Cash nguy cơ không về (AR quá hạn > 90 ngày)
 * - Cash bị khóa (inventory, ads, ops, platform)
 */

import { motion } from 'framer-motion';
import { Wallet, RefreshCw, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceTruthSnapshot, useRefreshFinanceSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useCashRunway } from '@/hooks/useCashRunway';
import RealCashBreakdown from '@/components/dashboard/RealCashBreakdown';
import { LockedCashDrilldown } from '@/components/fdp/LockedCashDrilldown';
import { formatVNDCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

function CashRunwayCard() {
  const { data: cashRunway, isLoading } = useCashRunway();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }
  
  const runway = cashRunway?.runwayMonths || 0;
  const burnRate = cashRunway?.avgMonthlyBurn || 0;
  
  const getRunwayStatus = () => {
    if (runway < 3) return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Nguy hiểm' };
    if (runway < 6) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Cần theo dõi' };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'An toàn' };
  };
  
  const status = getRunwayStatus();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Cash Runway
          </CardTitle>
          <Badge className={cn(status.bg, status.color, 'border-none')}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className={cn("p-4 rounded-lg", status.bg)}>
            <p className="text-sm text-muted-foreground">Runway</p>
            <p className={cn("text-3xl font-bold", status.color)}>
              {runway.toFixed(1)} <span className="text-lg font-normal">tháng</span>
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Burn Rate</p>
            <p className="text-2xl font-bold">
              {formatVNDCompact(burnRate)}<span className="text-sm font-normal text-muted-foreground">/tháng</span>
            </p>
          </div>
        </div>
        
        {runway < 6 && (
          <div className={cn(
            "p-3 rounded-lg border flex items-start gap-2",
            runway < 3 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
          )}>
            <AlertTriangle className={cn("h-4 w-4 mt-0.5", runway < 3 ? 'text-red-500' : 'text-amber-500')} />
            <div className="text-sm">
              <p className={cn("font-medium", runway < 3 ? 'text-red-500' : 'text-amber-500')}>
                {runway < 3 ? 'Cảnh báo: Runway quá thấp' : 'Runway cần được cải thiện'}
              </p>
              <p className="text-muted-foreground mt-1">
                {runway < 3 
                  ? 'Cần hành động ngay: cắt giảm chi phí hoặc tăng thu' 
                  : 'Xem xét tối ưu chi phí để kéo dài runway'}
              </p>
            </div>
          </div>
        )}
        
        <Link to="/cash-forecast">
          <Button variant="outline" className="w-full">
            Xem dự báo chi tiết
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const { mutate: refresh, isPending } = useRefreshFinanceSnapshot();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Hành động nhanh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => refresh()}
          disabled={isPending}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
          Cập nhật số liệu
        </Button>
        <Link to="/ar-operations" className="block">
          <Button variant="outline" className="w-full justify-start">
            <Wallet className="h-4 w-4 mr-2" />
            Quản lý AR/AP
          </Button>
        </Link>
        <Link to="/working-capital-hub" className="block">
          <Button variant="outline" className="w-full justify-start">
            <TrendingUp className="h-4 w-4 mr-2" />
            Working Capital Hub
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function CashPositionPage() {
  const { data: snapshot, isLoading } = useFinanceTruthSnapshot();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-7 w-7 text-primary" />
            Cash Position Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi dòng tiền thật - Tiền đã về, sẽ về, và đang bị khóa
          </p>
        </div>
        
        {snapshot && !snapshot.isStale && (
          <Badge variant="outline" className="self-start text-xs">
            Cập nhật: {new Date(snapshot.snapshotAt).toLocaleString('vi-VN')}
          </Badge>
        )}
        
        {snapshot?.isStale && (
          <Badge variant="secondary" className="self-start text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
            Dữ liệu cũ - đang cập nhật
          </Badge>
        )}
      </div>
      
      {/* Key Metrics Summary */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : snapshot && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Cash đã về</p>
              <p className="text-2xl font-bold text-emerald-500">
                {formatVNDCompact(snapshot.cashToday)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Cash sẽ về (AR)</p>
              <p className="text-2xl font-bold text-blue-500">
                {formatVNDCompact(snapshot.totalAR - snapshot.overdueAR)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Nguy cơ không về</p>
              <p className="text-2xl font-bold text-red-500">
                {formatVNDCompact(snapshot.overdueAR)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Cash bị khóa</p>
              <p className="text-2xl font-bold text-amber-500">
                {formatVNDCompact(snapshot.lockedCashTotal || snapshot.totalInventoryValue)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Real Cash Breakdown */}
        <div className="lg:col-span-2">
          <RealCashBreakdown />
        </div>
        
        {/* Right: Runway + Quick Actions */}
        <div className="space-y-4">
          <CashRunwayCard />
          <QuickActions />
        </div>
      </div>
      
      {/* Locked Cash Drilldown */}
      <LockedCashDrilldown />
    </motion.div>
  );
}
