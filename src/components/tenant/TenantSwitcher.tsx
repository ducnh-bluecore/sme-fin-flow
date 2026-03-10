import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTenantContext } from '@/contexts/TenantContext';
import { useCreateTenant } from '@/hooks/useTenant';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const roleLabels: Record<string, string> = {
  owner: 'Chủ sở hữu',
  admin: 'Quản trị',
  member: 'Thành viên',
  viewer: 'Xem',
};

export function TenantSwitcher() {
  const [open, setOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  
  const { activeTenant, userTenants, switchTenant, isSwitching, isLoading } = useTenantContext();
  const createTenant = useCreateTenant();

  const handleCreate = async () => {
    if (!newTenantName.trim()) return;
    
    await createTenant.mutateAsync({ name: newTenantName });
    setNewTenantName('');
    setShowNewDialog(false);
  };

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[200px] justify-start" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Đang tải...
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Chọn công ty"
            className="w-[220px] justify-between"
            disabled={isSwitching}
          >
            {isSwitching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Avatar className="mr-2 h-5 w-5">
                <AvatarImage
                  src={activeTenant?.logo_url || undefined}
                  alt={activeTenant?.name}
                />
                <AvatarFallback className="text-xs">
                  {activeTenant?.name?.charAt(0) || 'T'}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="truncate flex-1 text-left">
              {activeTenant?.name || 'Chọn công ty'}
            </span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <Command>
            <CommandInput placeholder="Tìm công ty..." />
            <CommandList>
              <CommandEmpty>Không tìm thấy công ty.</CommandEmpty>
              <CommandGroup heading="Công ty của bạn">
                {userTenants.map((tenantUser) => (
                  <CommandItem
                    key={tenantUser.tenant.id}
                    onSelect={() => {
                      switchTenant(tenantUser.tenant.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={tenantUser.tenant.logo_url || undefined}
                        alt={tenantUser.tenant.name}
                      />
                      <AvatarFallback className="text-xs">
                        {tenantUser.tenant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1">
                      <span className="truncate">{tenantUser.tenant.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleLabels[tenantUser.role]}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        'h-4 w-4',
                        activeTenant?.id === tenantUser.tenant.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowNewDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo công ty mới
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tạo công ty mới
            </DialogTitle>
            <DialogDescription>
              Thêm công ty mới để quản lý tài chính riêng biệt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên công ty</Label>
              <Input
                id="name"
                placeholder="Công ty ABC"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTenantName.trim() || createTenant.isPending}
            >
              {createTenant.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Tạo công ty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
