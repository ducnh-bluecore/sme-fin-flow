import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  History,
  User,
  FileEdit,
  Plus,
  Lock,
  Shield
} from 'lucide-react';

interface ChangeLogEntry {
  id: string;
  populationName: string;
  action: 'created' | 'updated' | 'locked';
  changedBy: string;
  changedAt: string;
  version: string;
  purpose: string;
  changes?: string;
}

interface PopulationGovernanceProps {
  changeLog: ChangeLogEntry[];
  isLoading?: boolean;
}

function ActionBadge({ action }: { action: 'created' | 'updated' | 'locked' }) {
  const configs = {
    created: { 
      icon: Plus, 
      label: 'Tạo mới', 
      className: 'bg-success/10 text-success border-success/20' 
    },
    updated: { 
      icon: FileEdit, 
      label: 'Cập nhật', 
      className: 'bg-info/10 text-info border-info/20' 
    },
    locked: { 
      icon: Lock, 
      label: 'Khóa', 
      className: 'bg-warning/10 text-warning-foreground border-warning/20' 
    }
  };
  
  const config = configs[action];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`${config.className} gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export function PopulationGovernance({ changeLog, isLoading }: PopulationGovernanceProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Access Control Notice */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-warning-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">
                Khu vực quản trị — Chỉ dành cho Admin & Data Owner
              </p>
              <p className="text-xs text-muted-foreground">
                Lịch sử thay đổi định nghĩa tập khách được ghi nhận để đảm bảo tính nhất quán 
                trong phân tích. Mọi thay đổi đều được version hóa.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{changeLog.length}</p>
                <p className="text-xs text-muted-foreground">Thay đổi ghi nhận</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {changeLog.filter(c => c.action === 'created').length}
                </p>
                <p className="text-xs text-muted-foreground">Tập khách tạo mới</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <FileEdit className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {changeLog.filter(c => c.action === 'updated').length}
                </p>
                <p className="text-xs text-muted-foreground">Lần cập nhật</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-warning-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {changeLog.filter(c => c.action === 'locked').length}
                </p>
                <p className="text-xs text-muted-foreground">Định nghĩa bị khóa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Lịch sử thay đổi
          </CardTitle>
          <CardDescription>
            Tất cả thay đổi định nghĩa tập khách được ghi nhận theo thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          {changeLog.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <History className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Chưa có lịch sử thay đổi</p>
              <p className="text-sm text-muted-foreground mt-1">
                Các thay đổi sẽ được ghi nhận khi định nghĩa tập khách được cập nhật
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[180px]">Thời gian</TableHead>
                    <TableHead className="w-[180px]">Tập khách</TableHead>
                    <TableHead className="w-[100px]">Hành động</TableHead>
                    <TableHead className="w-[120px]">Phiên bản</TableHead>
                    <TableHead>Mục đích</TableHead>
                    <TableHead className="w-[140px]">Người thực hiện</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.changedAt}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.populationName}
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={entry.action} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          v{entry.version}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.purpose}
                        {entry.changes && (
                          <span className="text-muted-foreground ml-1">
                            — {entry.changes}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{entry.changedBy}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
