import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAIUsageData } from "@/hooks/useAIUsageData";
import { Cpu, DollarSign, Zap, TrendingUp, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AIUsagePanel() {
  const { data: stats, isLoading, error } = useAIUsageData(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="h-5 w-5" />
            Chi phí API OpenAI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cpu className="h-5 w-5" />
            Chi phí API OpenAI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Không thể tải dữ liệu usage</p>
        </CardContent>
      </Card>
    );
  }

  const formatCost = (cost: number) => {
    if (cost >= 1) return `$${cost.toFixed(2)}`;
    if (cost >= 0.01) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cpu className="h-5 w-5" />
          Chi phí API OpenAI (30 ngày)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Tổng chi phí"
            value={formatCost(stats.totalCost)}
            highlight
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="Tổng tokens"
            value={formatTokens(stats.totalTokens)}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Số requests"
            value={stats.requestCount.toString()}
          />
          <StatCard
            icon={<Cpu className="h-4 w-4" />}
            label="Tokens/request"
            value={formatTokens(stats.avgTokensPerRequest)}
          />
        </div>

        {/* Usage by Model */}
        {Object.keys(stats.byModel).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Theo Model</h4>
            <div className="space-y-2">
              {Object.entries(stats.byModel).map(([model, data]) => (
                <div key={model} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                  <span className="font-mono text-xs">{model}</span>
                  <div className="flex gap-4 text-muted-foreground">
                    <span>{data.count} calls</span>
                    <span>{formatTokens(data.tokens)} tokens</span>
                    <span className="font-medium text-foreground">{formatCost(data.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Chart */}
        {stats.byDay.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Xu hướng sử dụng</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.byDay}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatTokens(v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-2 shadow-lg">
                          <p className="text-xs font-medium">{new Date(label).toLocaleDateString('vi-VN')}</p>
                          <p className="text-xs text-muted-foreground">Tokens: {formatTokens(data.tokens)}</p>
                          <p className="text-xs text-muted-foreground">Chi phí: {formatCost(data.cost)}</p>
                          <p className="text-xs text-muted-foreground">Requests: {data.count}</p>
                        </div>
                      );
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorTokens)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {stats.requestCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Chưa có dữ liệu sử dụng API trong 30 ngày qua
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  highlight 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}
