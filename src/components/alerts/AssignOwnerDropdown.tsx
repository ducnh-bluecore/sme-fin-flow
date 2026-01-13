import { useState } from 'react';
import { User, UserPlus, X, Loader2 } from 'lucide-react';
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
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface AssignOwnerDropdownProps {
  alertId: string;
  currentOwnerId: string | null;
  onAssign: (alertId: string, ownerId: string | null) => void;
  isLoading?: boolean;
}

export function AssignOwnerDropdown({ 
  alertId, 
  currentOwnerId, 
  onAssign,
  isLoading 
}: AssignOwnerDropdownProps) {
  const { data: teamMembers = [], isLoading: membersLoading } = useTeamMembers();
  const [open, setOpen] = useState(false);

  const currentOwner = teamMembers.find(m => m.id === currentOwnerId);

  const handleAssign = (memberId: string | null) => {
    onAssign(alertId, memberId);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 px-2 text-xs border-slate-700 text-slate-300 hover:bg-slate-700/50"
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
            </div>
          ) : (
            <>
              <UserPlus className="h-3 w-3 mr-1" />
              Giao việc
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
        <DropdownMenuLabel className="text-xs text-slate-400">
          Chọn người phụ trách
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700/50" />
        
        {membersLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">
            Chưa có thành viên nào
          </div>
        ) : (
          <>
            {teamMembers.map((member) => (
              <DropdownMenuItem 
                key={member.id}
                onClick={() => handleAssign(member.id)}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-800"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.role}</p>
                </div>
                {member.id === currentOwnerId && (
                  <Badge className="h-5 text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Hiện tại
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