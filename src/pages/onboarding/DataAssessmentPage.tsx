/**
 * DataAssessmentPage - Standalone page for Data Assessment Survey
 * 
 * Can be accessed directly or triggered by module guards
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DataAssessmentWizard } from '@/components/assessment';
import { useDataAssessment } from '@/hooks/useDataAssessment';
import { type ModuleKey, moduleDisplayInfo } from '@/lib/dataRequirementsMap';
import { Loader2 } from 'lucide-react';

const validModules: ModuleKey[] = ['fdp', 'mdp', 'cdp', 'control_tower'];

export default function DataAssessmentPage() {
  const { moduleKey: paramModule } = useParams<{ moduleKey: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [moduleKey, setModuleKey] = useState<ModuleKey | null>(null);
  
  // Validate module key
  useEffect(() => {
    const key = paramModule || searchParams.get('module');
    if (key && validModules.includes(key as ModuleKey)) {
      setModuleKey(key as ModuleKey);
    } else {
      // Default to FDP if no valid module specified
      setModuleKey('fdp');
    }
  }, [paramModule, searchParams]);

  const redirectParam = searchParams.get('redirect');

  const handleComplete = () => {
    if (redirectParam) {
      navigate(redirectParam);
    } else if (moduleKey) {
      // Navigate to module dashboard
      const moduleRoutes: Record<ModuleKey, string> = {
        fdp: '/fdp',
        mdp: '/mdp',
        cdp: '/cdp',
        control_tower: '/control-tower/command',
      };
      navigate(moduleRoutes[moduleKey]);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!moduleKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DataAssessmentWizard
      moduleKey={moduleKey}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
