import { useState } from 'react';
import { UserPlus, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';

interface AssignOwnerDropdownProps {
  alertId: string;
  currentOwnerId: string | null;
  onAssign: (alertId: string, ownerId: string | null) => void;
  isLoading?: boolean;
  compact?: boolean;
}

// Use tenant_users + profiles for proper auth user mapping
function useAssignableUsers() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['assignable-users', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: members, error: membersError } = await supabase
        .from('tenant_users')
        .select('user_id, role, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (membersError) throw membersError;
      const userIds = (members || []).map(m => m.user_id).filter(Boolean);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileById = new Map((profiles || []).map(p => [p.id, p]));

      return (members || []).map(m => {
        const p = profileById.get(m.user_id);
        return {
          id: m.user_id,
          name: (p?.full_name || 'User').trim(),
          avatar_url: p?.avatar_url || null,
          role: String(m.role || 'member'),
        };
      }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    },
    enabled: !!tenantId,
  });
}

export function AssignOwnerDropdown({ 
  alertId, 
  currentOwnerId, 
  onAssign,
  isLoading,
  compact = false
}: AssignOwnerDropdownProps) {
  const { data: users = [], isLoading: usersLoading } = useAssignableUsers();
  const [open, setOpen] = useState(false);

  const currentOwner = users.find(u => u.id === currentOwnerId);

  const handleAssign = (userId: string | null) => {
    onAssign(alertId, userId);
    setOpen(false);
  };

  // Compact mode: just show avatar or icon
  if (compact && currentOwner) {
    return (
      <div className="flex items-center gap-1.5">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px] bg-emerald-500/20 text-emerald-400">
            {currentOwner.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-emerald-400 truncate max-w-[60px]">
          {currentOwner.name.split(' ')[0]}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant={currentOwner ? "ghost" : "outline"}
          className={currentOwner 
            ? "h-7 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10" 
            : "h-7 px-2 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          }
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : currentOwner ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px] bg-emerald-500/20 text-emerald-400">
                  {currentOwner.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[60px] truncate">{currentOwner.name.split(' ')[0]}</span>
              <Check className="h-3 w-3" />
            </div>
          ) : (
            <>
              <UserPlus className="h-3 w-3 mr-1" />
              Giao việc
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50 bg-slate-900 border-slate-700">
        <DropdownMenuLabel className="text-xs text-slate-400">
          Chọn người phụ trách
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700/50" />
        
        {usersLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4 px-2">
            Chưa có thành viên trong tenant. Vui lòng mời thêm người vào team.
          </div>
        ) : (
          <>
            {users.map((user) => (
              <DropdownMenuItem 
                key={user.id}
                onClick={() => handleAssign(user.id)}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-800"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
                {user.id === currentOwnerId && (
                  <Badge className="h-5 text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Check className="h-2.5 w-2.5" />
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
            
            {currentOwnerId && (
              <>
                <DropdownMenuSeparator className="bg-slate-700/50" />
                <DropdownMenuItem 
                  onClick={() => handleAssign(null)}
                  className="flex items-center gap-2 cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                  <span>Hủy giao việc</span>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}