import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Phone,
  UserPlus,
  Trash2,
  AlertTriangle,
  Bell,
  Info,
  Loader2,
  Users,
} from 'lucide-react';
import { useAlertRuleRecipients, useAvailableRecipients } from '@/hooks/useAlertRuleRecipients';

interface RuleRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleId: string;
  ruleName: string;
}

const roleLabels: Record<string, string> = {
  general: 'Tất cả',
  manager: 'Quản lý',
  store_manager: 'QL Cửa hàng',
  warehouse_manager: 'QL Kho',
  finance: 'Tài chính',
  operations: 'Vận hành',
  sales: 'Kinh doanh',
  customer_service: 'CSKH',
};

export function RuleRecipientsDialog({
  open,
  onOpenChange,
  ruleId,
  ruleName,
}: RuleRecipientsDialogProps) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  
  const {
    recipients,
    isLoading,
    addRecipient,
    removeRecipient,
    updateRecipientSettings,
  } = useAlertRuleRecipients(ruleId);

  const { data: availableRecipients = [] } = useAvailableRecipients();

  // Filter out already added recipients
  const recipientsNotAdded = availableRecipients.filter(
    r => !recipients.some(ar => ar.recipient_id === r.id)
  );

  const handleAddRecipient = () => {
    if (!selectedRecipientId) return;
    addRecipient.mutate({
      ruleId,
      recipientId: selectedRecipientId,
    });
    setSelectedRecipientId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cấu hình người nhận
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{ruleName}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new recipient */}
          <div className="flex gap-2">
            <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Chọn người nhận..." />
              </SelectTrigger>
              <SelectContent>
                {recipientsNotAdded.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Không có người nhận khả dụng
                  </div>
                ) : (
                  recipientsNotAdded.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <span>{r.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {roleLabels[r.role] || r.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddRecipient} 
              disabled={!selectedRecipientId || addRecipient.isPending}
            >
              {addRecipient.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Current recipients */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Người nhận ({recipients.length})</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Critical
                  </span>
                  <span className="flex items-center gap-1">
                    <Bell className="h-3 w-3 text-amber-500" />
                    Warning
                  </span>
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3 text-blue-500" />
                    Info
                  </span>
                </div>
              </div>
            </div>

            <ScrollArea className="max-h-[300px]">
              {isLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chưa có người nhận nào</p>
                  <p className="text-xs mt-1">Thêm người nhận để nhận thông báo khi rule được kích hoạt</p>
                </div>
              ) : (
                <div className="divide-y">
                  {recipients.map(r => (
                    <div key={r.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.recipient?.name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {r.recipient?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {r.recipient.email}
                            </span>
                          )}
                          {r.recipient?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {r.recipient.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notification level checkboxes */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={r.notify_on_critical}
                          onCheckedChange={(checked) => 
                            updateRecipientSettings.mutate({
                              id: r.id,
                              notifyOnCritical: !!checked,
                            })
                          }
                          className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                        />
                        <Checkbox
                          checked={r.notify_on_warning}
                          onCheckedChange={(checked) => 
                            updateRecipientSettings.mutate({
                              id: r.id,
                              notifyOnWarning: !!checked,
                            })
                          }
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <Checkbox
                          checked={r.notify_on_info}
                          onCheckedChange={(checked) => 
                            updateRecipientSettings.mutate({
                              id: r.id,
                              notifyOnInfo: !!checked,
                            })
                          }
                          className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeRecipient.mutate(r.id)}
                        disabled={removeRecipient.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Tick các ô để chọn mức độ cảnh báo mà người nhận sẽ được thông báo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
