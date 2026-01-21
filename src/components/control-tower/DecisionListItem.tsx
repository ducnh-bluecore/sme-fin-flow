import { 
  Clock, 
  User,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DecisionCard as DecisionCardType } from '@/hooks/useDecisionCards';
import { differenceInHours } from 'date-fns';

/**
 * DECISION LIST ITEM
 * 
 * Compact row for listing multiple decisions.
 * Still heavier than alerts - solid backgrounds, formal tone.
 * No animations.
 */

const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1e9) return `${(amount / 1e9).toFixed(1)} tỷ`;
  if (Math.abs(amount) >= 1e6) return `${(amount / 1e6).toFixed(0)}M`;
  return amount.toLocaleString('vi-VN');
};

interface DecisionListItemProps {
  card: DecisionCardType;
  onClick: () => void;
}

export function DecisionListItem({ card, onClick }: DecisionListItemProps) {
  const hoursUntilDeadline = Math.max(0, differenceInHours(new Date(card.deadline_at), new Date()));
  const isOverdue = hoursUntilDeadline === 0 && new Date(card.deadline_at) < new Date();
  const isCritical = hoursUntilDeadline < 4 || isOverdue;

  const recommendedAction = card.actions?.find(a => a.is_recommended);
  const actionType = recommendedAction?.action_type || 'INVESTIGATE';

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-slate-900 border-l-4 border-r border-t border-b",
        "px-5 py-4",
        "hover:bg-slate-800/80 transition-colors",
        isCritical ? "border-l-red-600 border-slate-700" : "border-l-slate-600 border-slate-800"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        
        {/* Left: Priority + Content */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          
          {/* Priority badge */}
          <div className={cn(
            "shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
            card.priority === 'P1' ? "bg-red-600 text-white" :
            card.priority === 'P2' ? "bg-amber-600 text-black" :
            "bg-slate-700 text-slate-300"
          )}>
            {card.priority}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-slate-100 truncate">
              {card.question || card.title}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {card.entity_label}
            </p>
          </div>
        </div>

        {/* Right: Impact + Time + Arrow */}
        <div className="flex items-center gap-6 shrink-0">
          
          {/* Impact */}
          <div className="text-right">
            <p className={cn(
              "text-sm font-bold tabular-nums",
              card.impact_amount < 0 ? "text-red-400" : "text-emerald-400"
            )}>
              ₫{formatCurrency(Math.abs(card.impact_amount))}
            </p>
            <p className="text-[10px] text-slate-500">
              {card.impact_amount < 0 ? 'thiệt hại' : 'tiềm năng'}
            </p>
          </div>
          
          {/* Time */}
          <div className="flex items-center gap-1.5 text-xs min-w-[80px]">
            <Clock className={cn("h-3.5 w-3.5", isCritical ? "text-red-400" : "text-slate-500")} />
            <span className={cn(isCritical ? "text-red-400 font-medium" : "text-slate-500")}>
              {isOverdue ? 'Quá hạn' : `${hoursUntilDeadline}h`}
            </span>
          </div>
          
          {/* Owner */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-[50px]">
            <User className="h-3.5 w-3.5" />
            <span>{card.owner_role}</span>
          </div>
          
          {/* Arrow */}
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </div>
      </div>
    </button>
  );
}
