import { useState } from 'react';
import { 
  DollarSign, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Database,
  CheckCircle2,
  XCircle,
  Settings,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Import from hook for type consistency
import type { InsightRegistryItem } from '@/hooks/useCDPInsightRegistry';

interface InsightRegistryTableProps {
  insights: InsightRegistryItem[];
  onToggle: (code: string, enabled: boolean) => void;
}

const topicIcons: Record<string, typeof DollarSign> = {
  'Giá trị': DollarSign,
  'Thời gian mua': Clock,
  'Cơ cấu': Layers,
  'Rủi ro': ShieldAlert,
  'Chất lượng': Database,
};

const ownerColors: Record<string, string> = {
  'CEO': 'bg-blue-50 text-blue-700 border-blue-200',
  'CFO': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'COO': 'bg-purple-50 text-purple-700 border-purple-200',
};

export function InsightRegistryTable({ insights, onToggle }: InsightRegistryTableProps) {
  // Group by topic
  const groupedByTopic: Record<string, InsightRegistryItem[]> = {};
  for (const insight of insights) {
    if (!groupedByTopic[insight.topic]) groupedByTopic[insight.topic] = [];
    groupedByTopic[insight.topic].push(insight);
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedByTopic).map(([topic, items]) => {
        const TopicIcon = topicIcons[topic] || Info;
        const triggeredCount = items.filter(i => i.isTriggered).length;
        const enabledCount = items.filter(i => i.isEnabled).length;

        return (
          <Card key={topic}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TopicIcon className="w-5 h-5 text-muted-foreground" />
                  {topic}
                  <Badge variant="outline" className="ml-2">
                    {items.length} insight
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  {triggeredCount > 0 && (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                      {triggeredCount} đang phát hiện
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {enabledCount}/{items.length} đang theo dõi
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Mã</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead className="w-[180px]">Ngưỡng</TableHead>
                    <TableHead className="w-[100px]">Cooldown</TableHead>
                    <TableHead className="w-[140px]">Vai trò</TableHead>
                    <TableHead className="w-[80px]">Trạng thái</TableHead>
                    <TableHead className="w-[60px] text-right">Theo dõi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((insight) => (
                    <TableRow 
                      key={insight.code}
                      className={cn(
                        insight.isTriggered && 'bg-destructive/5'
                      )}
                    >
                      <TableCell className="font-mono text-xs">
                        {insight.code}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {insight.name}
                                </span>
                                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">{insight.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {insight.threshold}
                      </TableCell>
                      <TableCell className="text-xs">
                        {insight.cooldownDays} ngày
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {insight.owners.map((owner) => (
                            <Badge 
                              key={owner} 
                              variant="outline" 
                              className={cn('text-[10px] px-1.5', ownerColors[owner])}
                            >
                              {owner}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {insight.isTriggered ? (
                          <Badge className="bg-destructive/10 text-destructive text-[10px]">
                            <XCircle className="w-3 h-3 mr-1" />
                            Phát hiện
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Bình thường
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={insight.isEnabled}
                          onCheckedChange={(checked) => onToggle(insight.code, checked)}
                          className="scale-90"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
