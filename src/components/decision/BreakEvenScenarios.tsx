import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, TrendingUp, ShieldCheck, ShieldAlert } from 'lucide-react';

interface BreakEvenScenario {
  variable: string;
  changeToBreakEven: number; // % change needed to reach break-even
  direction: 'increase' | 'decrease';
  riskLevel: 'low' | 'medium' | 'high';
  currentValue?: number;
}

interface BreakEvenScenariosProps {
  scenarios: BreakEvenScenario[];
  baseProfit: number;
  title?: string;
}

export function BreakEvenScenarios({ 
  scenarios, 
  baseProfit,
  title = 'Kịch bản Hòa vốn' 
}: BreakEvenScenariosProps) {
  const sortedScenarios = useMemo(() => {
    return [...scenarios].sort((a, b) => 
      Math.abs(a.changeToBreakEven) - Math.abs(b.changeToBreakEven)
    );
  }, [scenarios]);

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high':
        return <Badge variant="destructive">Rủi ro cao</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Cần theo dõi</Badge>;
      default:
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">An toàn</Badge>;
    }
  };

  const getRiskBackground = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10';
      case 'medium':
        return 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10';
      default:
        return 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mức thay đổi tối đa trước khi lợi nhuận = 0
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedScenarios.map((scenario, index) => (
            <motion.div
              key={scenario.variable}
              className={`p-4 rounded-lg border transition-colors ${getRiskBackground(scenario.riskLevel)}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getRiskIcon(scenario.riskLevel)}
                  <div>
                    <p className="font-medium">{scenario.variable}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {scenario.direction === 'decrease' ? (
                        <>
                          <TrendingDown className="inline h-3 w-3 mr-1" />
                          Giảm {Math.abs(scenario.changeToBreakEven).toFixed(1)}%
                        </>
                      ) : (
                        <>
                          <TrendingUp className="inline h-3 w-3 mr-1" />
                          Tăng {Math.abs(scenario.changeToBreakEven).toFixed(1)}%
                        </>
                      )}
                      {' '}→ Hòa vốn
                    </p>
                  </div>
                </div>
                {getRiskBadge(scenario.riskLevel)}
              </div>

              {/* Progress bar showing how close to break-even */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>0%</span>
                  <span className="font-medium">
                    Buffer: {Math.abs(scenario.changeToBreakEven).toFixed(1)}%
                  </span>
                  <span>{Math.abs(scenario.changeToBreakEven) > 50 ? '50%+' : `${Math.abs(scenario.changeToBreakEven).toFixed(0)}%`}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      scenario.riskLevel === 'high' 
                        ? 'bg-red-500' 
                        : scenario.riskLevel === 'medium' 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.min(Math.abs(scenario.changeToBreakEven) * 2, 100)}%` 
                    }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Biến nhạy nhất:</span>
            <span className="font-medium text-red-500">
              {sortedScenarios[0]?.variable} ({Math.abs(sortedScenarios[0]?.changeToBreakEven || 0).toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Biến an toàn nhất:</span>
            <span className="font-medium text-green-500">
              {sortedScenarios[sortedScenarios.length - 1]?.variable} ({Math.abs(sortedScenarios[sortedScenarios.length - 1]?.changeToBreakEven || 0).toFixed(1)}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
