import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantContext } from '@/contexts/TenantContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * TenantSwitcher - Display-only tenant badge
 * 
 * Users are auto-assigned to their tenant. No manual switching allowed.
 * Super admins can switch tenants only from the Admin panel.
 */
export function TenantSwitcher() {
  const { activeTenant, isLoading } = useTenantContext();

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[200px] justify-start" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Đang tải...
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background text-sm">
      <Avatar className="h-5 w-5">
        <AvatarImage
          src={activeTenant?.logo_url || undefined}
          alt={activeTenant?.name}
        />
        <AvatarFallback className="text-xs">
          {activeTenant?.name?.charAt(0) || 'T'}
        </AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[160px] font-medium">
        {activeTenant?.name || 'Không có công ty'}
      </span>
    </div>
  );
}
