import { memo, useState } from 'react';
import { Save, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TrackingRowData {
  month: string;
  monthIndex: number;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  isPast: boolean;
  isCurrent: boolean;
  status: string;
}

interface TrackingTableProps {
  trackingData: TrackingRowData[];
  formatValue: (value: number) => string;
  onSaveActual?: (month: number, value: number) => void;
}

export const TrackingTable = memo(function TrackingTable({
  trackingData,
  formatValue,
  onSaveActual,
}: TrackingTableProps) {
  const [editingActualMonth, setEditingActualMonth] = useState<number | null>(null);
  const [editingActualValue, setEditingActualValue] = useState<string>('');

  const handleSaveActual = (month: number) => {
    const value = parseFloat(editingActualValue) * 1000000;
    if (!isNaN(value) && onSaveActual) {
      onSaveActual(month, value);
      setEditingActualMonth(null);
      setEditingActualValue('');
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3">Tháng</th>
            <th className="text-right p-3">Kế hoạch</th>
            <th className="text-right p-3">Thực tế</th>
            <th className="text-right p-3">Chênh lệch</th>
            <th className="text-center p-3">Trạng thái</th>
            <th className="text-center p-3">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {trackingData.map((row, idx) => (
            <tr
              key={row.month}
              className={cn(
                'border-t',
                row.isCurrent && 'bg-warning/5',
                !row.isPast && !row.isCurrent && 'opacity-50'
              )}
            >
              <td className="p-3 font-medium">
                {row.month}
                {row.isCurrent && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Hiện tại
                  </Badge>
                )}
              </td>
              <td className="p-3 text-right">{formatValue(row.planned)}</td>
              <td className="p-3 text-right">
                {editingActualMonth === idx ? (
                  <div className="flex items-center gap-1 justify-end">
                    <Input
                      type="number"
                      value={editingActualValue}
                      onChange={(e) => setEditingActualValue(e.target.value)}
                      className="w-24 h-7 text-right text-sm"
                      placeholder="triệu"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleSaveActual(idx + 1)}
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={
                      row.actual > 0 ? 'text-success font-medium' : 'text-muted-foreground'
                    }
                  >
                    {row.actual > 0 ? formatValue(row.actual) : '—'}
                  </span>
                )}
              </td>
              <td
                className={cn(
                  'p-3 text-right font-medium',
                  row.isPast && (row.variance >= 0 ? 'text-success' : 'text-destructive')
                )}
              >
                {row.isPast && row.actual > 0 ? (
                  <>
                    {row.variance >= 0 ? '+' : ''}
                    {formatValue(row.variance)}
                    <span className="text-xs ml-1">
                      ({row.variancePercent >= 0 ? '+' : ''}
                      {row.variancePercent.toFixed(1)}%)
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td className="p-3 text-center">
                {row.isPast ? (
                  <Badge
                    variant={row.variancePercent >= -5 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {row.variancePercent >= -5 ? 'Đạt' : 'Chưa đạt'}
                  </Badge>
                ) : row.isCurrent ? (
                  <Badge variant="outline" className="text-xs text-warning border-warning/30">
                    Đang thực hiện
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Chờ</span>
                )}
              </td>
              <td className="p-3 text-center">
                {(row.isPast || row.isCurrent) && onSaveActual && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingActualMonth(idx);
                      setEditingActualValue(
                        row.actual > 0 ? String(Math.round(row.actual / 1000000)) : ''
                      );
                    }}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
