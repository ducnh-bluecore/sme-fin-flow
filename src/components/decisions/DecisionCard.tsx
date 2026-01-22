import { ReactNode } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════
// DECISION CARD - Core UI Object for Bluecore
// Decision-first, not dashboard-first
// ═══════════════════════════════════════════════════════════════════

export type DecisionSeverity = 'critical' | 'warning' | 'info' | 'resolved';
export type DecisionConfidence = 'confirmed' | 'probable' | 'pending';
export type DecisionStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export interface DecisionImpact {
  type: 'cash' | 'margin' | 'compliance' | 'risk';
  label: string;
  value: string;
  trend?: 'negative' | 'positive' | 'neutral';
}

export interface DecisionEvidence {
  source: string;
  reference: string;
  timestamp: string;
  url?: string;
}

export interface DecisionAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'outline';
  onClick?: () => void;
}

export interface DecisionOwnership {
  assignee?: string;
  assignedAt?: string;
  status: DecisionStatus;
  deadline?: string;
}

export interface DecisionCardProps {
  id: string;
  /** Clear, executive-readable statement */
  statement: string;
  /** Optional context/description */
  context?: string;
  /** Severity level - determines visual treatment */
  severity: DecisionSeverity;
  /** Confidence level */
  confidence: DecisionConfidence;
  /** Impact summary - Cash/Margin/Compliance */
  impacts: DecisionImpact[];
  /** Evidence sources (read-only) */
  evidence?: DecisionEvidence[];
  /** Suggested actions */
  actions?: DecisionAction[];
  /** Status & Ownership */
  ownership?: DecisionOwnership;
  /** Additional content slot */
  children?: ReactNode;
  /** Card click handler */
  onClick?: () => void;
  /** Compact mode - less padding, smaller text */
  compact?: boolean;
  /** Show evidence panel expanded by default */
  expandedEvidence?: boolean;
}

// Severity Config
const severityConfig: Record<DecisionSeverity, { 
  borderColor: string; 
  badgeBg: string; 
  badgeText: string;
  icon: typeof AlertTriangle;
  iconColor: string;
}> = {
  critical: {
    borderColor: 'border-l-destructive',
    badgeBg: 'bg-destructive/10',
    badgeText: 'text-destructive',
    icon: AlertTriangle,
    iconColor: 'text-destructive',
  },
  warning: {
    borderColor: 'border-l-warning',
    badgeBg: 'bg-warning/10',
    badgeText: 'text-warning-foreground',
    icon: Clock,
    iconColor: 'text-warning',
  },
  info: {
    borderColor: 'border-l-info',
    badgeBg: 'bg-info/10',
    badgeText: 'text-info',
    icon: Clock,
    iconColor: 'text-info',
  },
  resolved: {
    borderColor: 'border-l-success',
    badgeBg: 'bg-success/10',
    badgeText: 'text-success',
    icon: CheckCircle2,
    iconColor: 'text-success',
  },
};

// Confidence Config
const confidenceConfig: Record<DecisionConfidence, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'text-success font-medium' },
  probable: { label: 'Probable', className: 'text-warning-foreground font-medium' },
  pending: { label: 'Pending', className: 'text-muted-foreground' },
};

// Status Config
const statusConfig: Record<DecisionStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-destructive/10 text-destructive' },
  in_progress: { label: 'In Progress', className: 'bg-warning/10 text-warning-foreground' },
  resolved: { label: 'Resolved', className: 'bg-success/10 text-success' },
  dismissed: { label: 'Dismissed', className: 'bg-muted text-muted-foreground' },
};

