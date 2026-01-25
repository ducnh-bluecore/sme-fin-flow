import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, User, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface DecisionCardData {
  id: string;
  title: string;
  sourceInsights: string[];
  sourceEquity?: boolean;
  severity: 'low' | 'medium' | 'high';
  priority: number;
  owner: 'CEO' | 'CFO' | 'COO';
  reviewDeadline: string;
  status: 'new' | 'reviewing' | 'decided' | 'archived';
  createdAt: string;
  populationSize?: number;
  equityImpact?: number;
  problemStatement?: string; // Added to show direct insight on card
}

interface DecisionQueueCardProps {
  card: DecisionCardData;
}

const statusStyles = {
  new: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20', label: 'Mới' },
  reviewing: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20', label: 'Đang xem xét' },
  decided: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', label: 'Đã quyết' },
  archived: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', label: 'Lưu trữ' },
};

const severityStyles = {
  low: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Thấp' },
  medium: { bg: 'bg-warning/10', text: 'text-warning-foreground', label: 'Trung bình' },
  high: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Cao' },
};

const ownerStyles = {
  CEO: 'bg-primary/10 text-primary border-primary/20',
  CFO: 'bg-info/10 text-info border-info/20',
  COO: 'bg-muted text-muted-foreground border-muted',
};

export function DecisionQueueCard({ card }: DecisionQueueCardProps) {
  const navigate = useNavigate();
  const statusStyle = statusStyles[card.status];
  const severityStyle = severityStyles[card.severity];

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
    return value.toLocaleString('vi-VN');
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => navigate(`/cdp/decisions/${card.id}`)}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
              >
                {statusStyle.label}
              </Badge>
              <Badge 
                variant="outline" 
                className={`${severityStyle.bg} ${severityStyle.text}`}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {severityStyle.label}
              </Badge>
              <Badge variant="outline" className={ownerStyles[card.owner]}>
                <User className="w-3 h-3 mr-1" />
                {card.owner}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="font-medium text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
              {card.title}
            </h3>

            {/* Problem Statement - Direct Insight */}
            {card.problemStatement && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2 bg-muted/50 px-2 py-1.5 rounded">
                {card.problemStatement}
              </p>
            )}

            {/* Source & Meta */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Nguồn: {card.sourceInsights.join(', ')}
              </span>
              {card.reviewDeadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Hạn: {card.reviewDeadline}
                </span>
              )}
            </div>

            {/* Impact Info */}
            {(card.populationSize || card.equityImpact) && (
              <div className="flex items-center gap-4 mt-2 text-xs">
                {card.populationSize > 0 && (
                  <span className="text-muted-foreground">
                    {card.populationSize.toLocaleString()} khách hàng bị ảnh hưởng
                  </span>
                )}
                {card.equityImpact > 0 && (
                  <span className="text-destructive font-medium">
                    Rủi ro: ₫{formatCurrency(card.equityImpact)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 self-center">
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
