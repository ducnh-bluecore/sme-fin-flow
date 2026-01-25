import { useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Layers, Calendar, Target } from 'lucide-react';
import { useCDPPopulations } from '@/hooks/useCDPPopulations';

export interface SelectedSegment {
  id: string;
  name: string;
  type: 'all' | 'tier' | 'segment' | 'cohort' | 'rfm';
}

interface SegmentSelectorProps {
  value: SelectedSegment;
  onChange: (segment: SelectedSegment) => void;
}

const RFM_SEGMENTS = [
  { id: 'rfm-champions', name: 'Champions', type: 'rfm' as const },
  { id: 'rfm-loyal', name: 'Loyal', type: 'rfm' as const },
  { id: 'rfm-potential', name: 'Potential Loyalist', type: 'rfm' as const },
  { id: 'rfm-at-risk', name: 'At Risk', type: 'rfm' as const },
  { id: 'rfm-hibernating', name: 'Hibernating', type: 'rfm' as const },
];

export function SegmentSelector({ value, onChange }: SegmentSelectorProps) {
  const { tierPopulations, segmentPopulations, cohortPopulations, isLoading } = useCDPPopulations();

  const handleValueChange = (val: string) => {
    if (val === 'all') {
      onChange({ id: 'all', name: 'Tất cả khách hàng', type: 'all' });
      return;
    }

    // Check RFM segments
    const rfmSegment = RFM_SEGMENTS.find(s => s.id === val);
    if (rfmSegment) {
      onChange({ id: rfmSegment.id, name: rfmSegment.name, type: 'rfm' });
      return;
    }

    // Check tier populations
    const tier = tierPopulations.find(p => p.id === val);
    if (tier) {
      onChange({ id: tier.id, name: tier.name, type: 'tier' });
      return;
    }

    // Check segment populations
    const segment = segmentPopulations.find(p => p.id === val);
    if (segment) {
      onChange({ id: segment.id, name: segment.name, type: 'segment' });
      return;
    }

    // Check cohort populations
    const cohort = cohortPopulations.find(p => p.id === val);
    if (cohort) {
      onChange({ id: cohort.id, name: cohort.name, type: 'cohort' });
      return;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tier': return <Layers className="h-3 w-3" />;
      case 'segment': return <Target className="h-3 w-3" />;
      case 'cohort': return <Calendar className="h-3 w-3" />;
      case 'rfm': return <Users className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Nhóm KH:</span>
      <Select value={value.id} onValueChange={handleValueChange} disabled={isLoading}>
        <SelectTrigger className="w-[220px] h-9 bg-background">
          <SelectValue placeholder="Chọn nhóm khách hàng">
            <div className="flex items-center gap-2">
              {getTypeIcon(value.type)}
              <span>{value.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          <SelectGroup>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>Tất cả khách hàng</span>
              </div>
            </SelectItem>
          </SelectGroup>

          {/* Value Tiers */}
          {tierPopulations.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">Theo Tier giá trị</SelectLabel>
              {tierPopulations.map(tier => (
                <SelectItem key={tier.id} value={tier.id}>
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3 text-violet-500" />
                    <span>{tier.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {tier.size.toLocaleString()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* RFM Segments */}
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Theo RFM Segment</SelectLabel>
            {RFM_SEGMENTS.map(rfm => (
              <SelectItem key={rfm.id} value={rfm.id}>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span>{rfm.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>

          {/* Custom Segments */}
          {segmentPopulations.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">Population tự tạo</SelectLabel>
              {segmentPopulations.map(seg => (
                <SelectItem key={seg.id} value={seg.id}>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-green-500" />
                    <span>{seg.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {seg.size.toLocaleString()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Cohorts */}
          {cohortPopulations.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">Theo Cohort</SelectLabel>
              {cohortPopulations.map(cohort => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-amber-500" />
                    <span>{cohort.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {cohort.size.toLocaleString()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
