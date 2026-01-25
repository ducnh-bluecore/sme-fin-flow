/**
 * Product Forecast List
 * Hiển thị danh sách các dự báo đã tạo
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { TrendingUp, Users, Package, MoreHorizontal, Eye, Archive, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProductForecast } from '@/hooks/cdp/useProductForecast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ProductForecastListProps {
  forecasts: ProductForecast[];
}

export function ProductForecastList({ forecasts }: ProductForecastListProps) {
  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Cao</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Trung bình</Badge>;
      case 'low':
        return <Badge variant="default" className="bg-red-100 text-red-700 hover:bg-red-100">Thấp</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Đang theo dõi</Badge>;
      case 'draft':
        return <Badge variant="secondary">Nháp</Badge>;
      case 'archived':
        return <Badge variant="outline">Đã lưu trữ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Danh sách Dự báo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên dự báo</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-center">KH phù hợp</TableHead>
              <TableHead className="text-center">Ước tính (Cũ)</TableHead>
              <TableHead className="text-center">Ước tính (Mới)</TableHead>
              <TableHead className="text-center">Tổng</TableHead>
              <TableHead className="text-center">Confidence</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Ngày tạo</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forecasts.map((forecast) => {
              const productDef = forecast.product_definition as {
                category?: string;
                price_tier?: string;
              };

              return (
                <TableRow key={forecast.id}>
                  <TableCell>
                    <div className="font-medium">{forecast.forecast_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{productDef.category || '-'}</span>
                      {productDef.price_tier && (
                        <Badge variant="outline" className="text-xs">
                          {productDef.price_tier}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{forecast.matched_customer_count.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-green-600 font-medium">
                      {forecast.estimated_existing_orders}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-amber-600">
                      ~{forecast.estimated_new_orders}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-primary">
                      {forecast.estimated_total_orders}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getConfidenceBadge(forecast.confidence_level)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(forecast.status)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {format(new Date(forecast.created_at), 'dd/MM/yyyy', { locale: vi })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Lưu trữ
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {forecasts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Chưa có dự báo nào
          </div>
        )}
      </CardContent>
    </Card>
  );
}