export function DecisionCard({
  statement,
  context,
  severity,
  confidence,
  impacts,
  evidence,
  actions,
  ownership,
  children,
  onClick,
  compact = false,
  expandedEvidence = false,
}: DecisionCardProps) {
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(expandedEvidence);
  const config = severityConfig[severity];
  const StatusIcon = config.icon;

  return (
    <Card 
      className={cn(
        'relative overflow-hidden transition-all duration-200 border-l-4',
        config.borderColor,
        onClick && 'cursor-pointer hover:shadow-elevated',
        compact ? 'p-3' : ''
      )}
      onClick={onClick}
    >
      <CardHeader className={cn('pb-3', compact && 'p-0 pb-2')}>
        {/* Top Row: Severity Icon + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg bg-muted', compact && 'p-1.5')}>
              <StatusIcon className={cn('h-5 w-5', config.iconColor, compact && 'h-4 w-4')} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Decision Statement */}
              <h3 className={cn(
                'font-semibold text-foreground leading-tight',
                compact ? 'text-sm' : 'text-base'
              )}>
                {statement}
              </h3>
              {/* Context */}
              {context && (
                <p className={cn(
                  'text-muted-foreground mt-1',
                  compact ? 'text-xs' : 'text-sm'
                )}>
                  {context}
                </p>
              )}
            </div>
          </div>

          {/* Confidence Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn('text-xs', confidenceConfig[confidence].className)}>
              {confidenceConfig[confidence].label}
            </span>
            {ownership && (
              <Badge className={cn('text-xs', statusConfig[ownership.status].className)}>
                {statusConfig[ownership.status].label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', compact && 'p-0')}>
        {/* Impact Summary */}
        {impacts.length > 0 && (
          <div className={cn(
            'grid gap-3 mb-4',
            impacts.length === 1 ? 'grid-cols-1' :
            impacts.length === 2 ? 'grid-cols-2' :
            impacts.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
          )}>
            {impacts.map((impact, index) => (
              <div 
                key={index} 
                className="bg-muted/50 rounded-md p-3"
              >
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {impact.label}
                </div>
                <div className={cn(
                  'text-lg font-semibold mt-0.5 tabular-nums',
                  impact.trend === 'negative' && 'text-destructive',
                  impact.trend === 'positive' && 'text-success',
                  impact.trend === 'neutral' && 'text-foreground',
                  !impact.trend && 'text-foreground'
                )}>
                  {impact.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ownership */}
        {ownership?.assignee && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Assigned to <span className="font-medium text-foreground">{ownership.assignee}</span></span>
            {ownership.deadline && (
              <>
                <span className="text-border">•</span>
                <Clock className="h-3.5 w-3.5" />
                <span>Due {ownership.deadline}</span>
              </>
            )}
          </div>
        )}

        {/* Evidence Panel (Collapsible) */}
        {evidence && evidence.length > 0 && (
          <div className="mb-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEvidenceExpanded(!isEvidenceExpanded);
              }}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {isEvidenceExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span className="uppercase tracking-wide">Evidence ({evidence.length})</span>
            </button>
            
            {isEvidenceExpanded && (
              <div className="mt-2 bg-muted/30 rounded-lg border border-border p-3 space-y-2">
                {evidence.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.source}</span>
                      <span className="text-foreground font-medium">{item.reference}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      {item.url && (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant === 'primary' ? 'default' : action.variant === 'secondary' ? 'secondary' : 'outline'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick?.();
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Additional Content */}
        {children}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DECISION CARD LIST - Container for multiple cards
// ═══════════════════════════════════════════════════════════════════

interface DecisionCardListProps {
  children: ReactNode;
  title?: string;
  description?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function DecisionCardList({
  children,
  title,
  description,
  emptyMessage = 'No decisions pending',
  isEmpty = false,
}: DecisionCardListProps) {
  return (
    <div className="space-y-4">
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      
      {isEmpty ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
          <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DECISION SUMMARY CARD - Compact variant for dashboards
// ═══════════════════════════════════════════════════════════════════

interface DecisionSummaryProps {
  statement: string;
  severity: DecisionSeverity;
  impactValue: string;
  impactLabel: string;
  onClick?: () => void;
}

export function DecisionSummaryCard({
  statement,
  severity,
  impactValue,
  impactLabel,
  onClick,
}: DecisionSummaryProps) {
  const config = severityConfig[severity];
  const StatusIcon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border border-l-4 bg-card transition-all duration-200',
        'hover:shadow-md hover:bg-accent/30',
        config.borderColor
      )}
    >
      <div className="flex items-center gap-3">
        <StatusIcon className={cn('h-4 w-4 flex-shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{statement}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-semibold text-foreground tabular-nums">{impactValue}</div>
          <div className="text-xs text-muted-foreground">{impactLabel}</div>
        </div>
      </div>
    </button>
  );
}
