import { BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface RFMScore {
  r: number;
  f: number;
  m: number;
}

interface RFMVerificationBlockProps {
  rfmScore: RFMScore;
  clv: number;
  avgClvSegment: number;
  segmentName?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} tỷ`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}tr`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString('vi-VN');
}

export function RFMVerificationBlock({
  rfmScore,
  clv,
  avgClvSegment,
  segmentName = 'Tập tương đương'
}: RFMVerificationBlockProps) {
  const clvDiff = clv - avgClvSegment;
  const clvDiffPercent = ((clv - avgClvSegment) / avgClvSegment * 100).toFixed(1);

  const rfmLabels = {
    r: 'Recency',
    f: 'Frequency',
    m: 'Monetary'
  };

  const rfmDescriptions = {
    r: 'Thời gian từ lần mua gần nhất',
    f: 'Tần suất mua hàng',
    m: 'Giá trị tiền tệ'
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              RFM / CLV Kiểm chứng
            </CardTitle>
            <CardDescription>
              Dùng để kiểm chứng logic tính toán – không đánh giá khách hàng
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-normal text-xs">
            Kiểm chứng
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* RFM Scores */}
        <div>
          <h4 className="text-sm font-medium mb-3">Điểm RFM</h4>
          <div className="grid grid-cols-3 gap-4">
            {(['r', 'f', 'm'] as const).map((key) => (
              <div key={key} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {rfmLabels[key]}
                  </span>
                  <span className="text-lg font-bold">{rfmScore[key]}</span>
                </div>
                <Progress value={rfmScore[key] * 20} className="h-1.5 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {rfmDescriptions[key]}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Thang điểm 1-5: 1 = thấp nhất, 5 = cao nhất
          </p>
        </div>

        <Separator />

        {/* CLV Comparison */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            So sánh CLV với tập tương đương
          </h4>
          
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Customer CLV */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">CLV khách này</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(clv)}</p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
              </div>

              {/* Segment Average */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Trung bình {segmentName}</p>
                <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                  {formatCurrency(avgClvSegment)}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Difference */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">Chênh lệch:</span>
              <span className={cn(
                "text-lg font-bold tabular-nums",
                clvDiff > 0 ? "text-success" : clvDiff < 0 ? "text-destructive" : ""
              )}>
                {clvDiff > 0 ? '+' : ''}{formatCurrency(clvDiff)}
              </span>
              <Badge 
                variant="outline"
                className={cn(
                  "font-normal",
                  clvDiff > 0 
                    ? "bg-success/10 text-success border-success/20" 
                    : clvDiff < 0 
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : ""
                )}
              >
                {clvDiff > 0 ? '+' : ''}{clvDiffPercent}%
              </Badge>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            Mục tiêu: Kiểm chứng logic tính toán CLV – không dùng để đánh giá hay gắn nhãn khách hàng
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
