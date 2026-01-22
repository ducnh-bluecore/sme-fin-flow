import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronRight,
  Layers,
  Calendar,
  BarChart3
} from 'lucide-react';
import { formatVNDCompact, formatPercent } from '@/lib/formatters';

export interface PopulationItem {
  id: string;
  name: string;
  type: 'segment' | 'cohort' | 'tier';
  definition: string;
  size: number;
  revenueShare: number;
  equityShare?: number;
  stability: 'stable' | 'drifting' | 'volatile';
  insightCount: number;
}

interface PopulationCatalogTableProps {
  populations: PopulationItem[];
  isLoading?: boolean;
}

function StabilityBadge({ stability }: { stability: 'stable' | 'drifting' | 'volatile' }) {
  const styles = {
    stable: { 
      bg: 'bg-success/10', 
      text: 'text-success', 
      border: 'border-success/20', 
      icon: Minus, 
      label: 'Ổn định' 
    },
    drifting: { 
      bg: 'bg-warning/10', 
      text: 'text-warning-foreground', 
      border: 'border-warning/20', 
      icon: TrendingUp, 
      label: 'Đang biến động' 
    },
    volatile: { 
      bg: 'bg-destructive/10', 
      text: 'text-destructive', 
      border: 'border-destructive/20', 
      icon: TrendingDown, 
      label: 'Biến động mạnh' 
    }
  };
  
  const style = styles[stability];
  const Icon = style.icon;
  
  return (
    <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border}`}>
      <Icon className="w-3 h-3 mr-1" />
      {style.label}
    </Badge>
  );
}

function TypeBadge({ type }: { type: 'segment' | 'cohort' | 'tier' }) {
  const configs = {
    segment: { 
      label: 'Phân khúc', 
      icon: Layers, 
      className: 'bg-info/10 text-info border-info/20' 
    },
    cohort: { 
      label: 'Cohort', 
      icon: Calendar, 
      className: 'bg-primary/10 text-primary border-primary/20' 
    },
    tier: { 
      label: 'Nhóm giá trị', 
      icon: BarChart3, 
      className: 'bg-warning/10 text-warning-foreground border-warning/20' 
    }
  };
  
  const config = configs[type];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`${config.className} gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export function PopulationCatalogTable({ populations, isLoading }: PopulationCatalogTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (populations.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium">Chưa có tập khách nào được định nghĩa</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tập khách được cấu hình trong CDP registry
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[280px]">Tên tập khách</TableHead>
            <TableHead className="w-[120px]">Loại</TableHead>
            <TableHead className="text-right w-[100px]">Quy mô</TableHead>
            <TableHead className="text-right w-[120px]">Tỷ trọng DT</TableHead>
            <TableHead className="w-[140px]">Độ ổn định</TableHead>
            <TableHead className="text-right w-[80px]">Insight</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {populations.map((pop) => (
            <TableRow 
              key={pop.id} 
              className="group hover:bg-muted/30 cursor-pointer"
            >
              <TableCell>
                <Link 
                  to={`/cdp/populations/${pop.id}`}
                  className="block"
                >
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {pop.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {pop.definition}
                  </p>
                </Link>
              </TableCell>
              <TableCell>
                <TypeBadge type={pop.type} />
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {pop.size.toLocaleString('vi-VN')}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatPercent(pop.revenueShare / 100)}
              </TableCell>
              <TableCell>
                <StabilityBadge stability={pop.stability} />
              </TableCell>
              <TableCell className="text-right">
                {pop.insightCount > 0 ? (
                  <Badge variant="secondary" className="font-normal">
                    {pop.insightCount}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Link 
                  to={`/cdp/populations/${pop.id}`}
                  className="text-muted-foreground group-hover:text-primary transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
