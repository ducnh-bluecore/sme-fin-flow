import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Megaphone, 
  ArrowUpDown,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { MarketingPerformance } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CampaignPerformanceTableProps {
  campaigns: MarketingPerformance[];
}

type SortField = 'spend' | 'orders' | 'revenue' | 'cpa' | 'roas';

export function CampaignPerformanceTable({ campaigns }: CampaignPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const channels = useMemo(() => {
    const unique = [...new Set(campaigns.map(c => c.channel))];
    return unique.sort();
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.campaign_name.toLowerCase().includes(search.toLowerCase());
      const matchesChannel = channelFilter === 'all' || c.channel === channelFilter;
      return matchesSearch && matchesChannel;
    });
  }, [campaigns, search, channelFilter]);

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });
  }, [filteredCampaigns, sortField, sortAsc]);

  const displayedCampaigns = showAll ? sortedCampaigns : sortedCampaigns.slice(0, 10);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getStatusBadge = (status: MarketingPerformance['status']) => {
    const config = {
      active: { label: 'Active', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      paused: { label: 'Paused', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      ended: { label: 'Ended', className: 'bg-muted text-muted-foreground border-border' },
    };
    return config[status];
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Campaign Performance</CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredCampaigns.length} campaigns
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm campaign..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-40 md:w-48"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-9 w-32">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {channels.map(channel => (
                  <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Channel</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Spend <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('orders')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Orders <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Revenue <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('cpa')}
                >
                  <div className="flex items-center justify-end gap-1">
                    CPA <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('roas')}
                >
                  <div className="flex items-center justify-end gap-1">
                    ROAS <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy campaign nào
                  </TableCell>
                </TableRow>
              ) : (
                displayedCampaigns.map((campaign) => {
                  const statusConfig = getStatusBadge(campaign.status);
                  return (
                    <TableRow key={campaign.campaign_id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">
                        {campaign.campaign_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {campaign.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs", statusConfig.className)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(campaign.spend)}đ
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {campaign.orders.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(campaign.revenue)}đ
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-medium",
                        campaign.cpa < 100000 ? "text-green-400" : 
                        campaign.cpa < 200000 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {formatCurrency(campaign.cpa)}đ
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-medium",
                        campaign.roas >= 2 ? "text-green-400" : 
                        campaign.roas >= 1 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {campaign.roas.toFixed(2)}x
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {sortedCampaigns.length > 10 && (
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>Thu gọn <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Xem tất cả {sortedCampaigns.length} campaigns <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
