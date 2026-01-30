import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Database, Loader2 } from 'lucide-react';
import { useProvisionTenantSchema } from '@/hooks/useTenantSchemaStatus';

interface ProvisionSchemaButtonProps {
  tenantId: string;
  tenantName: string;
  slug: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ProvisionSchemaButton({ 
  tenantId, 
  tenantName, 
  slug, 
  disabled,
  variant = 'outline',
  size = 'sm',
}: ProvisionSchemaButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const provisionMutation = useProvisionTenantSchema();

  const handleProvision = () => {
    provisionMutation.mutate({ tenantId, slug });
    setIsConfirmOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsConfirmOpen(true)}
        disabled={disabled || provisionMutation.isPending}
        className="gap-1.5"
      >
        {provisionMutation.isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang khởi tạo...</span>
          </>
        ) : (
          <>
            <Database className="w-3.5 h-3.5" />
            <span>Khởi tạo Schema</span>
          </>
        )}
      </Button>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khởi tạo Schema cho Tenant</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Bạn có chắc chắn muốn khởi tạo schema riêng cho tenant <strong>{tenantName}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                Thao tác này sẽ tạo schema <code className="bg-muted px-1 py-0.5 rounded">tenant_{slug}</code> với 
                tất cả các bảng và views cần thiết. Quá trình này có thể mất vài giây.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleProvision}>
              Xác nhận khởi tạo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
