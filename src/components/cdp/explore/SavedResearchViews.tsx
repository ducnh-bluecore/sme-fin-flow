import { 
  Bookmark, 
  Eye, 
  FileText, 
  Link2, 
  Calendar,
  User,
  Users,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface SavedResearchView {
  id: string;
  name: string;
  description: string;
  creator: string;
  createdAt: Date;
  customerCount: number;
  revenueShare: number;
  purpose: 'exploration' | 'hypothesis' | 'monitoring' | 'decision';
  linkedInsights: number;
  linkedDecisions: number;
}

const mockSavedViews: SavedResearchView[] = [
  {
    id: 'v1',
    name: 'Top 20% khách hàng giá trị cao',
    description: 'Nhóm khách hàng đóng góp 65% doanh thu, cần ưu tiên giữ chân',
    creator: 'CFO',
    createdAt: new Date('2025-01-15'),
    customerCount: 2450,
    revenueShare: 65.2,
    purpose: 'monitoring',
    linkedInsights: 3,
    linkedDecisions: 1,
  },
  {
    id: 'v2',
    name: 'Khách có AOV giảm > 20% (Q4)',
    description: 'Giả thuyết: Nhóm khách bị ảnh hưởng bởi cạnh tranh giá',
    creator: 'Growth Lead',
    createdAt: new Date('2025-01-12'),
    customerCount: 890,
    revenueShare: 12.5,
    purpose: 'hypothesis',
    linkedInsights: 1,
    linkedDecisions: 0,
  },
  {
    id: 'v3',
    name: 'Cohort khách mới tháng 12/2024',
    description: 'Theo dõi hành vi khách hàng mới để đánh giá chất lượng acquisition',
    creator: 'Marketing',
    createdAt: new Date('2025-01-08'),
    customerCount: 1234,
    revenueShare: 8.3,
    purpose: 'exploration',
    linkedInsights: 0,
    linkedDecisions: 0,
  },
  {
    id: 'v4',
    name: 'Rủi ro hoàn trả cao + COD > 80%',
    description: 'Nhóm khách cần đánh giá lại chính sách bán hàng',
    creator: 'Operations',
    createdAt: new Date('2025-01-05'),
    customerCount: 456,
    revenueShare: 4.2,
    purpose: 'decision',
    linkedInsights: 2,
    linkedDecisions: 1,
  },
];

const purposeLabels: Record<string, { label: string; className: string }> = {
  exploration: { label: 'Khám phá', className: 'bg-primary/10 text-primary border-primary/20' },
  hypothesis: { label: 'Giả thuyết', className: 'bg-warning/10 text-warning border-warning/20' },
  monitoring: { label: 'Theo dõi', className: 'bg-success/10 text-success border-success/20' },
  decision: { label: 'Quyết định', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export function SavedResearchViews() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bookmark className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Góc nhìn nghiên cứu đã lưu</p>
                <p className="text-xs text-muted-foreground">
                  {mockSavedViews.length} góc nhìn • Được sử dụng cho phân tích và quyết định
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Views List */}
      <div className="space-y-4">
        {mockSavedViews.map((view) => (
          <Card key={view.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{view.name}</h3>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", purposeLabels[view.purpose].className)}
                    >
                      {purposeLabels[view.purpose].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{view.description}</p>
                  
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{view.creator}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(view.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{view.customerCount.toLocaleString()} khách</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{view.revenueShare.toFixed(1)}% doanh thu</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Linked Items */}
                  {(view.linkedInsights > 0 || view.linkedDecisions > 0) && (
                    <div className="flex items-center gap-2 mr-2 text-xs text-muted-foreground">
                      {view.linkedInsights > 0 && (
                        <span className="flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {view.linkedInsights} insight
                        </span>
                      )}
                      {view.linkedDecisions > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {view.linkedDecisions} quyết định
                        </span>
                      )}
                    </div>
                  )}

                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Mở lại
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <FileText className="w-4 h-4 mr-2" />
                        Tạo Thẻ Quyết định
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link2 className="w-4 h-4 mr-2" />
                        Gắn làm bằng chứng Insight
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Xóa góc nhìn
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State Note */}
      {mockSavedViews.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-sm font-medium mb-1">Chưa có góc nhìn nào được lưu</p>
            <p className="text-xs text-muted-foreground">
              Sử dụng bộ lọc để tạo góc nhìn nghiên cứu và lưu lại
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
